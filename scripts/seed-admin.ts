/**
 * Development seed for the admin dashboard.
 *
 * Creates fictional users, campaigns, donations, payout requests, volunteer
 * applications, and contact messages so the admin screens have something to
 * show before real traffic exists.
 *
 * Guards, in order: it refuses to run with NODE_ENV=production, it requires the
 * target project id to be repeated in SEED_PROJECT_CONFIRM, and it requires an
 * explicit SEED_ADMIN_CONFIRM=yes. Every document it writes carries
 * `seeded: true` so it can be identified and removed later.
 *
 *   NODE_ENV=development SEED_PROJECT_CONFIRM=<project-id> SEED_ADMIN_CONFIRM=yes \
 *     npm run seed:admin
 */
// @next/env ships CommonJS only, so it is imported as a default export.
import nextEnv from '@next/env';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { categories } from '../types/index.js';

nextEnv.loadEnvConfig(process.cwd());

const FIRST = [
  'Maya',
  'Daniel',
  'Amina',
  'Lena',
  'Tobi',
  'Grace',
  'Samuel',
  'Nia',
  'Ravi',
  'Elena',
];
const LAST = [
  'Okafor',
  'Brooks',
  'Bello',
  'Martins',
  'Adeyemi',
  'Cole',
  'Mensah',
  'Rahman',
  'Iyer',
  'Costa',
];
const COUNTRIES = ['Nigeria', 'United Kingdom', 'Ghana', 'Kenya', 'India', 'Brazil'];
const INTERESTS = ['Community outreach', 'Education', 'Food support', 'Environment'];

const days = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const pick = <T>(list: readonly T[], index: number) => list[index % list.length];
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function tokens(text: string) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter(Boolean),
    ),
  ].slice(0, 100);
}

async function seedUsers(db: Firestore) {
  const uids: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const uid = `seed-user-${i + 1}`;
    const firstName = pick(FIRST, i);
    const lastName = pick(LAST, i);
    const email = `${slugify(`${firstName}.${lastName}`)}@example.org`;
    const role = i < 4 ? 'fundraiser' : 'user';
    await db
      .collection('users')
      .doc(uid)
      .set({
        uid,
        firstName,
        lastName,
        email,
        photoURL: '',
        role,
        verified: i % 3 !== 0,
        fundraiserVerified: role === 'fundraiser' && i % 2 === 0,
        disabled: false,
        savedCampaigns: [],
        searchTokens: tokens(`${firstName} ${lastName} ${email}`),
        createdAt: days(120 - i * 9),
        updatedAt: days(3),
        seeded: true,
      });
    uids.push(uid);
  }
  return uids;
}

async function seedCampaigns(db: Firestore, uids: string[]) {
  const statuses = [
    'approved',
    'approved',
    'approved',
    'approved',
    'pending',
    'pending',
    'draft',
    'completed',
  ];
  const ids: {
    id: string;
    organizerId: string;
    currency: string;
    title: string;
    category: string;
  }[] = [];
  for (let i = 0; i < 8; i += 1) {
    const id = `seed-campaign-${i + 1}`;
    const organizerId = uids[i % 4];
    const organizerName = `${pick(FIRST, i % 4)} ${pick(LAST, i % 4)}`;
    const category = pick(categories, i);
    const title = `${category} support project ${i + 1}`;
    const status = statuses[i];
    const goalAmount = 10_000 + i * 5_000;
    await db
      .collection('campaigns')
      .doc(id)
      .set({
        id,
        slug: `${slugify(title)}-${i + 1}`,
        title,
        shortDescription: `A fictional development record for the ${category.toLowerCase()} category.`,
        description: `Seed data for local development. This campaign is not real and has no real beneficiaries.\n\nIt exists so the admin dashboard has records to page through, filter, and moderate.`,
        category,
        organizerId,
        organizerName,
        organizerBio: 'Fictional organizer used for local development only.',
        location: `${pick(COUNTRIES, i)}`,
        coverImage: '',
        gallery: [],
        goalAmount,
        amountRaised: 0,
        amountRaisedMinor: 0,
        currency: 'USD',
        donorCount: 0,
        viewCount: 0,
        shareCount: 0,
        fundingRatio: 0,
        startDate: days(90 - i * 7),
        endDate: days(-60 + i),
        status,
        featured: i === 0,
        verified: status === 'approved',
        urgent: i === 2,
        allocation: [{ label: 'Programme delivery', percent: 100 }],
        searchTokens: tokens(`${title} ${category} ${organizerName}`),
        createdAt: days(90 - i * 7),
        updatedAt: days(2),
        seeded: true,
      });
    ids.push({ id, organizerId, currency: 'USD', title, category });
  }
  return ids;
}

