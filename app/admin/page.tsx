import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, serialize } from '@/lib/security';
import { db } from '@/firebase/admin';
import { money, tokens } from '@/lib/brand';
import { AdminOverview } from '@/components/admin-overview';
import { Workspace, DonationTable } from '@/components/workspace';
import { Empty } from '@/components/ui';
import { ActionButton, NotesForm } from '@/components/dashboard-controls';
import { ContentEditor } from '@/components/content-editor';
import { CampaignWizard } from '@/components/campaign-wizard';
import { getContent } from '@/services/campaigns';
import type { Campaign, Donation, UserProfile } from '@/types';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration', robots: { index: false, follow: false } };
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    cursor?: string;
    edit?: string;
    user?: string;
  }>;
}) {
  const actor = await currentUser();
  if (!actor) redirect('/login');
  if (actor.role !== 'admin')
    return (
      <div className="container section">
        <Empty title="Administrator access required.">
          This area is restricted to authorized administrators.
        </Empty>
      </div>
    );
  const p = await searchParams;
  const tab = p.tab || 'overview';
  return (
    <Workspace admin tab={tab}>
      <div className="section-heading">
        <div>
          <div className="eyebrow">KINDRED ADMINISTRATION</div>
          <h1>
            {(
              {
                overview: 'A clearer view of the good.',
                campaigns: 'Campaign management',
                donations: 'Donation management',
                users: 'People & permissions',
                volunteers: 'Volunteer applications',
                messages: 'Your community inbox',
                comments: 'Support message review',
                content: 'Your public website',
              } as Record<string, string>
            )[tab] || 'Administration'}
          </h1>
        </div>
        <Link className="text-link" href="/dashboard">
          My account ↗
        </Link>
      </div>
      {tab === 'overview' ? (
        <AdminOverview />
      ) : tab === 'content' ? (
        <div className="panel">
          <ContentEditor content={await getContent()} />
        </div>
      ) : (
        <AdminRecords params={p} tab={tab} />
      )}
    </Workspace>
  );
}
async function AdminRecords({
  params: p,
  tab,
}: {
  params: { q?: string; status?: string; cursor?: string; edit?: string; user?: string };
  tab: string;
}) {
  const collections: Record<string, string> = {
    campaigns: 'campaigns',
    donations: 'donations',
    users: 'users',
    volunteers: 'volunteerApplications',
    messages: 'contactMessages',
    comments: 'comments',
  };
  const collection = collections[tab];
  if (!collection) return <Empty />;
  let query = db().collection(collection).orderBy('createdAt', 'desc');
  const indexedSearch = tab === 'users' || tab === 'campaigns';
  if (p.q && indexedSearch) {
    const keyword = tokens(p.q)[0];
    if (keyword) query = query.where('searchTokens', 'array-contains', keyword);
  }
  if (p.status)
    query = query.where(tab === 'donations' ? 'paymentStatus' : 'status', '==', p.status);
  if (p.cursor) {
    const cursor = await db().collection(collection).doc(p.cursor).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const snap = await query.limit(50).get();
  const rows = serialize(snap.docs.map((d) => ({ ...d.data(), id: d.id }))) as Record<
    string,
    unknown
  >[];
  const filtered =
    p.q && !indexedSearch
      ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(p.q!.toLowerCase()))
      : rows;
  const statuses: Record<string, string[]> = {
    campaigns: ['draft', 'pending', 'approved', 'rejected', 'suspended', 'completed'],
    donations: ['successful', 'pending', 'failed', 'refunded'],
    volunteers: ['new', 'reviewing', 'accepted', 'declined'],
    messages: ['unread', 'read', 'resolved'],
    comments: ['pending', 'approved', 'rejected'],
  };
  if (p.edit && tab === 'campaigns') {
    const doc = await db().collection('campaigns').doc(p.edit).get();
    if (doc.exists)
      return <CampaignWizard initial={serialize({ ...doc.data(), id: doc.id } as Campaign)} />;
  }
  if (p.user && tab === 'users') return <UserDetails id={p.user} />;
  return (
    <>
      <form className="filters" action="/admin">
        <input type="hidden" name="tab" value={tab} />
        <label>
          {indexedSearch ? 'Search all records by keyword' : 'Search this page'}
          <input name="q" placeholder="Name, title, email, reference…" defaultValue={p.q} />
        </label>
        {statuses[tab] && (
          <label>
            Status
            <select name="status" defaultValue={p.status || ''}>
              <option value="">All statuses</option>
              {statuses[tab].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        <button className="button">Apply filters</button>
      </form>
      {filtered.length === 0 ? (
        <Empty title="No matching records." />
      ) : tab === 'donations' ? (
        <DonationTable donations={filtered as unknown as Donation[]} admin />
      ) : (
        filtered.map((r) => {
          const id = String(r.id);
          if (tab === 'campaigns') {
            const c = r as unknown as Campaign;
            return (
              <article className="record-card" key={id}>
                <div className="section-heading">
                  <div>
                    <span className={`status ${c.status}`}>{c.status}</span>
                    <h3 className="mt-3">{c.title}</h3>
                    <p>
                      {c.organizerName} · {c.category} · {money(c.amountRaised, c.currency)} /{' '}
                      {money(c.goalAmount, c.currency)}
                    </p>
                  </div>
                  {c.closureRequested && <span className="status pending">Closure requested</span>}
                </div>
                <details className="faq">
                  <summary>Campaign details & story</summary>
                  <p>{c.description}</p>
                  <p>{c.organizerBio}</p>
                  <p>Deadline: {c.endDate}</p>
                </details>
                <div className="action-row mt-4">
                  {['approve', 'reject', 'suspend', 'complete', 'feature', 'urgent', 'delete'].map(
                    (action) => (
                      <ActionButton
                        key={action}
                        url="/api/admin/campaigns"
                        data={{ id, action }}
                        confirm={action === 'delete'}
                      >
                        {action === 'feature'
                          ? c.featured
                            ? 'Unfeature'
                            : 'Feature'
                          : action === 'urgent'
                            ? c.urgent
                              ? 'Remove urgent'
                              : 'Mark urgent'
                            : action[0].toUpperCase() + action.slice(1)}
                      </ActionButton>
                    ),
                  )}
                  <Link
                    className="button secondary small-button"
                    href={`/admin?tab=campaigns&edit=${id}`}
                  >
                    Edit
                  </Link>
                  {c.status === 'approved' && (
                    <Link className="button secondary small-button" href={`/campaign/${c.slug}`}>
                      View campaign
                    </Link>
                  )}
                </div>
              </article>
            );
          }
          if (tab === 'users') {
            const u = r as unknown as UserProfile;
            return (
              <article className="record-card" key={id}>
                <h3>
                  {u.firstName} {u.lastName}
                </h3>
                <p>
                  {u.email} · {u.role} · {u.disabled ? 'Access disabled' : 'Active'}
                </p>
                <div className="action-row">
                  {['user', 'fundraiser', 'admin'].map((role) => (
                    <ActionButton
                      key={role}
                      url="/api/admin/users"
                      data={{ id, action: 'role', role }}
                      confirm
                    >{`Set ${role}`}</ActionButton>
                  ))}
                  <ActionButton
                    url="/api/admin/users"
                    data={{ id, action: 'disable', disabled: !u.disabled }}
                    confirm
                  >
                    {u.disabled ? 'Enable access' : 'Disable access'}
                  </ActionButton>
                  <ActionButton url="/api/admin/users" data={{ id, action: 'verify' }}>
                    Verify fundraiser
                  </ActionButton>
                  <Link
                    className="button secondary small-button"
                    href={`/admin?tab=users&user=${id}`}
                  >
                    History & campaigns
                  </Link>
                </div>
              </article>
            );
          }
          return (
            <article className="record-card" key={id}>
              <span className={`status ${r.status}`}>{String(r.status)}</span>
              <h3 className="mt-3">{String(r.name || r.authorName || 'Community member')}</h3>
              <p>
                {String(r.email || '')} {String(r.phone || '')} {String(r.country || '')}
              </p>
              {r.subject ? <h4>{String(r.subject)}</h4> : null}
              <p>{String(r.message || '')}</p>
              {tab === 'volunteers' && (
                <p>
                  {String(r.interest)} · Skills: {String(r.skills)}
                </p>
              )}
              <div className="action-row mb-5">
                {(statuses[tab] || []).map((status) => (
                  <ActionButton
                    key={status}
                    url={`/api/admin/${collection}`}
                    data={{ id, action: 'status', status }}
                  >
                    Mark {status}
                  </ActionButton>
                ))}
                <ActionButton
                  url={`/api/admin/${collection}`}
                  data={{ id, action: 'delete' }}
                  confirm
                >
                  Delete
                </ActionButton>
              </div>
              {tab === 'volunteers' && <NotesForm id={id} notes={String(r.notes || '')} />}
            </article>
          );
        })
      )}
      {snap.size === 50 && (
        <Link
          className="button secondary mt-5"
          href={`/admin?${new URLSearchParams({ tab, cursor: snap.docs.at(-1)!.id, ...(p.status ? { status: p.status } : {}), ...(p.q ? { q: p.q } : {}) })}`}
        >
          Next 50 records
        </Link>
      )}
    </>
  );
}
async function UserDetails({ id }: { id: string }) {
  const [user, campaigns, donations] = await Promise.all([
    db().collection('users').doc(id).get(),
    db().collection('campaigns').where('organizerId', '==', id).limit(50).get(),
    db()
      .collection('donations')
      .where('donorId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get(),
  ]);
  return (
    <div className="panel">
      <h2>
        {user.data()?.firstName} {user.data()?.lastName}
      </h2>
      <p>{user.data()?.email}</p>
      <h3>Campaigns</h3>
      {campaigns.docs.map((c) => (
        <p key={c.id}>
          {c.data().title} · {c.data().status}
        </p>
      ))}
      <h3>Donation history · latest 50</h3>
      <DonationTable
        donations={serialize(donations.docs.map((d) => ({ ...d.data(), id: d.id }) as Donation))}
        admin
      />
    </div>
  );
}
