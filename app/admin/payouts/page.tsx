import Link from 'next/link';
import { Eye } from 'lucide-react';
import { listPayouts } from '@/lib/admin/payouts';
import {
  AdminPageHeader,
  Column,
  DataTable,
  DateCell,
  Money,
  StatusBadge,
} from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filters';
import { BUTTON_SECONDARY } from '@/components/admin/theme';
import type { Payout } from '@/types/admin';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Withdrawals' };

const STATUSES = [
  'requested',
  'under_review',
  'approved',
  'processing',
  'paid',
  'rejected',
  'cancelled',
];

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await listPayouts(params);

  const columns: Column<Payout>[] = [
    {
      key: 'id',
      header: 'Payout ID',
      cell: (row) => (
        <Link href={`/admin/payouts/${row.id}`} className="font-mono text-xs hover:underline">
          {row.id}
        </Link>
      ),
    },
    {
      key: 'organizer',
      header: 'Organizer',
      cell: (row) => (
        <Link href={`/admin/users/${row.organizerId}`} className="min-w-0 hover:underline">
          <span className="block truncate text-sm font-medium text-[#101828]">
            {row.organizerName}
          </span>
          <span className="block truncate text-xs text-[#667085]">{row.organizerEmail}</span>
        </Link>
      ),
    },
    {
      key: 'campaign',
      header: 'Campaign',
      secondary: true,
      cell: (row) => (
        <Link href={`/admin/campaigns/${row.campaignId}`} className="hover:underline">
          {row.campaignTitle}
        </Link>
      ),
    },
    {
      key: 'amount',
      header: 'Requested',
      align: 'right',
      cell: (row) => <Money amount={row.amount} currency={row.currency} />,
    },
    {
      key: 'available',
      header: 'Balance at request',
      align: 'right',
      secondary: true,
      cell: (row) => <Money amount={row.availableAtRequest ?? 0} currency={row.currency} />,
    },
    { key: 'currency', header: 'Currency', secondary: true, cell: (row) => row.currency },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    { key: 'requested', header: 'Requested', cell: (row) => <DateCell value={row.requestedAt} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Link href={`/admin/payouts/${row.id}`} className={`${BUTTON_SECONDARY} !py-1 !text-xs`}>
          <Eye size={13} /> Review
        </Link>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Withdrawals & payouts"
        description="Organizer requests to receive raised funds. Every transition is validated server-side against the campaign balance."
      />
      <FilterBar
        searchPlaceholder="Search organizer or campaign…"
        dateRange
        selects={[
          {
            name: 'status',
            label: 'Status',
            options: STATUSES.map((value) => ({ value, label: value.replace('_', ' ') })),
          },
          {
            name: 'currency',
            label: 'Currency',
            options: ['USD', 'NGN', 'GBP', 'EUR'].map((value) => ({ value, label: value })),
          },
        ]}
      />
      <DataTable columns={columns} rows={rows} getKey={(row) => row.id} />
      <Pagination nextCursor={nextCursor} count={rows.length} />
    </>
  );
}
