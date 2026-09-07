import { Download, Trash } from 'lucide-react';
import { listSubscribers } from '@/lib/admin/submissions';
import { subscriberAction } from '@/lib/admin/actions/submissions';
import { AdminPageHeader, Column, DataTable, DateCell, StatusBadge } from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filters';
import { ActionButton } from '@/components/admin/action-form';
import { BUTTON_SECONDARY } from '@/components/admin/theme';
import type { NewsletterSubscriber } from '@/types/admin';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Newsletter' };

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await listSubscribers(params);

  const columns: Column<NewsletterSubscriber>[] = [
    {
      key: 'email',
      header: 'Email',
      cell: (row) => <span className="font-medium text-[#101828]">{row.email}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status || 'subscribed'} />,
    },
    {
      key: 'consent',
      header: 'Consent',
      secondary: true,
      cell: (row) => (row.consent ? 'Given' : 'Not recorded'),
    },
    { key: 'created', header: 'Signed up', cell: (row) => <DateCell value={row.createdAt} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <ActionButton
          action={subscriberAction}
          fields={{ id: row.id }}
          label="Remove"
          icon={<Trash size={12} />}
          variant="danger"
          className="!px-2 !py-1 !text-xs"
          confirm={{
            title: 'Remove this subscriber?',
            description: 'They will stop receiving updates from this list.',
            confirmLabel: 'Remove',
          }}
        />
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Newsletter"
        description="Subscribers who opted in from the public site."
      >
        <a href="/api/admin/newsletter/export" className={BUTTON_SECONDARY} download>
          <Download size={15} /> Export CSV
        </a>
      </AdminPageHeader>
      <FilterBar searchPlaceholder="Search email address…" />
      <DataTable columns={columns} rows={rows} getKey={(row) => row.id} />
      <Pagination nextCursor={nextCursor} count={rows.length} />
      <p className="mt-3 text-xs text-[#667085]">
        Sending campaigns is intentionally not built in — export the list into the email provider
        you already use, so consent and unsubscribe handling stay in one system.
      </p>
    </>
  );
}
