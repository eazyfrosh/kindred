import { loadEnvConfig } from '@next/env';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { demoCampaigns, defaultContent } from '../lib/demo';
loadEnvConfig(process.cwd());
async function main() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  if (!projectId || process.env.SEED_PROJECT_CONFIRM !== projectId)
    throw new Error(
      'Set SEED_PROJECT_CONFIRM to your development Firebase project ID to seed fictional data.',
    );
  initializeApp({
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  const db = getFirestore();
  for (const c of demoCampaigns) {
    const ref = db.collection('campaigns').doc(c.id);
    if ((await ref.get()).exists) {
      console.log(`Skipped existing ${c.id}`);
      continue;
    }
    await ref.create({
      ...c,
      coverImage: new URL(
        c.coverImage,
        process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      ).toString(),
      gallery: c.gallery.map((p) =>
        new URL(p, process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').toString(),
      ),
      amountRaised: 0,
      donorCount: 0,
      viewCount: 0,
      shareCount: 0,
      fundingRatio: 0,
      seeded: true,
    });
  }
  const contentRef = db.collection('siteSettings').doc('public');
  if (!(await contentRef.get()).exists)
    await contentRef.create({
      ...defaultContent,
      impact: { people: 0, countries: 0, projects: 0 },
      announcement: 'Development campaigns — fictional examples.',
    });
  console.log(
    'Development campaigns seeded without fabricated financial transactions. Organizer IDs are fictional; assign a real owner through a reviewed migration before using them.',
  );
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
