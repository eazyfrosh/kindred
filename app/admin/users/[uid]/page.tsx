import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck, Ban, CircleCheck, ShieldX } from 'lucide-react';
import { money } from '@/lib/brand';
import { getUserDetail, organizerTotals } from '@/lib/admin/users';
import { auditHistoryFor } from '@/lib/admin/audit';
import { administerUserAction } from '@/lib/admin/actions/users';
import {
  AdminPageHeader,
  DateCell,
  EmptyState,
  Panel,
  StatCard,
  StatusBadge,
  UserAvatar,
} from '@/components/admin/ui';
import { ActionButton, AdminForm, SubmitButton } from '@/components/admin/action-form';
import { INPUT, LABEL, LINK } from '@/components/admin/theme';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'User profile' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#e4e7ec] px-4 py-2.5 last:border-0">
      <dt className={LABEL}>{label}</dt>
      <dd className="text-sm text-[#101828]">{children}</dd>
    </div>
  );
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const { uid } = await params;
  const [detail, history, totals] = await Promise.all([
    getUserDetail(uid),
    auditHistoryFor('user', uid),
    organizerTotals(uid),
  ]);
  if (!detail) notFound();
  const { user, campaigns, donations, auth } = detail;
  const name = `${user.firstName} ${user.lastName}`.trim() || user.email;

  return (
    <>
      <AdminPageHeader title={name} description={user.email}>
        <StatusBadge status={user.role} />
        <StatusBadge status={user.disabled ? 'suspended' : 'approved'} />
      </AdminPageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total donated" value={money(user.totalDonated ?? 0)} />
        <StatCard label="Donations made" value={String(user.donationCount ?? 0)} />
        <StatCard label="Campaigns created" value={String(totals.campaigns)} />
        <StatCard label="Lifetime raised" value={money(totals.raised)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Panel title="Profile">
            <div className="px-4 py-3">
              <UserAvatar name={name} email={user.email} photoURL={user.photoURL} size={44} />
            </div>
            <dl className="border-t border-[#e4e7ec]">
              <Row label="User ID">
                <span className="font-mono text-xs">{user.uid}</span>
              </Row>
              <Row label="Role">
                <StatusBadge status={user.role} />
              </Row>
              <Row label="Email verified">{user.verified ? 'Yes' : 'No'}</Row>
              <Row label="Fundraiser verified">{user.fundraiserVerified ? 'Yes' : 'No'}</Row>
              <Row label="Joined">
                <DateCell value={user.createdAt} />
              </Row>
              <Row label="Last profile update">
                <DateCell value={user.updatedAt} />
              </Row>
              {auth && (
                <>
                  <Row label="Last sign-in">
                    {auth.lastSignInTime
                      ? new Date(auth.lastSignInTime).toLocaleString('en-GB')
                      : '—'}
                  </Row>
                  <Row label="Sign-in providers">{auth.providers.join(', ') || '—'}</Row>
                  <Row label="Admin custom claim">{auth.hasAdminClaim ? 'Present' : 'None'}</Row>
                </>
              )}
            </dl>
          </Panel>

          <Panel title="Campaigns created">
            {campaigns.length === 0 ? (
              <EmptyState title="No campaigns created." />
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {campaigns.map((campaign) => (
                  <li
                    key={campaign.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <Link
                      href={`/admin/campaigns/${campaign.id}`}
                      className="min-w-0 text-sm text-[#101828] hover:underline"
                    >
                      <span className="block truncate font-medium">{campaign.title}</span>
                      <span className="block truncate text-xs text-[#667085]">
                        {money(campaign.amountRaised, campaign.currency)} raised of{' '}
                        {money(campaign.goalAmount, campaign.currency)}
                      </span>
                    </Link>
                    <StatusBadge status={campaign.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Donation history">
            {donations.length === 0 ? (
              <EmptyState title="No donations made." />
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {donations.map((donation) => (
                  <li
                    key={donation.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <Link
                      href={`/admin/donations/${donation.id}`}
                      className="min-w-0 text-sm text-[#101828] hover:underline"
                    >
                      <span className="block truncate font-medium">
                        {money(donation.amount, donation.currency)}
                      </span>
                      <span className="block truncate text-xs text-[#667085]">
                        {donation.campaignTitle}
                      </span>
                    </Link>
                    <StatusBadge status={donation.paymentStatus} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Audit history">
            {history.length === 0 ? (
              <EmptyState title="No recorded decisions." />
            ) : (
              <ul className="divide-y divide-[#e4e7ec]">
                {history.map((entry) => (
                  <li key={entry.id} className="px-4 py-2.5">
                    <p className="text-sm text-[#101828]">{entry.description}</p>
                    <p className="text-xs text-[#667085]">
                      {entry.adminEmail} · {new Date(entry.createdAt).toLocaleString('en-GB')}
                    </p>
                    {typeof entry.metadata?.reason === 'string' && entry.metadata.reason && (
                      <p className="mt-1 text-xs italic text-[#667085]">
                        “{entry.metadata.reason}”
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <aside className="space-y-4">
          <Panel title="Role" description="Changing a role revokes existing sessions immediately.">
            <div className="flex flex-wrap gap-2 p-4">
              {(['user', 'fundraiser', 'admin'] as const)
                .filter((role) => role !== user.role)
                .map((role) => (
                  <ActionButton
                    key={role}
                    action={administerUserAction}
                    fields={{ uid: user.uid, action: 'role', role }}
                    label={`Make ${role}`}
                    confirm={{
                      title: `Change role to ${role}?`,
                      description:
                        role === 'admin'
                          ? 'This grants full administrative access to the platform.'
                          : 'The account signs in again with the new permissions.',
                      reasonLabel: 'Reason for the change',
                    }}
                  />
                ))}
            </div>
          </Panel>

          <Panel title="Verification & access">
            <div className="flex flex-wrap gap-2 p-4">
              {user.fundraiserVerified ? (
                <ActionButton
                  action={administerUserAction}
                  fields={{ uid: user.uid, action: 'revokeFundraiser' }}
                  label="Revoke verification"
                  icon={<ShieldX size={14} />}
                  variant="danger"
                  confirm={{
                    title: 'Revoke fundraiser verification?',
                    reasonLabel: 'Reason',
                  }}
                />
              ) : (
                <ActionButton
                  action={administerUserAction}
                  fields={{ uid: user.uid, action: 'verifyFundraiser' }}
                  label="Verify fundraiser"
                  icon={<BadgeCheck size={14} />}
                />
              )}
              {user.disabled ? (
                <ActionButton
                  action={administerUserAction}
                  fields={{ uid: user.uid, action: 'reactivate' }}
                  label="Reactivate account"
                  icon={<CircleCheck size={14} />}
                  confirm={{ title: 'Reactivate this account?' }}
                />
              ) : (
                <ActionButton
                  action={administerUserAction}
                  fields={{ uid: user.uid, action: 'suspend' }}
                  label="Suspend access"
                  icon={<Ban size={14} />}
                  variant="danger"
                  confirm={{
                    title: 'Suspend platform access?',
                    description: 'The account is signed out everywhere and cannot sign back in.',
                    reasonLabel: 'Reason for suspension',
                  }}
                />
              )}
            </div>
            <p className="border-t border-[#e4e7ec] px-4 py-2.5 text-xs text-[#667085]">
              Authentication passwords cannot be viewed or changed from the admin dashboard. Ask the
              account holder to use the{' '}
              <Link href="/forgot-password" className={LINK}>
                password reset
              </Link>{' '}
              flow.
            </p>
          </Panel>

          <Panel title="Internal notes">
            <AdminForm action={administerUserAction} className="space-y-3 p-4">
              <input type="hidden" name="uid" value={user.uid} />
              <input type="hidden" name="action" value="notes" />
              <label className="block">
                <span className="sr-only">Internal notes</span>
                <textarea
                  name="notes"
                  rows={5}
                  maxLength={5000}
                  defaultValue={user.adminNotes || ''}
                  placeholder="Visible to administrators only."
                  className={INPUT}
                />
              </label>
              <SubmitButton>Save notes</SubmitButton>
            </AdminForm>
          </Panel>
        </aside>
      </div>
    </>
  );
}
