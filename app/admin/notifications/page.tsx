import Link from 'next/link';
import { CircleCheck } from 'lucide-react';
import { listAdminNotifications } from '@/lib/admin/notifications';
import { notificationAction } from '@/lib/admin/actions/submissions';
import { AdminPageHeader, EmptyState, Panel } from '@/components/admin/ui';
import { ActionButton } from '@/components/admin/action-form';
import { Pagination } from '@/components/admin/filters';
import { requireAdminPage } from '@/lib/admin/auth';

export const metadata = { title: 'Notifications' };

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string; filter?: string }>;
}) {
  // Re-authorized per route: the segment layout guards navigation, and this
  // guard makes sure no privileged query runs for an unauthorized visitor.
  await requireAdminPage();
  const params = await searchParams;
  const unreadOnly = params.filter === 'unread';
  const { rows, nextCursor } = await listAdminNotifications({
    unread: unreadOnly,
    cursor: params.cursor,
  });

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        description="System events raised by the platform: submissions, large gifts, payout requests and goals reached."
      >
        <Link
          href={unreadOnly ? '/admin/notifications' : '/admin/notifications?filter=unread'}
          className="rounded-md border border-[#d0d5dd] bg-white px-3 py-2 text-sm font-medium text-[#344054] hover:bg-[#f9fafb]"
        >
          {unreadOnly ? 'Show all' : 'Show unread only'}
        </Link>
        <ActionButton
          action={notificationAction}
          fields={{ action: 'all' }}
          label="Mark all as read"
          icon={<CircleCheck size={14} />}
          variant="primary"
        />
      </AdminPageHeader>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState
            title={unreadOnly ? 'Nothing unread.' : 'No notifications yet.'}
            description="Platform events will appear here as they happen."
          />
        ) : (
          <ul className="divide-y divide-[#e4e7ec]">
            {rows.map((notification) => (
              <li
                key={notification.id}
                className={`flex flex-wrap items-start justify-between gap-3 px-4 py-3 ${
                  notification.read ? '' : 'bg-[#f8faff]'
                }`}
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-[#101828]">
                    {!notification.read && (
                      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#193be0]" />
                    )}
                    {notification.href ? (
                      <Link href={notification.href} className="hover:underline">
                        {notification.title}
                      </Link>
                    ) : (
                      notification.title
                    )}
                    {!notification.read && <span className="sr-only">(unread)</span>}
                  </p>
                  <p className="text-sm text-[#667085]">{notification.message}</p>
                  <p className="text-xs text-[#98a2b3]">
                    {new Date(notification.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
                <ActionButton
                  action={notificationAction}
                  fields={{ id: notification.id, action: notification.read ? 'unread' : 'read' }}
                  label={notification.read ? 'Mark unread' : 'Mark read'}
                  className="!px-2 !py-1 !text-xs"
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Pagination nextCursor={nextCursor} count={rows.length} />
    </>
  );
}
