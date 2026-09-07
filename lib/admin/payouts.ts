import 'server-only';
import { AggregateField } from 'firebase-admin/firestore';
import { db } from '@/firebase/admin';
import { HttpError, serialize } from '@/lib/security';
import type { Campaign } from '@/types';
import type { Payout, PayoutStatus } from '@/types/admin';
import type { AuthenticatedUser } from './auth';
import { recordAuditIn } from './audit';
import { PAGE_SIZE, readPage } from './query';
import { getPlatformSettings } from './content';
import type { PayoutAction } from './schemas';

const COLLECTION = 'payouts';

/** Statuses that reserve funds against a campaign's available balance. */
const COMMITTED: PayoutStatus[] = ['approved', 'processing', 'paid'];
/** Statuses that are still open and therefore also reserve funds. */
const RESERVED: PayoutStatus[] = ['requested', 'under_review', ...COMMITTED];

const ALLOWED_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  requested: ['under_review', 'approved', 'rejected', 'cancelled'],
  under_review: ['approved', 'rejected', 'cancelled'],
  approved: ['processing', 'rejected', 'cancelled'],
  processing: ['paid', 'cancelled'],
  paid: [],
  rejected: [],
  cancelled: [],
};

const ACTION_STATUS: Record<Exclude<PayoutAction['action'], 'notes'>, PayoutStatus> = {
  under_review: 'under_review',
  approve: 'approved',
  reject: 'rejected',
  processing: 'processing',
  paid: 'paid',
  cancel: 'cancelled',
};

