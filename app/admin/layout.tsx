import type { Metadata } from 'next';
import { db } from '@/firebase/admin';
import { requireAdminPage } from '@/lib/admin/auth';
import { countOf } from '@/lib/admin/query';
import { unreadNotificationCount } from '@/lib/admin/notifications';
import { AdminShell } from '@/components/admin/shell';
import './admin.css';

export const metadata: Metadata = {
  title: { default: 'Administration', template: '%s · Kindred Admin' },
  robots: { index: false, follow: false },
};

// Admin pages read the signed session cookie, so they are always request-time.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Server-side authorization for the whole /admin segment. Unauthorized
  // visitors are redirected before any admin data is fetched or rendered.
  const admin = await requireAdminPage();
  const [pendingCampaigns, pendingPayouts, unreadMessages, unreadNotifications] = await Promise.all(
    [
      countOf(db().collection('campaigns').where('status', '==', 'pending')),
      countOf(db().collection('payouts').where('status', '==', 'requested')),
      countOf(db().collection('contactMessages').where('status', '==', 'unread')),
      unreadNotificationCount(),
    ],
  );
  return (
    <AdminShell
      admin={{ name: admin.displayName, email: admin.email, photoURL: admin.photoURL }}
      badges={{ pendingCampaigns, pendingPayouts, unreadMessages }}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AdminShell>
  );
}
