import { Trash } from 'lucide-react';
import { listMessages } from '@/lib/admin/submissions';
import { messageAction } from '@/lib/admin/actions/submissions';
import {
  AdminPageHeader,
  Column,
  DataTable,
  DateCell,
  Panel,
  StatusBadge,
} from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filters';
import { ActionButton } from '@/components/admin/action-form';
import type { ContactMessage } from '@/types/admin';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Contact messages' };

const STATUSES = ['unread', 'read', 'resolved'];

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await listMessages(params);
  const selected = params.open ? rows.find((row) => row.id === params.open) : undefined;

  const columns: Column<ContactMessage>[] = [
    {
      key: 'sender',
      header: 'Sender',
      cell: (row) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-[#101828]">{row.name}</span>
          <span className="block truncate text-xs text-[#667085]">{row.email}</span>
        </span>
      ),
    },
    { key: 'subject', header: 'Subject', cell: (row) => row.subject },
    {
      key: 'preview',
      header: 'Message',
      secondary: true,
      cell: (row) => <span className="line-clamp-2 max-w-md text-[#667085]">{row.message}</span>,
    },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    { key: 'date', header: 'Received', cell: (row) => <DateCell value={row.createdAt} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (row) => (
        <span className="flex flex-wrap justify-end gap-1.5">
          <a
            href={`?open=${row.id}`}
            className="rounded-md border border-[#d0d5dd] bg-white px-2 py-1 text-xs font-medium text-[#344054] hover:bg-[#f9fafb]"
          >
            Read
          </a>
          {STATUSES.filter((status) => status !== row.status).map((status) => (
            <ActionButton
              key={status}
              action={messageAction}
              fields={{ id: row.id, action: 'status', status }}
              label={`Mark ${status}`}
              className="!px-2 !py-1 !text-xs"
            />
          ))}
          <ActionButton
            action={messageAction}
            fields={{ id: row.id, action: 'delete' }}
            label="Delete"
            icon={<Trash size={12} />}
            variant="danger"
            className="!px-2 !py-1 !text-xs"
            confirm={{ title: 'Delete this message?', confirmLabel: 'Delete' }}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader title="Contact messages" description="Your community inbox." />
      <FilterBar
        searchPlaceholder="Search sender, subject or message…"
        selects={[
          {
            name: 'status',
            label: 'Status',
            options: STATUSES.map((v) => ({ value: v, label: v })),
          },
        ]}
      />
      {selected && (
        <Panel
          title={selected.subject}
          description={`${selected.name} · ${selected.email}`}
          className="mb-4"
        >
          <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-6 text-[#475467]">
            {selected.message}
          </p>
        </Panel>
      )}
      <DataTable columns={columns} rows={rows} getKey={(row) => row.id} />
      <Pagination nextCursor={nextCursor} count={rows.length} />
    </>
  );
}
