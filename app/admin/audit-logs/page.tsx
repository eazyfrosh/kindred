import Link from 'next/link';
import { listAuditLogs } from '@/lib/admin/audit';
import { AdminPageHeader, Column, DataTable, Panel } from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filters';
import type { AuditLog } from '@/types/admin';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Audit logs' };

const TARGET_LINKS: Record<string, (id: string) => string> = {
  campaign: (id) => `/admin/campaigns/${id}`,
  user: (id) => `/admin/users/${id}`,
  donation: (id) => `/admin/donations/${id}`,
  payout: (id) => `/admin/payouts/${id}`,
};

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await listAuditLogs(params);

  const columns: Column<AuditLog>[] = [
    {
      key: 'when',
      header: 'When',
      cell: (row) => (
        <time dateTime={row.createdAt} className="whitespace-nowrap text-xs">
          {new Date(row.createdAt).toLocaleString('en-GB')}
        </time>
      ),
    },
    {
      key: 'admin',
      header: 'Administrator',
      cell: (row) => <span className="text-sm text-[#101828]">{row.adminEmail}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      cell: (row) => <span className="font-mono text-xs">{row.action}</span>,
    },
    {
      key: 'target',
      header: 'Target',
      secondary: true,
      cell: (row) => {
        const link = TARGET_LINKS[row.targetType];
        return link ? (
          <Link href={link(row.targetId)} className="font-mono text-xs hover:underline">
            {row.targetType}/{row.targetId}
          </Link>
        ) : (
          <span className="font-mono text-xs">
            {row.targetType}/{row.targetId}
          </span>
        );
      },
    },
    { key: 'description', header: 'Description', cell: (row) => row.description },
    {
      key: 'reason',
      header: 'Reason',
      secondary: true,
      cell: (row) =>
        typeof row.metadata?.reason === 'string' && row.metadata.reason ? (
          <span className="line-clamp-2 max-w-xs text-xs italic">{row.metadata.reason}</span>
        ) : (
          '—'
        ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Audit logs"
        description="An append-only record of every sensitive administrator action."
      />
      <Panel className="mb-4">
        <p className="px-4 py-2.5 text-xs leading-5 text-[#667085]">
          Audit entries are written by server actions only. They cannot be edited or deleted from
          this dashboard, and Firestore rules deny all client writes to the collection.
        </p>
      </Panel>
      <FilterBar
        searchPlaceholder="Search administrator, description or target…"
        dateRange
        selects={[
          {
            name: 'targetType',
            label: 'Target',
            options: [
              'campaign',
              'user',
              'donation',
              'payout',
              'settings',
              'content',
              'testimonial',
              'partner',
              'volunteer',
              'message',
              'subscriber',
            ].map((value) => ({ value, label: value })),
          },
        ]}
      />
      <DataTable columns={columns} rows={rows} getKey={(row) => row.id} />
      <Pagination nextCursor={nextCursor} count={rows.length} />
    </>
  );
}
