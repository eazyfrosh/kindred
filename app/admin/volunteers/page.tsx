import { Trash } from 'lucide-react';
import { listVolunteers } from '@/lib/admin/submissions';
import { volunteerAction } from '@/lib/admin/actions/submissions';
import {
  AdminPageHeader,
  Column,
  DataTable,
  DateCell,
  Panel,
  StatusBadge,
} from '@/components/admin/ui';
import { FilterBar, Pagination } from '@/components/admin/filters';
import { ActionButton, AdminForm, SubmitButton } from '@/components/admin/action-form';
import { INPUT } from '@/components/admin/theme';
import type { VolunteerApplication } from '@/types/admin';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Volunteers' };

const STATUSES = ['new', 'reviewing', 'accepted', 'rejected'];

export default async function AdminVolunteersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const { rows, nextCursor } = await listVolunteers(params);
  const selected = params.open ? rows.find((row) => row.id === params.open) : undefined;

  const columns: Column<VolunteerApplication>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (row) => <span className="font-medium text-[#101828]">{row.name}</span>,
    },
    { key: 'email', header: 'Email', cell: (row) => row.email },
    { key: 'phone', header: 'Phone', secondary: true, cell: (row) => row.phone },
    { key: 'country', header: 'Country', secondary: true, cell: (row) => row.country },
    { key: 'interest', header: 'Interest', secondary: true, cell: (row) => row.interest },
    { key: 'status', header: 'Status', cell: (row) => <StatusBadge status={row.status} /> },
    { key: 'applied', header: 'Applied', cell: (row) => <DateCell value={row.createdAt} /> },
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
            View
          </a>
          {STATUSES.filter((status) => status !== row.status).map((status) => (
            <ActionButton
              key={status}
              action={volunteerAction}
              fields={{ id: row.id, action: 'status', status }}
              label={status}
              className="!px-2 !py-1 !text-xs capitalize"
            />
          ))}
          <ActionButton
            action={volunteerAction}
            fields={{ id: row.id, action: 'delete' }}
            label="Delete"
            icon={<Trash size={12} />}
            variant="danger"
            className="!px-2 !py-1 !text-xs"
            confirm={{
              title: 'Delete this application?',
              description: 'This permanently removes the volunteer application.',
              confirmLabel: 'Delete',
            }}
          />
        </span>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Volunteer applications"
        description="People offering their time. Change status, add internal notes, or remove an application."
      />
      <FilterBar
        searchPlaceholder="Search name, email or country…"
        selects={[
          {
            name: 'status',
            label: 'Status',
            options: STATUSES.map((v) => ({ value: v, label: v })),
          },
        ]}
      />
      {selected && (
        <Panel title={`Application from ${selected.name}`} className="mb-4">
          <div className="space-y-3 p-4 text-sm text-[#475467]">
            <p>
              <strong className="text-[#101828]">Contact:</strong> {selected.email} ·{' '}
              {selected.phone} · {selected.country}
            </p>
            <p>
              <strong className="text-[#101828]">Interest:</strong> {selected.interest}
            </p>
            <p>
              <strong className="text-[#101828]">Skills:</strong> {selected.skills}
            </p>
            <p className="whitespace-pre-wrap">{selected.message}</p>
            <AdminForm
              action={volunteerAction}
              className="space-y-2 border-t border-[#e4e7ec] pt-3"
            >
              <input type="hidden" name="id" value={selected.id} />
              <input type="hidden" name="action" value="notes" />
              <label className="block">
                <span className="sr-only">Internal notes</span>
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={5000}
                  defaultValue={selected.notes || ''}
                  placeholder="Internal notes"
                  className={INPUT}
                />
              </label>
              <SubmitButton>Save notes</SubmitButton>
            </AdminForm>
          </div>
        </Panel>
      )}
      <DataTable columns={columns} rows={rows} getKey={(row) => row.id} />
      <Pagination nextCursor={nextCursor} count={rows.length} />
    </>
  );
}
