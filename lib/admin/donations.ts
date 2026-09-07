import 'server-only';
import { db } from '@/firebase/admin';
import { HttpError, serialize } from '@/lib/security';
import type { Campaign, Donation, UserProfile } from '@/types';
import type { AuthenticatedUser } from './auth';
import { recordAuditIn } from './audit';
import { PAGE_SIZE, readPage } from './query';

const COLLECTION = 'donations';

export interface DonationFilters {
  q?: string;
  status?: string;
  provider?: string;
  campaignId?: string;
  currency?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export async function listDonations(filters: DonationFilters = {}) {
  let query = db().collection(COLLECTION) as FirebaseFirestore.Query;
  if (filters.status) query = query.where('paymentStatus', '==', filters.status);
  if (filters.provider) query = query.where('paymentProvider', '==', filters.provider);
  if (filters.campaignId) query = query.where('campaignId', '==', filters.campaignId);
  if (filters.currency) query = query.where('currency', '==', filters.currency);
  if (filters.from) query = query.where('createdAt', '>=', `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.where('createdAt', '<=', `${filters.to}T23:59:59.999Z`);
  query = query.orderBy('createdAt', 'desc');
  const page = await readPage<Donation>(query, {
    collection: COLLECTION,
    cursor: filters.cursor,
    limit: filters.limit ?? PAGE_SIZE,
  });
  const needle = filters.q?.trim().toLowerCase();
  let rows = page.rows;
  if (needle) {
    // Reference lookups resolve directly; other terms filter the current page.
    const direct = await db().collection(COLLECTION).doc(filters.q!.trim()).get();
    rows = direct.exists
      ? [{ ...(direct.data() as Donation), id: direct.id }]
      : rows.filter((row) =>
          `${row.donorName} ${row.donorEmail} ${row.campaignTitle} ${row.paymentReference} ${row.providerTransactionId ?? ''}`
            .toLowerCase()
            .includes(needle),
        );
  }
  return { ...page, rows: serialize(rows) };
}

export interface DonationDetail {
  donation: Donation;
  campaign: (Campaign & { id: string }) | null;
  donor: (UserProfile & { uid: string }) | null;
}

export async function getDonationDetail(id: string): Promise<DonationDetail | null> {
  const snap = await db().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const donation = { ...(snap.data() as Donation), id: snap.id };
  const [campaign, donor] = await Promise.all([
    db().collection('campaigns').doc(donation.campaignId).get(),
    donation.donorId ? db().collection('users').doc(donation.donorId).get() : Promise.resolve(null),
  ]);
  return serialize<DonationDetail>({
    donation,
    campaign: campaign.exists ? ({ ...campaign.data(), id: campaign.id } as Campaign) : null,
    donor: donor?.exists ? ({ ...donor.data(), uid: donor.id } as UserProfile) : null,
  });
}

/**
 * The only manual donation state change available to administrators.
 *
 * A successful payment is never produced here — that state comes exclusively
 * from a signature-verified provider webhook. This function exists so that a
 * refund, chargeback, or abandoned intent that the provider reported out of
 * band can be reflected in the ledger, and every use is written to the audit
 * log with the acting administrator and their reason.
 */
export async function adjustDonationStatus(
  actor: AuthenticatedUser,
  input: { id: string; status: 'failed' | 'refunded' | 'disputed'; reason: string },
) {
  const ref = db().collection(COLLECTION).doc(input.id);
  const now = new Date().toISOString();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const donation = snap.data() as Donation | undefined;
    if (!donation) throw new HttpError(404, 'Donation not found.');
    if (donation.paymentStatus === input.status)
      throw new HttpError(400, `This donation is already ${input.status}.`);
    if (input.status === 'failed' && donation.paymentStatus !== 'pending')
      throw new HttpError(
        400,
        'Only a pending intent can be marked failed. Confirmed payments must be refunded or disputed.',
      );
    if (input.status !== 'failed' && donation.paymentStatus !== 'successful')
      throw new HttpError(400, 'Only a settled payment can be refunded or disputed.');
    tx.update(ref, {
      paymentStatus: input.status,
      adjustedBy: actor.uid,
      adjustmentReason: input.reason,
      adjustedAt: now,
    });
    recordAuditIn(tx, actor, {
      action: `donation.${input.status}`,
      targetType: 'donation',
      targetId: input.id,
      description: `Manually set donation ${input.id} to ${input.status}`,
      metadata: {
        reason: input.reason,
        previousStatus: donation.paymentStatus,
        amount: donation.amount,
        currency: donation.currency,
        campaignId: donation.campaignId,
      },
    });
  });
}
