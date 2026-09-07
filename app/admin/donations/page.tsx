import Link from 'next/link';
import { Eye } from 'lucide-react';
import { listDonations } from '@/lib/admin/donations';
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
import type { Donation } from '@/types';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Donations' };

export default async function AdminDonationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await listDonations(params);

  const columns: Column<Donation>[] = [
    {
      key: 'reference',
      header: 'Transaction',
      cell: (row) => (
        <Link href={`/admin/donations/${row.id}`} className="font-mono text-xs hover:underline">
          {row.id}
        </Link>
      ),
    },
    {
      key: 'donor',
      header: 'Donor',
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block truncate text-sm font-medium text-[#101828]">
            {row.anonymous ? 'Anonymous supporter' : row.donorName}
          </span>
          <span className="block truncate text-xs text-[#667085]">{row.donorEmail}</span>
        </span>
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
      header: 'Amount',
      align: 'right',
      cell: (row) => <Money amount={row.amount} currency={row.currency} />,
    },
    { key: 'currency', header: 'Currency', secondary: true, cell: (row) => row.currency },
    { key: 'provider', header: 'Provider', secondary: true, cell: (row) => row.paymentProvider },
    {
      key: 'providerRef',
      header: 'Payment reference',
      secondary: true,
      cell: (row) => (
        <span className="font-mono text-xs">
          {row.providerTransactionId || row.paymentReference || '—'}
        </span>
      ),
    },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.paymentStatus} /> },
    {
      key: 'anonymous',
      header: 'Anonymous',
      secondary: true,
      cell: (row) => (row.anonymous ? 'Yes' : 'No'),
    },
    { key: 'date', header: 'Date', cell: (row) => <DateCell value={row.createdAt} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <Link href={`/admin/donations/${row.id}`} className={`${BUTTON_SECONDARY} !py-1 !text-xs`}>
          <Eye size={13} /> View
        </Link>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Donations"
        description="Every donation intent and settled payment. Successful states come only from verified provider webhooks."
      />
      <FilterBar
        searchPlaceholder="Search donor, campaign or reference…"
        dateRange
        selects={[
          {
            name: 'status',
            label: 'Status',
            options: ['pending', 'successful', 'failed', 'refunded', 'disputed'].map((value) => ({
              value,
              label: value,
            })),
          },
          {
            name: 'provider',
            label: 'Provider',
            options: ['stripe', 'paystack', 'flutterwave'].map((value) => ({
              value,
              label: value,
            })),
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
