import 'server-only';
import { db } from '@/firebase/admin';
import { HttpError, serialize } from '@/lib/security';
import { tokens } from '@/lib/brand';
import type { Campaign, CampaignStatus, Donation, UserProfile } from '@/types';
import type { CampaignComment, CampaignUpdateEntry } from '@/types/admin';
import type { AuthenticatedUser } from './auth';
import { recordAuditIn } from './audit';
import { PAGE_SIZE, readPage } from './query';
import type { CampaignAction } from './schemas';

const COLLECTION = 'campaigns';

export interface CampaignFilters {
  q?: string;
  status?: string;
  category?: string;
  verified?: string;
  featured?: string;
  from?: string;
  to?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
}

export async function listCampaigns(filters: CampaignFilters = {}) {
  let query = db().collection(COLLECTION) as FirebaseFirestore.Query;
  if (filters.status) query = query.where('status', '==', filters.status);
  if (filters.category) query = query.where('category', '==', filters.category);
  if (filters.verified) query = query.where('verified', '==', filters.verified === 'true');
  if (filters.featured) query = query.where('featured', '==', filters.featured === 'true');
  const keyword = tokens(filters.q || '')[0];
  if (keyword) query = query.where('searchTokens', 'array-contains', keyword);
  if (filters.from) query = query.where('createdAt', '>=', `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.where('createdAt', '<=', `${filters.to}T23:59:59.999Z`);
  const sortField =
    filters.sort === 'raised'
      ? 'amountRaised'
      : filters.sort === 'goal'
        ? 'goalAmount'
        : 'createdAt';
  query = query.orderBy(sortField, 'desc');
  const page = await readPage<Campaign>(query, {
    collection: COLLECTION,
    cursor: filters.cursor,
    limit: filters.limit ?? PAGE_SIZE,
  });
  return { ...page, rows: serialize(page.rows) };
}

export async function getCampaignById(id: string) {
  const snap = await db().collection(COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  return serialize({ ...(snap.data() as Campaign), id: snap.id });
}

export interface CampaignDetail {
  campaign: Campaign;
  organizer: (UserProfile & { uid: string }) | null;
  donations: Donation[];
  updates: CampaignUpdateEntry[];
  comments: CampaignComment[];
}

/** Everything the campaign detail page renders, fetched in parallel. */
export async function getCampaignDetail(id: string): Promise<CampaignDetail | null> {
  const campaign = await getCampaignById(id);
  if (!campaign) return null;
  const [organizerSnap, donationsSnap, updatesSnap, commentsSnap] = await Promise.all([
    db().collection('users').doc(campaign.organizerId).get(),
    db()
      .collection('donations')
      .where('campaignId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
    db()
      .collection('campaignUpdates')
      .where('campaignId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
    db()
      .collection('comments')
      .where('campaignId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get(),
  ]);
  return serialize<CampaignDetail>({
    campaign,
    organizer: organizerSnap.exists
      ? ({ ...organizerSnap.data(), uid: organizerSnap.id } as UserProfile & { uid: string })
      : null,
    donations: donationsSnap.docs.map((d) => ({ ...(d.data() as Donation), id: d.id })),
    updates: updatesSnap.docs.map((d) => ({ ...(d.data() as CampaignUpdateEntry), id: d.id })),
    comments: commentsSnap.docs.map((d) => ({ ...(d.data() as CampaignComment), id: d.id })),
  });
}

const TRANSITIONS: Record<string, CampaignStatus> = {
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
  unsuspend: 'approved',
  complete: 'completed',
};

const DESCRIPTIONS: Record<CampaignAction['action'], string> = {
  approve: 'Approved campaign',
  reject: 'Rejected campaign',
  suspend: 'Suspended campaign',
  unsuspend: 'Reinstated campaign',
  complete: 'Marked campaign completed',
  verify: 'Verified campaign',
  unverify: 'Removed campaign verification',
  feature: 'Featured campaign',
  unfeature: 'Removed campaign from featured',
  delete: 'Deleted campaign',
};

/**
 * Applies a moderation decision inside a transaction so the campaign document,
 * the organizer notification, and the audit entry either all land or none do.
 */
export async function moderateCampaign(actor: AuthenticatedUser, input: CampaignAction) {
  const ref = db().collection(COLLECTION).doc(input.id);
  const now = new Date().toISOString();
  const reason = 'reason' in input ? input.reason : '';
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const campaign = snap.data() as Campaign | undefined;
    if (!campaign) throw new HttpError(404, 'Campaign not found.');

    if (input.action === 'delete') {
      if (campaign.amountRaised > 0 || campaign.donorCount > 0)
        throw new HttpError(
          400,
          'Funded campaigns keep their financial record. Suspend or complete this campaign instead.',
        );
      const donations = await tx.get(
        db().collection('donations').where('campaignId', '==', input.id).limit(1),
      );
      if (!donations.empty)
        throw new HttpError(400, 'Campaigns with payment records cannot be deleted.');
      tx.delete(ref);
    } else if (input.action === 'feature' || input.action === 'unfeature') {
      if (input.action === 'feature' && campaign.status !== 'approved')
        throw new HttpError(400, 'Only approved campaigns can be featured.');
      tx.update(ref, { featured: input.action === 'feature', updatedAt: now });
    } else if (input.action === 'verify' || input.action === 'unverify') {
      tx.update(ref, {
        verified: input.action === 'verify',
        ...(reason ? { moderationReason: reason } : {}),
        moderatedBy: actor.uid,
        updatedAt: now,
      });
    } else {
      const status = TRANSITIONS[input.action];
      if (campaign.status === status)
        throw new HttpError(400, `This campaign is already ${status}.`);
      if (input.action === 'unsuspend' && campaign.status !== 'suspended')
        throw new HttpError(400, 'Only suspended campaigns can be reinstated.');
      tx.update(ref, {
        status,
        verified: input.action === 'approve' ? true : campaign.verified,
        featured: status === 'approved' ? campaign.featured : false,
        moderationReason: reason,
        moderatedBy: actor.uid,
        moderatedAt: now,
        updatedAt: now,
      });
      tx.create(db().collection('notifications').doc(), {
        userId: campaign.organizerId,
        campaignId: input.id,
        title: `Campaign ${status}`,
        message: reason ? `${campaign.title} — ${reason}` : campaign.title,
        read: false,
        createdAt: now,
      });
    }

    recordAuditIn(tx, actor, {
      action: `campaign.${input.action}`,
      targetType: 'campaign',
      targetId: input.id,
      description: `${DESCRIPTIONS[input.action]} “${campaign.title}”`,
      metadata: {
        reason,
        previousStatus: campaign.status,
        organizerId: campaign.organizerId,
      },
    });
  });
}

export async function updateCampaignDetails(
  actor: AuthenticatedUser,
  input: {
    id: string;
    title: string;
    category: string;
    shortDescription: string;
    description: string;
    location: string;
    goalAmount: number;
    endDate: string;
  },
) {
  const ref = db().collection(COLLECTION).doc(input.id);
  const now = new Date().toISOString();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const campaign = snap.data() as Campaign | undefined;
    if (!campaign) throw new HttpError(404, 'Campaign not found.');
    tx.update(ref, {
      title: input.title,
      category: input.category,
      shortDescription: input.shortDescription,
      description: input.description,
      location: input.location,
      goalAmount: input.goalAmount,
      endDate: input.endDate,
      fundingRatio: input.goalAmount > 0 ? campaign.amountRaised / input.goalAmount : 0,
      searchTokens: tokens(`${input.title} ${input.category} ${campaign.organizerName}`),
      updatedAt: now,
    });
    recordAuditIn(tx, actor, {
      action: 'campaign.update',
      targetType: 'campaign',
      targetId: input.id,
      description: `Edited campaign “${input.title}”`,
      metadata: { previousTitle: campaign.title, previousGoal: campaign.goalAmount },
    });
  });
}
