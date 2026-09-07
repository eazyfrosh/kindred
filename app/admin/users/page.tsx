import Link from 'next/link';
import { Eye } from 'lucide-react';
import { listUsers, type AdminUserRow } from '@/lib/admin/users';
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
import { BUTTON_SECONDARY } from '@/components/admin/theme';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Users' };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await listUsers(params);

  const columns: Column<AdminUserRow>[] = [
    {
      key: 'user',
      header: 'User',
      cell: (row) => (
        <UserAvatar
          name={`${row.firstName} ${row.lastName}`.trim() || row.email}
          email={row.email}
          photoURL={row.photoURL}
          href={`/admin/users/${row.uid}`}
        />
      ),
    },
    { key: 'role', header: 'Role', cell: (row) => <StatusBadge status={row.role} /> },
    {
      key: 'verified',
      header: 'Verification',
      secondary: true,
      cell: (row) => (
        <span className="text-xs">
          {row.verified ? 'Email verified' : 'Email unverified'}
          {row.fundraiserVerified ? ' · Fundraiser verified' : ''}
        </span>
      ),
    },
    {
      key: 'campaigns',
      header: 'Campaigns',
      align: 'right',
      secondary: true,
      cell: (row) => <span className="tabular-nums">{row.campaignCount ?? 0}</span>,
    },
    {
      key: 'donated',
      header: 'Total donated',
      align: 'right',
      cell: (row) => <Money amount={row.totalDonated ?? 0} />,
    },
    {
      key: 'status',
      header: 'Account',
      cell: (row) => <StatusBadge status={row.disabled ? 'suspended' : 'approved'} />,
    },
    { key: 'joined', header: 'Joined', cell: (row) => <DateCell value={row.createdAt} /> },
    {
      key: 'activity',
      header: 'Last activity',
      secondary: true,
      cell: (row) => <DateCell value={row.updatedAt} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Link href={`/admin/users/${row.uid}`} className={`${BUTTON_SECONDARY} !py-1 !text-xs`}>
          <Eye size={13} /> Profile
        </Link>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Search by name, email, or UID. Roles and access are changed through audited server actions."
      />
      <FilterBar
        searchPlaceholder="Search name, email or UID…"
        dateRange
        selects={[
          {
            name: 'role',
            label: 'Role',
            options: ['user', 'fundraiser', 'admin'].map((value) => ({ value, label: value })),
          },
          {
            name: 'verified',
            label: 'Verified',
            options: [
              { value: 'true', label: 'Verified' },
              { value: 'false', label: 'Unverified' },
            ],
          },
          {
            name: 'status',
            label: 'Account',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
            ],
          },
        ]}
      />
      <DataTable columns={columns} rows={rows} getKey={(row) => row.uid} />
      <Pagination nextCursor={nextCursor} count={rows.length} />
    </>
  );
}
