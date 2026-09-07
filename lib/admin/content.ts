import 'server-only';
import { cache } from 'react';
import { db } from '@/firebase/admin';
import { HttpError, serialize } from '@/lib/security';
import { brand } from '@/lib/brand';
import type { Content } from '@/types';
import type { Partner, PlatformSettings, Testimonial } from '@/types/admin';
import type { AuthenticatedUser } from './auth';
import { recordAudit } from './audit';
import type { homepageContentSchema, partnerSchema, testimonialSchema } from './schemas';
import type { z } from 'zod';

const SETTINGS = 'siteSettings';

export const DEFAULT_SETTINGS: PlatformSettings = {
  general: {
    organizationName: brand.name,
    websiteName: brand.name,
    supportEmail: brand.email,
    defaultCurrency: 'USD',
    timezone: 'UTC',
  },
  donations: {
    minimumDonation: 5,
    suggestedAmounts: [25, 50, 100, 250],
    recurringEnabled: true,
    anonymousAllowed: true,
  },
  campaigns: {
    requireApproval: true,
    defaultDurationDays: 60,
    allowComments: true,
    allowUpdates: true,
  },
  fees: { percentage: 5, fixed: 0.3, displayFees: true },
  social: { facebook: '', instagram: '', x: '', linkedin: '', youtube: '' },
};

/**
 * Platform settings, merged over defaults. Payment provider secrets are never
 * stored here — they stay in environment variables or a secret manager.
 */
export const getPlatformSettings = cache(
  async function getPlatformSettings(): Promise<PlatformSettings> {
    const snap = await db().collection(SETTINGS).doc('platform').get();
    const stored = (snap.data() || {}) as Partial<PlatformSettings>;
    return {
      general: { ...DEFAULT_SETTINGS.general, ...stored.general },
      donations: { ...DEFAULT_SETTINGS.donations, ...stored.donations },
      campaigns: { ...DEFAULT_SETTINGS.campaigns, ...stored.campaigns },
      fees: { ...DEFAULT_SETTINGS.fees, ...stored.fees },
      social: { ...DEFAULT_SETTINGS.social, ...stored.social },
      updatedAt: stored.updatedAt,
      updatedBy: stored.updatedBy,
    };
  },
);

export async function savePlatformSettings(actor: AuthenticatedUser, input: PlatformSettings) {
  await db()
    .collection(SETTINGS)
    .doc('platform')
    .set(
      { ...input, updatedAt: new Date().toISOString(), updatedBy: actor.email },
      { merge: true },
    );
  await recordAudit(actor, {
    action: 'settings.update',
    targetType: 'settings',
    targetId: 'platform',
    description: 'Updated platform settings',
    metadata: { currency: input.general.defaultCurrency, feePercentage: input.fees.percentage },
  });
}

export type HomepageContent = z.infer<typeof homepageContentSchema>;

export async function getHomepageContent(): Promise<HomepageContent & Partial<Content>> {
  const snap = await db().collection(SETTINGS).doc('public').get();
  const stored = (snap.data() || {}) as Partial<Content> & Partial<HomepageContent>;
  return {
    announcement: stored.announcement || '',
    heroTitle: stored.heroTitle || '',
    heroSubtitle: stored.heroSubtitle || '',
    mission: stored.mission || '',
    impact: stored.impact || { people: 0, countries: 0, projects: 0 },
    donationImpacts: stored.donationImpacts || [],
    featuredCampaignIds: stored.featuredCampaignIds || [],
    faqs: stored.faqs || [],
  };
}

/**
 * Writes only the homepage keys this editor owns. Testimonials, partners, and
 * team entries in the same document are managed elsewhere and left untouched.
 */
export async function saveHomepageContent(actor: AuthenticatedUser, input: HomepageContent) {
  await db().collection(SETTINGS).doc('public').set(input, { merge: true });
  await recordAudit(actor, {
    action: 'content.homepage',
    targetType: 'content',
    targetId: 'public',
    description: 'Updated homepage content',
    metadata: { featured: input.featuredCampaignIds.length, faqs: input.faqs.length },
  });
}

