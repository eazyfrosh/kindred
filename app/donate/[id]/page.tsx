import { notFound } from 'next/navigation';
import { PageHero } from '@/components/ui';
import { DonationForm } from '@/components/donation-form';
import { db } from '@/firebase/admin';
import { demoMode } from '@/lib/brand';
import { demoCampaigns } from '@/lib/demo';
import { serialize } from '@/lib/security';
import type { Campaign } from '@/types';
import { enabledMethods } from '@/services/manual-payments';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Make a donation', robots: { index: false, follow: false } };
export default async function Donate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = demoMode
    ? demoCampaigns.find((c) => c.id === id)
    : serialize((await db().collection('campaigns').doc(id).get()).data() as Campaign | undefined);
  if (!c || c.status !== 'approved') notFound();
  const providers = ['stripe', 'flutterwave'].filter(
    (p) =>
      !!process.env[`${p.toUpperCase()}_SECRET_KEY`] ||
      (process.env.PAYMENT_PROVIDER === p && !!process.env.PAYMENT_PROVIDER_SECRET),
  );
  return (
    <>
      <PageHero eyebrow="SMALL ACTS. LASTING CHANGE." title="Someone’s tomorrow starts with you." />
      <div className="container">
        <DonationForm campaign={c} providers={providers} methods={demoMode ? [] : await enabledMethods(c.currency)} />
      </div>
    </>
  );
}