export interface PayoutFilters {
  q?: string;
  status?: string;
  currency?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export async function listPayouts(filters: PayoutFilters = {}) {
  let query = db().collection(COLLECTION) as FirebaseFirestore.Query;
  if (filters.status) query = query.where('status', '==', filters.status);
  if (filters.currency) query = query.where('currency', '==', filters.currency);
  if (filters.from) query = query.where('requestedAt', '>=', `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.where('requestedAt', '<=', `${filters.to}T23:59:59.999Z`);
  query = query.orderBy('requestedAt', 'desc');
  const page = await readPage<Payout>(query, {
    collection: COLLECTION,
    cursor: filters.cursor,
    limit: filters.limit ?? PAGE_SIZE,
  });
  const needle = filters.q?.trim().toLowerCase();
  const rows = needle
    ? page.rows.filter((row) =>
        `${row.organizerName} ${row.organizerEmail} ${row.campaignTitle} ${row.id}`
          .toLowerCase()
          .includes(needle),
      )
    : page.rows;
  return { ...page, rows: serialize(rows) };
}

export interface PayoutBalance {
  raised: number;
  refunded: number;
  platformFees: number;
  previouslyCommitted: number;
  otherPending: number;
  available: number;
  currency: string;
  donationCount: number;
}

/**
 * Available payout balance for a campaign, computed from Firestore aggregate
 * queries rather than by reading the donation ledger row by row.
 *
 * `excludePayoutId` leaves the payout being reviewed out of the reserved total
 * so an approver sees the balance the request is actually drawing against.
 */
export async function campaignBalance(
  campaignId: string,
  excludePayoutId?: string,
): Promise<PayoutBalance> {
  const [campaignSnap, settings] = await Promise.all([
    db().collection('campaigns').doc(campaignId).get(),
    getPlatformSettings(),
  ]);
  const campaign = campaignSnap.data() as Campaign | undefined;
  if (!campaign) throw new HttpError(404, 'Campaign not found.');
  const donations = db().collection('donations').where('campaignId', '==', campaignId);
  const [refundAgg, payoutSnap] = await Promise.all([
    donations
      .where('paymentStatus', 'in', ['refunded', 'disputed'])
      .aggregate({ total: AggregateField.sum('amount') })
      .get(),
    db()
      .collection(COLLECTION)
      .where('campaignId', '==', campaignId)
      .where('status', 'in', RESERVED)
      .get(),
  ]);
  const refunded = Number(refundAgg.data().total || 0);
  let previouslyCommitted = 0;
  let otherPending = 0;
  for (const doc of payoutSnap.docs) {
    if (doc.id === excludePayoutId) continue;
    const data = doc.data() as Payout;
    if (COMMITTED.includes(data.status)) previouslyCommitted += Number(data.amount || 0);
    else otherPending += Number(data.amount || 0);
  }
  const raised = Number(campaign.amountRaised || 0);
  const donationCount = Number(campaign.donorCount || 0);
  const platformFees =
    ((raised - refunded) * settings.fees.percentage) / 100 + settings.fees.fixed * donationCount;
  const available =
    Math.round((raised - refunded - platformFees - previouslyCommitted - otherPending) * 100) / 100;
  return {
    raised,
    refunded,
    platformFees: Math.round(platformFees * 100) / 100,
    previouslyCommitted,
    otherPending,
    available: Math.max(0, available),
    currency: campaign.currency || 'USD',
    donationCount,
  };
}

export async function getPayoutDetail(id: string) {
  const snap = await db().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const payout = { ...(snap.data() as Payout), id: snap.id };
  const [balance, previous, organizer] = await Promise.all([
    campaignBalance(payout.campaignId, payout.id),
    db()
      .collection(COLLECTION)
      .where('campaignId', '==', payout.campaignId)
      .orderBy('requestedAt', 'desc')
      .limit(10)
      .get(),
    db().collection('users').doc(payout.organizerId).get(),
  ]);
  return serialize({
    payout,
    balance,
    previous: previous.docs
      .filter((doc) => doc.id !== payout.id)
      .map((doc) => ({ ...(doc.data() as Payout), id: doc.id })),
    organizer: organizer.exists ? { ...organizer.data(), uid: organizer.id } : null,
  });
}

/**
 * Moves a payout to its next state.
 *
 * Every guard runs inside the transaction: the transition must be legal for the
 * current status (which blocks double processing and replayed submissions), and
 * an approval re-checks the campaign's available balance so a payout can never
 * exceed the funds actually held for that campaign.
 */
export async function transitionPayout(actor: AuthenticatedUser, input: PayoutAction) {
  const ref = db().collection(COLLECTION).doc(input.id);
  const now = new Date().toISOString();

  if (input.action === 'notes') {
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpError(404, 'Payout not found.');
      tx.update(ref, { adminNotes: input.note, updatedAt: now });
      recordAuditIn(tx, actor, {
        action: 'payout.notes',
        targetType: 'payout',
        targetId: input.id,
        description: `Updated payout notes for ${input.id}`,
        metadata: {},
      });
    });
    return;
  }

  const next = ACTION_STATUS[input.action];
  // Reads that the transaction depends on must happen before it opens a write.
  const current = await ref.get();
  const existing = current.data() as Payout | undefined;
  if (!existing) throw new HttpError(404, 'Payout not found.');
  const balance = next === 'approved' ? await campaignBalance(existing.campaignId, input.id) : null;

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const payout = snap.data() as Payout | undefined;
    if (!payout) throw new HttpError(404, 'Payout not found.');
    if (payout.status === next) throw new HttpError(409, `This payout is already ${next}.`);
    if (!ALLOWED_TRANSITIONS[payout.status].includes(next))
      throw new HttpError(
        409,
        `A ${payout.status.replace('_', ' ')} payout cannot move to ${next.replace('_', ' ')}.`,
      );
    if (next === 'approved' && balance && payout.amount > balance.available)
      throw new HttpError(
        400,
        `This request exceeds the available balance of ${balance.currency} ${balance.available.toFixed(2)}.`,
      );
    const event = {
      status: next,
      note: input.note || '',
      adminId: actor.uid,
      adminEmail: actor.email,
      createdAt: now,
    };
    tx.update(ref, {
      status: next,
      adminNotes: input.note || payout.adminNotes || '',
      history: [...(payout.history || []), event],
      processedBy: actor.uid,
      updatedAt: now,
      ...(next === 'paid'
        ? { paidAt: now, providerReference: input.action === 'paid' ? input.providerReference : '' }
        : {}),
    });
    tx.create(db().collection('notifications').doc(), {
      userId: payout.organizerId,
      campaignId: payout.campaignId,
      title: `Payout ${next.replace('_', ' ')}`,
      message: input.note
        ? `${payout.campaignTitle} — ${input.note}`
        : `${payout.currency} ${payout.amount} for ${payout.campaignTitle}`,
      read: false,
      createdAt: now,
    });
    recordAuditIn(tx, actor, {
      action: `payout.${next}`,
      targetType: 'payout',
      targetId: input.id,
      description: `Payout ${input.id} moved to ${next}`,
      metadata: {
        reason: input.note || '',
        previousStatus: payout.status,
        amount: payout.amount,
        currency: payout.currency,
        campaignId: payout.campaignId,
        organizerId: payout.organizerId,
        ...(input.action === 'paid' ? { providerReference: input.providerReference } : {}),
      },
    });
  });
}

/** Totals for the overview KPI cards, from aggregate queries only. */
export async function payoutTotals() {
  const collection = db().collection(COLLECTION);
  const [awaiting, paid] = await Promise.all([
    collection
      .where('status', 'in', ['requested', 'under_review', 'approved', 'processing'])
      .aggregate({ total: AggregateField.sum('amount'), count: AggregateField.count() })
      .get(),
    collection
      .where('status', '==', 'paid')
      .aggregate({ total: AggregateField.sum('amount'), count: AggregateField.count() })
      .get(),
  ]);
  return {
    awaitingAmount: Number(awaiting.data().total || 0),
    awaitingCount: Number(awaiting.data().count || 0),
    paidAmount: Number(paid.data().total || 0),
    paidCount: Number(paid.data().count || 0),
  };
}
