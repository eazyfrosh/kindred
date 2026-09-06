import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, serialize } from '@/lib/security';
import { db } from '@/firebase/admin';
import { money } from '@/lib/brand';
import { Workspace, DonationTable } from '@/components/workspace';
import { CampaignCard, Empty, ButtonLink } from '@/components/ui';
import { AccountAuthActions } from '@/components/auth-form';
import { ActionButton, ProfileForm, UpdateForm } from '@/components/dashboard-controls';
import { CampaignWizard } from '@/components/campaign-wizard';
import type { Campaign, Donation } from '@/types';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your account', robots: { index: false, follow: false } };
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; edit?: string; update?: string; cursor?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { tab = 'overview', edit, update, cursor } = await searchParams;
  let donationsQuery = db()
    .collection('donations')
    .where('donorId', '==', user.uid)
    .orderBy('createdAt', 'desc');
  if (cursor) {
    const doc = await db().collection('donations').doc(cursor).get();
    if (doc.exists && doc.data()?.donorId === user.uid)
      donationsQuery = donationsQuery.startAfter(doc);
  }
  const [donationSnap, campaignSnap, notificationSnap] = await Promise.all([
    donationsQuery.limit(25).get(),
    db()
      .collection('campaigns')
      .where('organizerId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get(),
    db()
      .collection('notifications')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(30)
      .get(),
  ]);
  const donations = serialize(
    donationSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as Donation),
  );
  const campaigns = serialize(
    campaignSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as Campaign),
  );
  const userStats = (await db().collection('_userStats').doc(user.uid).get()).data() || {};
  let saved: Campaign[] = [];
  if (tab === 'saved' && user.savedCampaigns?.length) {
    const docs = await db().getAll(
      ...user.savedCampaigns.slice(0, 100).map((id) => db().collection('campaigns').doc(id)),
    );
    saved = serialize(
      docs
        .filter((d) => d.exists && d.data()?.status === 'approved')
        .map((d) => ({ ...d.data(), id: d.id }) as Campaign),
    );
  }
  const editing = edit ? campaigns.find((c) => c.id === edit) : null;
  const updating = update ? campaigns.find((c) => c.id === update) : null;
  return (
    <Workspace tab={tab}>
      <div className="section-heading">
        <div>
          <div className="eyebrow">YOUR KINDRED COMMUNITY</div>
          <h1>Hello, {user.firstName}.</h1>
          <p>Every little act adds up. Thank you for being part of this.</p>
        </div>
        <ButtonLink href="/start-a-fundraiser">Start a fundraiser</ButtonLink>
      </div>
      {!user.verified && (
        <div className="notice">
          Check your inbox to verify your email. After verifying, use “Refresh verification” in
          account settings.
        </div>
      )}
      {user.role === 'admin' && (
        <p>
          <Link className="text-link" href="/admin">
            Open administration ↗
          </Link>
        </p>
      )}
      {tab === 'overview' && (
        <>
          <div className="metric-grid">
            <div className="metric">
              <span>Donations made</span>
              <strong>{userStats.donationCount || 0}</strong>
            </div>
            <div className="metric">
              <span>Total given</span>
              <strong>
                {['USD', 'NGN', 'GBP', 'EUR']
                  .filter((currency) => userStats['total' + currency])
                  .map((currency) => money(userStats['total' + currency], currency))
                  .join(' · ') || money(0)}
              </strong>
            </div>
            <div className="metric">
              <span>Campaigns supported</span>
              <strong>{userStats.campaignCount || 0}</strong>
            </div>
            <div className="metric">
              <span>My fundraisers</span>
              <strong>{campaigns.length}</strong>
            </div>
          </div>
          <section className="panel">
            <h2>Your recent kindness</h2>
            {donations.length ? (
              <DonationTable donations={donations.slice(0, 5)} />
            ) : (
              <Empty title="Your giving story starts here.">
                <Link href="/causes">Find a cause you believe in.</Link>
              </Empty>
            )}
          </section>
        </>
      )}
      {tab === 'donations' && (
        <div className="panel">
          <h2>Your donation history</h2>
          <div className="mb-5">
            <ActionButton url="/api/account" data={{ action: 'billing' }}>
              Manage monthly giving
            </ActionButton>
          </div>
          {donations.length ? (
            <DonationTable donations={donations} />
          ) : (
            <Empty title="No donations yet." />
          )}
          {donationSnap.size === 25 && (
            <Link
              className="button secondary mt-5"
              href={`/dashboard?tab=donations&cursor=${donations.at(-1)?.id}`}
            >
              Older donations
            </Link>
          )}
        </div>
      )}
      {tab === 'campaigns' &&
        (editing ? (
          <CampaignWizard initial={editing} />
        ) : updating ? (
          <div className="panel">
            <h2>Update: {updating.title}</h2>
            <UpdateForm id={updating.id} />
          </div>
        ) : (
          <>
            <h2>Your fundraisers</h2>
            {campaigns.length ? (
              campaigns.map((c) => (
                <article className="record-card" key={c.id}>
                  <div className="section-heading">
                    <div>
                      <span className={`status ${c.status}`}>{c.status}</span>
                      <h3 className="mt-3">{c.title}</h3>
                    </div>
                    <span>
                      {money(c.amountRaised, c.currency)} / {money(c.goalAmount, c.currency)}
                    </span>
                  </div>
                  <p>
                    {c.donorCount} donations · {c.viewCount} views · {c.shareCount} shares
                  </p>
                  <div className="action-row">
                    {['draft', 'pending', 'rejected'].includes(c.status) && (
                      <Link
                        className="button secondary small-button"
                        href={`/dashboard?tab=campaigns&edit=${c.id}`}
                      >
                        Edit campaign
                      </Link>
                    )}
                    {c.status === 'approved' && (
                      <>
                        <Link
                          className="button secondary small-button"
                          href={`/campaign/${c.slug}`}
                        >
                          View & share
                        </Link>
                        <Link
                          className="button secondary small-button"
                          href={`/dashboard?tab=campaigns&update=${c.id}`}
                        >
                          Publish update
                        </Link>
                        <ActionButton url={`/api/campaigns/${c.id}/close`} data={{}}>
                          {c.closureRequested ? 'Closure requested' : 'Request closure'}
                        </ActionButton>
                      </>
                    )}
                  </div>
                  <FundraiserDonations id={c.id} />
                </article>
              ))
            ) : (
              <Empty title="Your first cause is waiting to happen.">
                <Link href="/start-a-fundraiser">Start a fundraiser.</Link>
              </Empty>
            )}
          </>
        ))}
      {tab === 'saved' && (
        <>
          <h2>Saved for a little more thought</h2>
          <div className="campaign-grid">
            {saved.length ? (
              saved.map((c) => <CampaignCard key={c.id} campaign={c} />)
            ) : (
              <Empty title="No saved campaigns yet.">
                Use the Save button on a campaign to find it here later.
              </Empty>
            )}
          </div>
        </>
      )}
      {tab === 'notifications' && (
        <>
          <h2>Your community updates</h2>
          {notificationSnap.empty ? (
            <Empty title="You’re all caught up." />
          ) : (
            notificationSnap.docs.map((d) => {
              const n = d.data();
              return (
                <article className="record-card" key={d.id}>
                  <h3>{n.title}</h3>
                  <p>{n.message}</p>
                  <span className="small muted">{new Date(n.createdAt).toLocaleString()}</span>
                  {!n.read && (
                    <div className="mt-3">
                      <ActionButton url="/api/account" data={{ action: 'notification', id: d.id }}>
                        Mark as read
                      </ActionButton>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </>
      )}
      {tab === 'settings' && (
        <div className="panel">
          <h2>Account settings</h2>
          <AccountAuthActions />
          <ProfileForm user={user} />
        </div>
      )}
    </Workspace>
  );
}
async function FundraiserDonations({ id }: { id: string }) {
  const snap = await db()
    .collection('publicDonations')
    .where('campaignId', '==', id)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
  return (
    <details className="faq">
      <summary>Recent confirmed donations</summary>
      {snap.empty ? (
        <p>No confirmed donations yet.</p>
      ) : (
        snap.docs.map((d) => (
          <p key={d.id}>
            {d.data().donorName} · {money(d.data().amount, d.data().currency)} ·{' '}
            {new Date(d.data().createdAt).toLocaleDateString()}
          </p>
        ))
      )}
    </details>
  );
}
