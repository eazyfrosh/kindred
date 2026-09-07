import { z } from 'zod';
import { categories } from '@/types';

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).default('');
export const idSchema = z.string().trim().min(1).max(128);
/** Moderation decisions that hurt an organizer always require a written reason. */
export const reasonSchema = z.string().trim().min(10).max(2000);
const url = z.string().trim().url().max(2048);
const optionalUrl = z.union([url, z.literal('')]).default('');

export const campaignActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), id: idSchema }),
  z.object({ action: z.literal('reject'), id: idSchema, reason: reasonSchema }),
  z.object({ action: z.literal('suspend'), id: idSchema, reason: reasonSchema }),
  z.object({ action: z.literal('unsuspend'), id: idSchema }),
  z.object({ action: z.literal('complete'), id: idSchema }),
  z.object({ action: z.literal('verify'), id: idSchema }),
  z.object({ action: z.literal('unverify'), id: idSchema, reason: reasonSchema }),
  z.object({ action: z.literal('feature'), id: idSchema }),
  z.object({ action: z.literal('unfeature'), id: idSchema }),
  z.object({ action: z.literal('delete'), id: idSchema, reason: reasonSchema }),
]);
export type CampaignAction = z.infer<typeof campaignActionSchema>;

export const campaignEditSchema = z.object({
  id: idSchema,
  title: text(120),
  category: z.enum(categories),
  shortDescription: text(240),
  description: text(30000),
  location: text(120),
  goalAmount: z.coerce.number().positive().max(10_000_000),
  endDate: z.string().refine((v) => Number.isFinite(Date.parse(v)), 'Choose a valid deadline'),
});

export const userActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('role'),
    uid: idSchema,
    role: z.enum(['user', 'fundraiser', 'admin']),
    reason: reasonSchema,
  }),
  z.object({ action: z.literal('verifyFundraiser'), uid: idSchema }),
  z.object({ action: z.literal('revokeFundraiser'), uid: idSchema, reason: reasonSchema }),
  z.object({ action: z.literal('suspend'), uid: idSchema, reason: reasonSchema }),
  z.object({ action: z.literal('reactivate'), uid: idSchema }),
  z.object({ action: z.literal('notes'), uid: idSchema, notes: z.string().trim().max(5000) }),
]);
export type UserAction = z.infer<typeof userActionSchema>;

export const payoutActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('under_review'), id: idSchema, note: optionalText(2000) }),
  z.object({ action: z.literal('approve'), id: idSchema, note: optionalText(2000) }),
  z.object({ action: z.literal('reject'), id: idSchema, note: reasonSchema }),
  z.object({ action: z.literal('processing'), id: idSchema, note: optionalText(2000) }),
  z.object({
    action: z.literal('paid'),
    id: idSchema,
    note: optionalText(2000),
    providerReference: text(160),
  }),
  z.object({ action: z.literal('cancel'), id: idSchema, note: reasonSchema }),
  z.object({ action: z.literal('notes'), id: idSchema, note: z.string().trim().max(5000) }),
]);
export type PayoutAction = z.infer<typeof payoutActionSchema>;

/**
 * Manual donation adjustments are deliberately narrow: an administrator can
 * record a refund or dispute that a provider reported out of band, and can
 * abandon a stale intent. Marking a payment `successful` by hand is not
 * offered anywhere — that state only ever comes from a verified webhook.
 */
export const donationAdjustmentSchema = z.object({
  id: idSchema,
  status: z.enum(['failed', 'refunded', 'disputed']),
  reason: reasonSchema,
});

export const volunteerActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('status'),
    id: idSchema,
    status: z.enum(['new', 'reviewing', 'accepted', 'rejected']),
  }),
  z.object({ action: z.literal('notes'), id: idSchema, notes: z.string().trim().max(5000) }),
  z.object({ action: z.literal('delete'), id: idSchema }),
]);

export const messageActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('status'),
    id: idSchema,
    status: z.enum(['unread', 'read', 'resolved']),
  }),
  z.object({ action: z.literal('delete'), id: idSchema }),
]);

export const subscriberActionSchema = z.object({ action: z.literal('delete'), id: idSchema });

export const testimonialSchema = z.object({
  id: z.string().trim().max(128).optional(),
  name: text(120),
  role: optionalText(160),
  quote: text(1200),
  photo: optionalUrl,
  published: z.coerce.boolean().default(false),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export const partnerSchema = z.object({
  id: z.string().trim().max(128).optional(),
  name: text(120),
  logo: optionalUrl,
  website: optionalUrl,
  published: z.coerce.boolean().default(false),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export const homepageContentSchema = z.object({
  announcement: z.string().trim().max(300),
  heroTitle: optionalText(160),
  heroSubtitle: optionalText(400),
  mission: optionalText(2000),
  impact: z.object({
    people: z.coerce.number().int().min(0),
    countries: z.coerce.number().int().min(0).max(250),
    projects: z.coerce.number().int().min(0),
  }),
  donationImpacts: z
    .array(z.object({ amount: z.coerce.number().min(1).max(1_000_000), label: text(160) }))
    .max(8)
    .default([]),
  featuredCampaignIds: z.array(idSchema).max(6).default([]),
  faqs: z
    .array(z.object({ question: text(300), answer: text(3000) }))
    .max(30)
    .default([]),
});

export const platformSettingsSchema = z.object({
  general: z.object({
    organizationName: text(120),
    websiteName: text(120),
    supportEmail: z.string().trim().email().max(254),
    defaultCurrency: z.enum(['USD', 'NGN', 'GBP', 'EUR']),
    timezone: text(64),
  }),
  donations: z.object({
    minimumDonation: z.coerce.number().min(1).max(10_000),
    suggestedAmounts: z.array(z.coerce.number().min(1).max(1_000_000)).min(1).max(8),
    recurringEnabled: z.coerce.boolean(),
    anonymousAllowed: z.coerce.boolean(),
  }),
  campaigns: z.object({
    requireApproval: z.coerce.boolean(),
    defaultDurationDays: z.coerce.number().int().min(7).max(365),
    allowComments: z.coerce.boolean(),
    allowUpdates: z.coerce.boolean(),
  }),
  fees: z.object({
    percentage: z.coerce.number().min(0).max(30),
    fixed: z.coerce.number().min(0).max(100),
    displayFees: z.coerce.boolean(),
  }),
  social: z.object({
    facebook: optionalUrl,
    instagram: optionalUrl,
    x: optionalUrl,
    linkedin: optionalUrl,
    youtube: optionalUrl,
  }),
});
