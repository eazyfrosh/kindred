import { z } from 'zod';
import { categories } from '@/types';
const text = (n: number) => z.string().trim().min(1).max(n);
export const profileSchema = z.object({ firstName: text(80), lastName: text(80) });
export const campaignSchema = z.object({
  title: text(120),
  category: z.enum(categories),
  shortDescription: text(240),
  description: text(30000),
  goalAmount: z.number().positive().max(10000000).multipleOf(0.01),
  currency: z.enum(['USD', 'NGN', 'GBP', 'EUR']),
  endDate: z
    .string()
    .refine(
      (v) => Number.isFinite(Date.parse(v)) && Date.parse(v) > Date.now(),
      'Choose a future deadline',
    ),
  organizerName: text(120),
  organizerBio: text(1500),
  location: text(120),
  coverImage: z.string().url(),
  gallery: z.array(z.string().url()).max(8),
  allocation: z
    .array(z.object({ label: text(100), percent: z.number().int().min(0).max(100) }))
    .min(1)
    .max(8)
    .refine((a) => a.reduce((s, v) => s + v.percent, 0) === 100, 'Allocation must total 100%'),
});
export const donationSchema = z.object({
  campaignId: text(128),
  amount: z.number().min(1).max(100000).multipleOf(0.01),
  frequency: z.enum(['once', 'monthly']),
  firstName: text(80),
  lastName: text(80),
  email: z.string().email().max(254),
  country: text(100),
  message: z.string().trim().max(1000).default(''),
  anonymous: z.boolean(),
  provider: z.enum(['stripe', 'paystack', 'flutterwave']),
  idempotencyKey: z.string().uuid(),
});
export const contactSchema = z.object({
  name: text(120),
  email: z.string().email().max(254),
  subject: text(160),
  message: text(5000),
  website: z.string().max(0).optional(),
});
export const volunteerSchema = z.object({
  name: text(120),
  email: z.string().email().max(254),
  phone: text(40),
  country: text(100),
  interest: text(120),
  skills: text(2000),
  message: text(5000),
  website: z.string().max(0).optional(),
});
export const newsletterSchema = z.object({
  email: z.string().email().max(254),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