async function listOrdered<T>(collection: string): Promise<T[]> {
  const snap = await db().collection(collection).orderBy('order', 'asc').limit(100).get();
  return serialize(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })));
}

export const listTestimonials = () => listOrdered<Testimonial>('testimonials');
export const listPartners = () => listOrdered<Partner>('partners');

/**
 * Mirrors published testimonials and partners into `siteSettings/public` so the
 * existing public website keeps reading them from one place.
 */
async function syncPublicShowcase() {
  const [testimonials, partners] = await Promise.all([listTestimonials(), listPartners()]);
  await db()
    .collection(SETTINGS)
    .doc('public')
    .set(
      {
        testimonials: testimonials
          .filter((t) => t.published)
          .map((t) => ({ quote: t.quote, name: t.name, detail: t.role || '' })),
        partners: partners.filter((p) => p.published).map((p) => p.name),
      },
      { merge: true },
    );
}

export async function saveTestimonial(
  actor: AuthenticatedUser,
  input: z.infer<typeof testimonialSchema>,
) {
  const now = new Date().toISOString();
  const { id, ...fields } = input;
  const ref = id ? db().collection('testimonials').doc(id) : db().collection('testimonials').doc();
  await ref.set({ ...fields, updatedAt: now, ...(id ? {} : { createdAt: now }) }, { merge: true });
  await syncPublicShowcase();
  await recordAudit(actor, {
    action: id ? 'testimonial.update' : 'testimonial.create',
    targetType: 'testimonial',
    targetId: ref.id,
    description: `${id ? 'Updated' : 'Added'} testimonial from ${input.name}`,
    metadata: { published: input.published, order: input.order },
  });
}

export async function savePartner(actor: AuthenticatedUser, input: z.infer<typeof partnerSchema>) {
  const now = new Date().toISOString();
  const { id, ...fields } = input;
  const ref = id ? db().collection('partners').doc(id) : db().collection('partners').doc();
  await ref.set({ ...fields, updatedAt: now, ...(id ? {} : { createdAt: now }) }, { merge: true });
  await syncPublicShowcase();
  await recordAudit(actor, {
    action: id ? 'partner.update' : 'partner.create',
    targetType: 'partner',
    targetId: ref.id,
    description: `${id ? 'Updated' : 'Added'} partner ${input.name}`,
    metadata: { published: input.published, order: input.order },
  });
}

export async function removeShowcaseItem(
  actor: AuthenticatedUser,
  collection: 'testimonials' | 'partners',
  id: string,
) {
  const ref = db().collection(collection).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'This entry no longer exists.');
  await ref.delete();
  await syncPublicShowcase();
  await recordAudit(actor, {
    action: `${collection === 'testimonials' ? 'testimonial' : 'partner'}.delete`,
    targetType: collection === 'testimonials' ? 'testimonial' : 'partner',
    targetId: id,
    description: `Deleted ${collection === 'testimonials' ? 'testimonial' : 'partner'} ${String(snap.data()?.name || id)}`,
    metadata: {},
  });
}

/** Moves an entry up or down in the published display order. */
export async function reorderShowcaseItem(
  actor: AuthenticatedUser,
  collection: 'testimonials' | 'partners',
  id: string,
  direction: 'up' | 'down',
) {
  const rows = await listOrdered<{ id: string; order: number }>(collection);
  const index = rows.findIndex((row) => row.id === id);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= rows.length) return;
  [rows[index], rows[swapWith]] = [rows[swapWith], rows[index]];
  // Rewrite the whole sequence so display order stays a dense 0..n-1 range.
  const batch = db().batch();
  rows.forEach((row, position) =>
    batch.update(db().collection(collection).doc(row.id), { order: position }),
  );
  await batch.commit();
  await syncPublicShowcase();
  await recordAudit(actor, {
    action: `${collection === 'testimonials' ? 'testimonial' : 'partner'}.reorder`,
    targetType: collection === 'testimonials' ? 'testimonial' : 'partner',
    targetId: id,
    description: `Moved ${collection.slice(0, -1)} ${direction}`,
    metadata: { from: index, to: swapWith },
  });
}
