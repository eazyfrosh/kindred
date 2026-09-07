import 'server-only';
import { db } from '@/firebase/admin';
import { serialize } from '@/lib/security';
import { tokens } from '@/lib/brand';
import type { Campaign, Donation, UserProfile } from '@/types';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface GroupedResults {
  campaigns: SearchResult[];
  users: SearchResult[];
  donations: SearchResult[];
}

const EMPTY: GroupedResults = { campaigns: [], users: [], donations: [] };

/**
 * Global admin search across campaigns, users, and donations.
 *
 * Campaigns and users use their indexed `searchTokens` array. Donations are
 * matched by exact reference so the query stays a single document read rather
 * than a scan of the ledger.
 */
export async function globalSearch(term: string): Promise<GroupedResults> {
  const trimmed = term.trim();
  const keyword = tokens(trimmed)[0];
  if (!trimmed || !keyword) return EMPTY;
  const [campaigns, users, donation] = await Promise.all([
    db()
      .collection('campaigns')
      .where('searchTokens', 'array-contains', keyword)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get(),
    db()
      .collection('users')
      .where('searchTokens', 'array-contains', keyword)
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get(),
    db().collection('donations').doc(trimmed).get(),
  ]);
  return serialize({
    campaigns: campaigns.docs.map((doc) => {
      const c = doc.data() as Campaign;
      return {
        id: doc.id,
        title: c.title,
        subtitle: `${c.status} · ${c.organizerName}`,
        href: `/admin/campaigns/${doc.id}`,
      };
    }),
    users: users.docs.map((doc) => {
      const u = doc.data() as UserProfile;
      return {
        id: doc.id,
        title: `${u.firstName} ${u.lastName}`.trim() || u.email,
        subtitle: `${u.email} · ${u.role}`,
        href: `/admin/users/${doc.id}`,
      };
    }),
    donations: donation.exists
      ? [
          {
            id: donation.id,
            title: `${(donation.data() as Donation).currency} ${(donation.data() as Donation).amount}`,
            subtitle: `${(donation.data() as Donation).donorName} · ${(donation.data() as Donation).paymentStatus}`,
            href: `/admin/donations/${donation.id}`,
          },
        ]
      : [],
  });
}
