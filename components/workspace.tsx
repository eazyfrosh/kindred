import Link from 'next/link';
import {
  LayoutDashboard,
  Heart,
  Flag,
  Users,
  MessageSquare,
  Settings,
  HandHeart,
  Bell,
  Bookmark,
} from 'lucide-react';
import { money } from '@/lib/brand';
import type { Donation } from '@/types';
export function Workspace({
  admin = false,
  tab,
  children,
}: {
  admin?: boolean;
  tab: string;
  children: React.ReactNode;
}) {
  const items = admin
    ? [
        ['overview', 'Overview', LayoutDashboard],
        ['campaigns', 'Campaigns', Flag],
        ['donations', 'Donations', Heart],
        ['payments', 'Payment reviews', Heart],
        ['payment-methods', 'Payment methods', Settings],
        ['users', 'People', Users],
        ['volunteers', 'Volunteers', HandHeart],
        ['messages', 'Messages', MessageSquare],
        ['comments', 'Comments', MessageSquare],
        ['content', 'Website content', Settings],
      ]
    : [
        ['overview', 'Overview', LayoutDashboard],
        ['donations', 'My donations', Heart],
        ['campaigns', 'My fundraisers', Flag],
        ['saved', 'Saved causes', Bookmark],
        ['notifications', 'Notifications', Bell],
        ['settings', 'Account settings', Settings],
      ];
  return (
    <div className="container workspace">
      <div className="workspace-grid">
        <aside
          className="sidebar"
          aria-label={admin ? 'Administrator navigation' : 'Account navigation'}
        >
          {items.map(([id, title, I]) => {
            const Icon = I as typeof Heart;
            return (
              <Link
                key={String(id)}
                className={tab === id ? 'active' : ''}
                href={
                  admin && ['payments', 'payment-methods'].includes(String(id))
                    ? `/admin/${id}`
                    : `${admin ? '/admin' : '/dashboard'}?tab=${id}`
                }
              >
                <Icon size={17} />
                {String(title)}
              </Link>
            );
          })}
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
export function DonationTable({
  donations,
  admin = false,
}: {
  donations: Donation[];
  admin?: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Campaign / donor</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Date</th>
            <th>{admin ? 'Reference' : 'Receipt'}</th>
          </tr>
        </thead>
        <tbody>
          {donations.map((d) => (
            <tr key={d.id}>
              <td>
                <strong>{d.campaignTitle}</strong>
                {admin && (
                  <>
                    <br />
                    {d.donorName}
                    <br />
                    <span className="small muted">
                      {d.donorEmail}
                      {d.anonymous ? ' · Anonymous publicly' : ''}
                    </span>
                  </>
                )}
              </td>
              <td>
                {money(d.amount, d.currency)}
                {!!d.refundedMinor && (
                  <div className="small muted">
                    {money(d.refundedMinor / 100, d.currency)} refunded
                  </div>
                )}
              </td>
              <td>
                <span className={`status ${d.paymentStatus}`}>{d.paymentStatus}</span>
              </td>
              <td>{d.paymentProvider}</td>
              <td>{new Date(d.createdAt).toLocaleDateString()}</td>
              <td>
                {admin ? (
                  <span className="small">{d.paymentReference}</span>
                ) : d.paymentStatus === 'successful' ? (
                  <Link className="text-link" href={`/donation/success?reference=${d.id}`}>
                    Receipt ↗
                  </Link>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function BarChart({
  data,
  label,
}: {
  data: { label: string; value: number }[];
  label: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      className="bar-chart"
      role="img"
      aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}
    >
      {data.map((d, i) => (
        <div className="bar-column" key={`${d.label}-${i}`}>
          <strong>{d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
          <div className="bar" style={{ height: `${(d.value / max) * 130}px` }} />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  );
}
