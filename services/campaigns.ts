import 'server-only';
import { cache } from 'react';
import { db } from '@/firebase/admin';
import { demoMode, tokens } from '@/lib/brand';
import { demoCampaigns, defaultContent } from '@/lib/demo';
import { serialize } from '@/lib/security';
import type { Campaign, Content } from '@/types';
export interface SearchOptions {
  q?: string;
  category?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
}
export async function listCampaigns(options: SearchOptions = {}) {
  const size = Math.min(options.limit || 12, 48);
  const search = tokens(options.q || '')[0];
  if (demoMode) {
    let rows = demoCampaigns.filter(
      (c) =>
        (!search || c.searchTokens.some((t) => t.includes(search))) &&
        (!options.category || options.category === 'All causes' || c.category === options.category),
    );
    if (options.sort === 'most-funded') rows.sort((a, b) => b.amountRaised - a.amountRaised);
    else if (options.sort === 'almost-funded')
      rows.sort((a, b) => b.amountRaised / b.goalAmount - a.amountRaised / a.goalAmount);
    else rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (options.sort === 'urgent') rows = rows.filter((c) => c.urgent);
    if (options.cursor) {
      const index = rows.findIndex((c) => c.id === options.cursor);
      if (index >= 0) rows = rows.slice(index + 1);
    }
    return {
      campaigns: rows.slice(0, size),
      nextCursor: rows.length > size ? rows[size - 1].id : undefined,
    };
  }
  let query = db().collection('campaigns').where('status', '==', 'approved');
  if (options.category && options.category !== 'All causes')
    query = query.where('category', '==', options.category);
  if (search) query = query.where('searchTokens', 'array-contains', search);
  if (options.sort === 'urgent') query = query.where('urgent', '==', true);
  const order =
    options.sort === 'most-funded'
      ? 'amountRaised'
      : options.sort === 'almost-funded'
        ? 'fundingRatio'
        : 'createdAt';
  query = query.orderBy(order, 'desc');
  if (options.cursor) {
    const cursor = await db().collection('campaigns').doc(options.cursor).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const snap = await query.limit(size + 1).get();
  const rows = serialize(
    snap.docs.slice(0, size).map((d) => ({ ...d.data(), id: d.id }) as Campaign),
  );
  return { campaigns: rows, nextCursor: snap.size > size ? rows.at(-1)?.id : undefined };
}
export const getCampaign = cache(async function getCampaign(
  slug: string,
): Promise<Campaign | null> {
  if (demoMode) return demoCampaigns.find((c) => c.slug === slug) || null;
  const snap = await db()
    .collection('campaigns')
    .where('slug', '==', slug)
    .where('status', '==', 'approved')
    .limit(1)
    .get();
  return snap.empty ? null : serialize({ ...snap.docs[0].data(), id: snap.docs[0].id } as Campaign);
});
export async function getContent(): Promise<Content> {
  if (demoMode) return defaultContent;
  const snap = await db().collection('siteSettings').doc('public').get();
  return snap.exists
    ? serialize(snap.data() as Content)
    : {
        ...defaultContent,
        announcement: 'Small acts. Lasting change.',
        impact: { people: 0, countries: 0, projects: 0 },
        testimonials: [],
        partners: [],
        team: [],
      };
}
export async function impactStats() {
  if (demoMode) return { raised: 1254300, donors: 8420, active: 9, ...defaultContent.impact };
  const [metrics, count, content] = await Promise.all([
    db().collection('siteSettings').doc('metrics').get(),
    db().collection('campaigns').where('status', '==', 'approved').count().get(),
    getContent(),
  ]);
  return {
    raised: metrics.data()?.raisedUSD || 0,
    donors: metrics.data()?.donationCount || 0,
    active: count.data().count,
    ...content.impact,
  };
}
export async function campaignActivity(id: string) {
  if (demoMode) return { updates: [], donors: [], comments: [] };
  const [updates, donors, comments] = await Promise.all([
    db()
      .collection('campaignUpdates')
      .where('campaignId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
    db()
      .collection('publicDonations')
      .where('campaignId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
    db()
      .collection('comments')
      .where('campaignId', '==', id)
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get(),
  ]);
  return serialize({
    updates: updates.docs.map((d) => ({ id: d.id, ...d.data() })),
    donors: donors.docs.map((d) => ({ id: d.id, ...d.data() })),
    comments: comments.docs.map((d) => ({ id: d.id, ...d.data() })),
  }) as {
    updates: Record<string, string>[];
    donors: Record<string, string | number>[];
    comments: Record<string, string>[];
  };
}

export async function featuredCampaigns(): Promise<Campaign[]> {
  if (demoMode) return demoCampaigns.filter((c) => c.featured).slice(0, 3);
  const snap = await db()
    .collection('campaigns')
    .where('status', '==', 'approved')
    .where('featured', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(3)
    .get();
  return serialize(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Campaign));
}
