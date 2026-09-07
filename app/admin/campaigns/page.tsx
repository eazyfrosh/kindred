import Link from 'next/link';
import { Eye } from 'lucide-react';
import { categories } from '@/types';
import { listCampaigns } from '@/lib/admin/campaigns';
import {
  AdminPageHeader,
  CampaignPreview,
  Column,
  DataTable,
  DateCell,
  Money,
  ProgressBar,
  StatusBadge,
} from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filters';
import { BUTTON_SECONDARY } from '@/components/admin/theme';
import type { Campaign } from '@/types';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Campaigns' };

const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'suspended', 'completed'];

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await listCampaigns(params);

  const columns: Column<Campaign>[] = [
    {
      key: 'campaign',
      header: 'Campaign',
      cell: (row) => (
        <CampaignPreview
          id={row.id}
          title={row.title}
          category={row.category}
          coverImage={row.coverImage}
        />
      ),
    },
    {
      key: 'organizer',
      header: 'Organizer',
      secondary: true,
      cell: (row) => (
        <Link href={`/admin/users/${row.organizerId}`} className="hover:underline">
          {row.organizerName}
        </Link>
      ),
    },
    { key: 'category', header: 'Category', secondary: true, cell: (row) => row.category },
    {
      key: 'goal',
      header: 'Goal',
      align: 'right',
      secondary: true,
      cell: (row) => <Money amount={row.goalAmount} currency={row.currency} />,
    },
    {
      key: 'raised',
      header: 'Raised',
      align: 'right',
      cell: (row) => <Money amount={row.amountRaised} currency={row.currency} />,
    },
    {
      key: 'funding',
      header: 'Funded',
      cell: (row) => <ProgressBar raised={row.amountRaised} goal={row.goalAmount} />,
    },
    {
      key: 'donors',
      header: 'Donors',
      align: 'right',
      secondary: true,
      cell: (row) => <span className="tabular-nums">{row.donorCount || 0}</span>,
    },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'verified',
      header: 'Verified',
      secondary: true,
      cell: (row) => (row.verified ? 'Yes' : 'No'),
    },
    {
      key: 'featured',
      header: 'Featured',
      secondary: true,
      cell: (row) => (row.featured ? 'Yes' : 'No'),
    },
    {
      key: 'created',
      header: 'Created',
      secondary: true,
      cell: (row) => <DateCell value={row.createdAt} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <Link href={`/admin/campaigns/${row.id}`} className={`${BUTTON_SECONDARY} !py-1 !text-xs`}>
          <Eye size={13} /> Review
        </Link>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Campaigns"
        description="Review, verify, and moderate every fundraiser on the platform."
      />
      <FilterBar
        searchPlaceholder="Search campaign title or organizer…"
        dateRange
        selects={[
          {
            name: 'status',
            label: 'Status',
            options: STATUSES.map((value) => ({ value, label: value })),
          },
          {
            name: 'category',
            label: 'Category',
            options: categories.map((value) => ({ value, label: value })),
          },
          {
            name: 'verified',
            label: 'Verified',
            options: [
              { value: 'true', label: 'Verified' },
              { value: 'false', label: 'Not verified' },
            ],
          },
          {
            name: 'featured',
            label: 'Featured',
            options: [
              { value: 'true', label: 'Featured' },
              { value: 'false', label: 'Not featured' },
            ],
          },
          {
            name: 'sort',
            label: 'Sort',
            options: [
              { value: 'created', label: 'Newest' },
              { value: 'raised', label: 'Most raised' },
              { value: 'goal', label: 'Largest goal' },
            ],
          },
        ]}
      />
      <DataTable columns={columns} rows={rows} getKey={(row) => row.id} />
      <Pagination nextCursor={nextCursor} count={rows.length} />
    </>
  );
}
