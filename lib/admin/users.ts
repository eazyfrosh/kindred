import 'server-only';
import { adminAuth, db } from '@/firebase/admin';
import { HttpError, serialize } from '@/lib/security';
import { tokens } from '@/lib/brand';
import type { Campaign, Donation, UserProfile } from '@/types';
import type { AdminUser } from '@/types/admin';
import type { AuthenticatedUser } from './auth';
import { recordAudit } from './audit';
import { PAGE_SIZE, countOf, readPage } from './query';
import type { UserAction } from './schemas';

const COLLECTION = 'users';

export interface UserFilters {
  q?: string;
  role?: string;
  verified?: string;
  status?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface AdminUserRow extends AdminUser {
  totalDonated: number;
  donationCount: number;
  campaignCount: number;
}

export async function listUsers(filters: UserFilters = {}) {
  let query = db().collection(COLLECTION) as FirebaseFirestore.Query;
  if (filters.role) query = query.where('role', '==', filters.role);
  if (filters.verified) query = query.where('verified', '==', filters.verified === 'true');
  if (filters.status) query = query.where('disabled', '==', filters.status === 'suspended');
  const keyword = tokens(filters.q || '')[0];
  if (keyword) query = query.where('searchTokens', 'array-contains', keyword);
  if (filters.from) query = query.where('createdAt', '>=', `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.where('createdAt', '<=', `${filters.to}T23:59:59.999Z`);
  query = query.orderBy('createdAt', 'desc');
  const page = await readPage<UserProfile & { id: string }>(query, {
    collection: COLLECTION,
    cursor: filters.cursor,
    limit: filters.limit ?? PAGE_SIZE,
  });
  let docs = page.rows;
  let nextCursor = page.nextCursor;
  // A direct-id lookup keeps "search by UID" working without a second index.
  if (docs.length === 0 && filters.q && !filters.cursor) {
    const byId = await db().collection(COLLECTION).doc(filters.q.trim()).get();
    if (byId.exists) {
      docs = [{ ...(byId.data() as UserProfile), id: byId.id }];
      nextCursor = null;
    }
  }
  const stats = await loadUserStats(docs.map((row) => row.id));
  const rows: AdminUserRow[] = docs.map((row) => ({
    ...(row as unknown as AdminUser),
    uid: row.id,
    ...stats[row.id],
  }));
  return { rows: serialize(rows), nextCursor, hasMore: nextCursor !== null };
}

interface UserTotals {
  totalDonated: number;
  donationCount: number;
  campaignCount: number;
}

/** Reads pre-aggregated per-user totals rather than scanning the donation ledger. */
async function loadUserStats(uids: string[]): Promise<Record<string, UserTotals>> {
  const result: Record<string, UserTotals> = {};
  if (uids.length === 0) return result;
  const snaps = await db().getAll(...uids.map((uid) => db().collection('_userStats').doc(uid)));
  snaps.forEach((snap, index) => {
    const data = snap.data() || {};
    const totalDonated = Object.entries(data)
      .filter(([key]) => key.startsWith('total'))
      .reduce((sum, [, value]) => sum + Number(value || 0), 0);
    result[uids[index]] = {
      totalDonated,
      donationCount: Number(data.donationCount || 0),
      campaignCount: Number(data.campaignCount || 0),
    };
  });
  return result;
}

export interface UserDetail {
  user: AdminUserRow;
  campaigns: (Campaign & { id: string })[];
  donations: (Donation & { id: string })[];
  auth: {
    emailVerified: boolean;
    disabled: boolean;
    lastSignInTime: string;
    creationTime: string;
    providers: string[];
    hasAdminClaim: boolean;
  } | null;
}

export async function getUserDetail(uid: string): Promise<UserDetail | null> {
  const snap = await db().collection(COLLECTION).doc(uid).get();
  if (!snap.exists) return null;
  const [campaigns, donations, stats, authRecord] = await Promise.all([
    db()
      .collection('campaigns')
      .where('organizerId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
    db()
      .collection('donations')
      .where('donorId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
    loadUserStats([uid]),
    adminAuth()
      .getUser(uid)
      .catch(() => null),
  ]);
  return serialize<UserDetail>({
    user: { ...(snap.data() as unknown as AdminUser), uid: snap.id, ...stats[uid] },
    campaigns: campaigns.docs.map((d) => ({ ...(d.data() as Campaign), id: d.id })),
    donations: donations.docs.map((d) => ({ ...(d.data() as Donation), id: d.id })),
    auth: authRecord
      ? {
          emailVerified: authRecord.emailVerified,
          disabled: authRecord.disabled,
          lastSignInTime: authRecord.metadata.lastSignInTime || '',
          creationTime: authRecord.metadata.creationTime || '',
          providers: authRecord.providerData.map((p) => p.providerId),
          hasAdminClaim: authRecord.customClaims?.admin === true,
        }
      : null,
  });
}

export async function fundraiserSummary(
  filters: { q?: string; verified?: string; cursor?: string } = {},
) {
  const page = await listUsers({ ...filters, role: 'fundraiser' });
  const uids = page.rows.map((row) => row.uid);
  const campaignCounts = await Promise.all(
    uids.map(async (uid) => ({
      uid,
      active: await countOf(
        db()
          .collection('campaigns')
          .where('organizerId', '==', uid)
          .where('status', '==', 'approved'),
      ),
    })),
  );
  const byUid = Object.fromEntries(campaignCounts.map((c) => [c.uid, c.active]));
  return {
    ...page,
    rows: page.rows.map((row) => ({ ...row, activeCampaigns: byUid[row.uid] ?? 0 })),
  };
}

/** Lifetime amount raised across an organizer's campaigns, from campaign aggregates. */
export async function organizerTotals(uid: string) {
  const snap = await db().collection('campaigns').where('organizerId', '==', uid).get();
  return snap.docs.reduce(
    (totals, doc) => {
      const data = doc.data();
      return {
        raised: totals.raised + Number(data.amountRaised || 0),
        donors: totals.donors + Number(data.donorCount || 0),
        campaigns: totals.campaigns + 1,
      };
    },
    { raised: 0, donors: 0, campaigns: 0 },
  );
}

const USER_DESCRIPTIONS: Record<UserAction['action'], string> = {
  role: 'Changed user role',
  verifyFundraiser: 'Verified fundraiser',
  revokeFundraiser: 'Revoked fundraiser verification',
  suspend: 'Suspended platform access',
  reactivate: 'Reactivated platform access',
  notes: 'Updated internal notes',
};

/**
 * Applies an account decision. Role changes are written to Firebase custom
 * claims *and* the Firestore record, then refresh tokens are revoked so the
 * change takes effect on the next request rather than at token expiry.
 *
 * Authentication passwords are never touched from the admin dashboard.
 */
export async function administerUser(actor: AuthenticatedUser, input: UserAction) {
  if (input.uid === actor.uid && input.action !== 'notes')
    throw new HttpError(400, 'Ask another administrator to change your own access.');
  const ref = db().collection(COLLECTION).doc(input.uid);
  const snap = await ref.get();
  const profile = snap.data() as UserProfile | undefined;
  if (!profile) throw new HttpError(404, 'User not found.');
  const now = new Date().toISOString();
  const reason = 'reason' in input ? input.reason : '';

  if (input.action === 'role') {
    if (profile.role === input.role)
      throw new HttpError(400, `This account is already a ${input.role}.`);
    await adminAuth().setCustomUserClaims(input.uid, {
      role: input.role,
      admin: input.role === 'admin',
    });
    await ref.update({ role: input.role, updatedAt: now });
    await adminAuth().revokeRefreshTokens(input.uid);
  } else if (input.action === 'verifyFundraiser') {
    await ref.update({ fundraiserVerified: true, fundraiserVerifiedAt: now, updatedAt: now });
  } else if (input.action === 'revokeFundraiser') {
    await ref.update({ fundraiserVerified: false, moderationReason: reason, updatedAt: now });
  } else if (input.action === 'suspend') {
    await ref.update({ disabled: true, moderationReason: reason, updatedAt: now });
    await adminAuth().updateUser(input.uid, { disabled: true });
    await adminAuth().revokeRefreshTokens(input.uid);
  } else if (input.action === 'reactivate') {
    await adminAuth().updateUser(input.uid, { disabled: false });
    await ref.update({ disabled: false, updatedAt: now });
  } else {
    await ref.update({ adminNotes: input.notes, updatedAt: now });
  }

  await recordAudit(actor, {
    action: `user.${input.action}`,
    targetType: 'user',
    targetId: input.uid,
    description: `${USER_DESCRIPTIONS[input.action]} for ${profile.email}`,
    metadata: {
      reason,
      previousRole: profile.role,
      ...(input.action === 'role' ? { newRole: input.role } : {}),
    },
  });
}
