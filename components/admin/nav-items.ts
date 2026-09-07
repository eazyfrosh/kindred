import {
  BadgeCheck,
  Bell,
  FileClock,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Send,
  MessageSquareQuote,
  Megaphone,
  Settings,
  Sprout,
  Users,
  Wallet,
} from 'lucide-react';

export interface AdminNavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Marks the badge counter the topbar and sidebar read for this item. */
  badge?: 'pendingCampaigns' | 'pendingPayouts' | 'unreadMessages';
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone, badge: 'pendingCampaigns' },
  { href: '/admin/donations', label: 'Donations', icon: HeartHandshake },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/fundraisers', label: 'Fundraisers', icon: BadgeCheck },
  { href: '/admin/payouts', label: 'Withdrawals', icon: Wallet, badge: 'pendingPayouts' },
  { href: '/admin/volunteers', label: 'Volunteers', icon: Sprout },
  { href: '/admin/messages', label: 'Contact messages', icon: Mail, badge: 'unreadMessages' },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Send },
  { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { href: '/admin/partners', label: 'Partners', icon: Handshake },
  { href: '/admin/content', label: 'Homepage content', icon: LayoutTemplate },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  { href: '/admin/audit-logs', label: 'Audit logs', icon: FileClock },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export type AdminBadgeCounts = Partial<Record<NonNullable<AdminNavItem['badge']>, number>>;