async function seedDonations(
  db: Firestore,
  campaigns: Awaited<ReturnType<typeof seedCampaigns>>,
  uids: string[],
) {
  const live = campaigns.filter((_, index) => index < 5);
  const statuses = ['successful', 'successful', 'successful', 'pending', 'refunded'] as const;
  const totals = new Map<string, { amount: number; count: number }>();
  for (let i = 0; i < 20; i += 1) {
    const campaign = live[i % live.length];
    const donorId = uids[(i + 4) % uids.length];
    const status = statuses[i % statuses.length];
    const amount = 25 + (i % 8) * 75;
    const createdAt = days(30 - (i % 30));
    await db
      .collection('donations')
      .doc(`seed-donation-${i + 1}`)
      .set({
        id: `seed-donation-${i + 1}`,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        category: campaign.category,
        donorId,
        donorName: `${pick(FIRST, i + 2)} ${pick(LAST, i + 5)}`,
        donorEmail: `donor${i + 1}@example.org`,
        amount,
        currency: 'USD',
        anonymous: i % 5 === 0,
        message: '',
        paymentProvider: ['stripe', 'paystack', 'flutterwave'][i % 3],
        paymentReference: `seed-ref-${i + 1}`,
        providerTransactionId: status === 'successful' ? `seed-txn-${i + 1}` : '',
        paymentStatus: status,
        frequency: 'once',
        createdAt,
        ...(status === 'successful' ? { confirmedAt: createdAt } : {}),
        seeded: true,
      });
    if (status !== 'successful') continue;
    const current = totals.get(campaign.id) || { amount: 0, count: 0 };
    totals.set(campaign.id, { amount: current.amount + amount, count: current.count + 1 });
    for (const period of [createdAt.slice(0, 10), createdAt.slice(0, 7)])
      await db
        .collection('_revenuePeriods')
        .doc(period)
        .set(
          {
            raisedUSD: FieldValue.increment(amount),
            countUSD: FieldValue.increment(1),
            seeded: true,
          },
          { merge: true },
        );
    await db
      .collection('siteSettings')
      .doc('metrics')
      .set(
        {
          raisedUSD: FieldValue.increment(amount),
          countUSD: FieldValue.increment(1),
          donationCount: FieldValue.increment(1),
          donorCount: FieldValue.increment(1),
          categoryUSD: { [campaign.category]: FieldValue.increment(amount) },
        },
        { merge: true },
      );
  }
  for (const [campaignId, total] of totals) {
    const ref = db.collection('campaigns').doc(campaignId);
    const goal = Number((await ref.get()).data()?.goalAmount || 1);
    await ref.update({
      amountRaised: total.amount,
      amountRaisedMinor: Math.round(total.amount * 100),
      donorCount: total.count,
      fundingRatio: total.amount / goal,
    });
  }
  return totals;
}

async function seedPayouts(
  db: Firestore,
  campaigns: Awaited<ReturnType<typeof seedCampaigns>>,
  totals: Map<string, { amount: number; count: number }>,
) {
  const statuses = ['requested', 'under_review', 'paid'] as const;
  for (let i = 0; i < 3; i += 1) {
    const campaign = campaigns[i];
    const available = (totals.get(campaign.id)?.amount || 500) * 0.5;
    const now = days(10 - i * 3);
    await db
      .collection('payouts')
      .doc(`seed-payout-${i + 1}`)
      .set({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        organizerId: campaign.organizerId,
        organizerName: `${pick(FIRST, i)} ${pick(LAST, i)}`,
        organizerEmail: `${slugify(`${pick(FIRST, i)}.${pick(LAST, i)}`)}@example.org`,
        amount: Math.round(available * 100) / 100,
        currency: 'USD',
        status: statuses[i],
        destinationSummary: `Bank account ending 00${i + 1}`,
        destinationRef: `seed-destination-${i + 1}`,
        availableAtRequest: Math.round(available * 100) / 100,
        adminNotes: '',
        history: [],
        requestedAt: now,
        updatedAt: now,
        paidAt: statuses[i] === 'paid' ? now : null,
        processedBy: null,
        providerReference: statuses[i] === 'paid' ? `seed-transfer-${i + 1}` : '',
        seeded: true,
      });
  }
}

async function seedSubmissions(db: Firestore) {
  for (let i = 0; i < 6; i += 1) {
    await db
      .collection('volunteerApplications')
      .doc(`seed-volunteer-${i + 1}`)
      .set({
        name: `${pick(FIRST, i + 1)} ${pick(LAST, i + 3)}`,
        email: `volunteer${i + 1}@example.org`,
        phone: `+10000000${i}0`,
        country: pick(COUNTRIES, i),
        interest: pick(INTERESTS, i),
        skills: 'Fictional development record.',
        message: 'Seeded volunteer application for local development.',
        status: ['new', 'reviewing', 'accepted', 'rejected'][i % 4],
        notes: '',
        createdAt: days(20 - i * 2),
        seeded: true,
      });
    await db
      .collection('contactMessages')
      .doc(`seed-message-${i + 1}`)
      .set({
        name: `${pick(FIRST, i + 5)} ${pick(LAST, i + 1)}`,
        email: `contact${i + 1}@example.org`,
        subject: `Development enquiry ${i + 1}`,
        message: 'Seeded contact message for local development.',
        status: ['unread', 'read', 'resolved'][i % 3],
        createdAt: days(15 - i * 2),
        seeded: true,
      });
  }
}

async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (process.env.NODE_ENV === 'production')
    throw new Error('Refusing to seed with NODE_ENV=production.');
  if (!projectId || process.env.SEED_PROJECT_CONFIRM !== projectId)
    throw new Error('Set SEED_PROJECT_CONFIRM to your development Firebase project ID.');
  if (process.env.SEED_ADMIN_CONFIRM !== 'yes')
    throw new Error('Set SEED_ADMIN_CONFIRM=yes to confirm writing fictional admin records.');

  // Against the local emulators a demo project needs no service account.
  const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST) && projectId.startsWith('demo-');
  initializeApp(
    useEmulator
      ? { projectId }
      : {
          credential: cert({
            projectId,
            clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        },
  );
  const db = getFirestore();

  const uids = await seedUsers(db);
  const campaigns = await seedCampaigns(db, uids);
  const totals = await seedDonations(db, campaigns, uids);
  await seedPayouts(db, campaigns, totals);
  await seedSubmissions(db);

  console.log(
    'Seeded 10 users, 8 campaigns, 20 donations, 3 payout requests, 6 volunteer applications and 6 contact messages.',
  );
  console.log(
    'Every seeded document carries `seeded: true`. Grant yourself admin with npm run admin:grant.',
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
