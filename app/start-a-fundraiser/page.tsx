import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/security';
import { PageHero, ButtonLink } from '@/components/ui';
import { CampaignWizard } from '@/components/campaign-wizard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Start a fundraiser', robots: { index: false, follow: false } };
export default async function Start() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return (
    <>
      <PageHero eyebrow="TURN CARE INTO ACTION" title="Your idea. Our community." />
      <div className="container">
        {user.verified ? (
          <CampaignWizard />
        ) : (
          <div className="narrow notice">
            Please verify your email before starting a fundraiser.{' '}
            <ButtonLink href="/dashboard">Manage your account</ButtonLink>
          </div>
        )}
      </div>
    </>
  );
}
