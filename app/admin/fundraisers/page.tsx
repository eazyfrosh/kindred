import Link from 'next/link';
import { BadgeCheck, Eye } from 'lucide-react';
import { fundraiserSummary } from '@/lib/admin/users';
import { administerUserAction } from '@/lib/admin/actions/users';
import {
  AdminPageHeader,
  Column,
  DataTable,
  DateCell,
  Money,
  StatusBadge,
  UserAvatar,
} from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filters';
import { ActionButton } from '@/components/admin/action-form';
import { BUTTON_SECONDARY } from '@/components/admin/theme';
import type { AdminUserRow } from '@/lib/admin/users';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Fundraisers' };

type FundraiserRow = AdminUserRow & { activeCampaigns: number };

export default async function AdminFundraisersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await fundraiserSummary(params);

  const columns: Column<FundraiserRow>[] = [
    {
      key: 'user',
      header: 'Fundraiser',
      cell: (row) => (
        <UserAvatar
          name={`${row.firstName} ${row.lastName}`.trim() || row.email}
          email={row.email}
          photoURL={row.photoURL}
          href={`/admin/users/${row.uid}`}
        />
      ),
    },
    {
      key: 'verification',
      header: 'Verification',
      cell: (row) => <StatusBadge status={row.fundraiserVerified ? 'approved' : 'pending'} />,
    },
    {
      key: 'active',
      header: 'Active campaigns',
      align: 'right',
      cell: (row) => <span className="tabular-nums">{row.activeCampaigns}</span>,
    },
    {
      key: 'raised',
      header: 'Lifetime raised',
      align: 'right',
      secondary: true,
      cell: (row) => <Money amount={row.totalDonated ?? 0} />,
    },
    {
      key: 'payout',
      header: 'Payout details',
      secondary: true,
      cell: (row) => (
        <Link
          href={`/admin/payouts?q=${encodeURIComponent(row.email)}`}
          className="hover:underline"
        >
          View requests
        </Link>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      cell: (row) => <StatusBadge status={row.disabled ? 'suspended' : 'approved'} />,
    },
    {
      key: 'joined',
      header: 'Joined',
      secondary: true,
      cell: (row) => <DateCell value={row.createdAt} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <span className="flex justify-end gap-2">
          {!row.fundraiserVerified && (
            <ActionButton
              action={administerUserAction}
              fields={{ uid: row.uid, action: 'verifyFundraiser' }}
              label="Verify"
              icon={<BadgeCheck size={13} />}
              className="!py-1 !text-xs"
            />
          )}
          <Link href={`/admin/users/${row.uid}`} className={`${BUTTON_SECONDARY} !py-1 !text-xs`}>
            <Eye size={13} /> Open
          </Link>
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Fundraisers"
        description="Organizers who can raise funds. Verification, suspension, and notes are managed on each profile."
      />
      <FilterBar
        searchPlaceholder="Search fundraiser name or email…"
        selects={[
          {
            name: 'verified',
            label: 'Email verified',
            options: [
              { value: 'true', label: 'Verified' },
              { value: 'false', label: 'Unverified' },
            ],
          },
        ]}
      />
      <DataTable columns={columns} rows={rows as FundraiserRow[]} getKey={(row) => row.uid} />
      <Pagination nextCursor={nextCursor} count={rows.length} />
      <p className="mt-3 text-xs text-[#667085]">
        Verification documents are stored under the private `organizations/&lt;uid&gt;` Storage path
        and are only released through a reviewed server request.
      </p>
    </>
  );
}
