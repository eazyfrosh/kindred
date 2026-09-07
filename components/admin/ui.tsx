import Link from 'next/link';
import Image from 'next/image';
import { ArrowDownRight, ArrowUpRight, Inbox, TriangleAlert } from 'lucide-react';
import { money, percent } from '@/lib/brand';
import { CARD, PANEL_HEADING, TABLE_CELL, TABLE_HEAD } from './theme';

export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold leading-7 tracking-tight text-[#101828] sm:text-2xl">
          {title}
        </h1>
        {description && <p className="mt-1 text-sm leading-5 text-[#667085]">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  hint,
}: {
  label: string;
  value: string;
  change?: number | null;
  changeLabel?: string;
  hint?: string;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className={`${CARD} p-4`}>
      <p className="truncate text-xs font-medium uppercase tracking-wide text-[#667085]">{label}</p>
      <p className="mt-2 text-[22px] font-semibold leading-7 tracking-tight text-[#101828]">
        {value}
      </p>
      {change !== null && change !== undefined ? (
        <p
          className={`mt-1.5 flex items-center gap-1 text-xs font-medium ${positive ? 'text-[#067647]' : 'text-[#b42318]'}`}
        >
          {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
          {Math.abs(change)}%
          <span className="font-normal text-[#667085]">{changeLabel || 'vs previous period'}</span>
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[#667085]">{hint}</p>
      ) : null}
    </div>
  );
}

export function ChartCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={`${CARD} flex min-w-0 flex-col p-4`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={PANEL_HEADING}>{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-5 text-[#667085]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = '',
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`${CARD} ${className}`}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#e4e7ec] px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className={PANEL_HEADING}>{title}</h2>}
            {description && (
              <p className="mt-0.5 text-xs leading-5 text-[#667085]">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  approved: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
  successful: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
  paid: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
  accepted: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
  resolved: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
  subscribed: 'bg-[#ecfdf3] text-[#067647] border-[#abefc6]',
  completed: 'bg-[#eff8ff] text-[#175cd3] border-[#b2ddff]',
  processing: 'bg-[#eff8ff] text-[#175cd3] border-[#b2ddff]',
  reviewing: 'bg-[#eff8ff] text-[#175cd3] border-[#b2ddff]',
  under_review: 'bg-[#eff8ff] text-[#175cd3] border-[#b2ddff]',
  read: 'bg-[#eff8ff] text-[#175cd3] border-[#b2ddff]',
  pending: 'bg-[#fffaeb] text-[#b54708] border-[#fedf89]',
  requested: 'bg-[#fffaeb] text-[#b54708] border-[#fedf89]',
  new: 'bg-[#fffaeb] text-[#b54708] border-[#fedf89]',
  unread: 'bg-[#fffaeb] text-[#b54708] border-[#fedf89]',
  disputed: 'bg-[#fffaeb] text-[#b54708] border-[#fedf89]',
  rejected: 'bg-[#fef3f2] text-[#b42318] border-[#fecdca]',
  failed: 'bg-[#fef3f2] text-[#b42318] border-[#fecdca]',
  suspended: 'bg-[#fef3f2] text-[#b42318] border-[#fecdca]',
  cancelled: 'bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]',
  refunded: 'bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]',
  draft: 'bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]',
};

export function StatusBadge({ status }: { status: string }) {
  const key = String(status || '').toLowerCase();
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize leading-4 ${
        STATUS_STYLES[key] || 'bg-[#f2f4f7] text-[#475467] border-[#e4e7ec]'
      }`}
    >
      {key.replace(/_/g, ' ') || 'unknown'}
    </span>
  );
}

export function UserAvatar({
  name,
  email,
  photoURL,
  size = 32,
  href,
}: {
  name: string;
  email?: string;
  photoURL?: string;
  size?: number;
  href?: string;
}) {
  const initials =
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  const body = (
    <span className="flex min-w-0 items-center gap-2.5">
      {photoURL ? (
        <Image
          src={photoURL}
          alt=""
          width={size}
          height={size}
          className="shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          style={{ width: size, height: size }}
          className="flex shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[11px] font-semibold text-[#193be0]"
        >
          {initials}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[#101828]">{name || '—'}</span>
        {email && <span className="block truncate text-xs text-[#667085]">{email}</span>}
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="hover:underline">
      {body}
    </Link>
  ) : (
    body
  );
}

export function CampaignPreview({
  id,
  title,
  category,
  coverImage,
  organizerName,
}: {
  id: string;
  title: string;
  category?: string;
  coverImage?: string;
  organizerName?: string;
}) {
  return (
    <Link href={`/admin/campaigns/${id}`} className="flex min-w-0 items-center gap-3 group">
      <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded bg-[#f2f4f7]">
        {coverImage ? (
          <Image src={coverImage} alt="" fill sizes="48px" className="object-cover" />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[#101828] group-hover:underline">
          {title}
        </span>
        <span className="block truncate text-xs text-[#667085]">
          {[category, organizerName].filter(Boolean).join(' · ')}
        </span>
      </span>
    </Link>
  );
}

export function ProgressBar({ raised, goal }: { raised: number; goal: number }) {
  const value = percent(raised, goal);
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e4e7ec]">
        <span
          className="block h-full rounded-full bg-[#193be0]"
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Funding progress"
        />
      </span>
      <span className="text-xs tabular-nums text-[#475467]">{value}%</span>
    </span>
  );
}

export function EmptyState({
  title = 'Nothing here yet.',
  description,
  children,
}: {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f4f7] text-[#98a2b3]">
        <Inbox size={18} />
      </span>
      <p className="text-sm font-medium text-[#101828]">{title}</p>
      {description && <p className="max-w-md text-sm text-[#667085]">{description}</p>}
      {children}
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-lg border border-[#fecdca] bg-[#fef3f2] px-4 py-3"
    >
      <TriangleAlert size={17} className="mt-0.5 shrink-0 text-[#b42318]" />
      <div>
        <p className="text-sm font-medium text-[#912018]">{title}</p>
        {description && <p className="mt-0.5 text-sm text-[#b42318]">{description}</p>}
      </div>
    </div>
  );
}

/** Skeleton rows shown while a table's data resolves on the server. */
export function LoadingTable({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="animate-pulse divide-y divide-[#e4e7ec]">
        <div className="flex gap-4 bg-[#f9fafb] px-4 py-3">
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="h-3 flex-1 rounded bg-[#e4e7ec]" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, index) => (
              <div key={index} className="h-3 flex-1 rounded bg-[#f2f4f7]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Secondary columns collapse away on small screens; the rest stay visible. */
  secondary?: boolean;
  align?: 'left' | 'right';
}

export function DataTable<T>({
  columns,
  rows,
  getKey,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  getKey: (row: T) => string;
  empty?: React.ReactNode;
}) {
  if (rows.length === 0)
    return <div className={`${CARD}`}>{empty || <EmptyState title="No matching records." />}</div>;
  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead className="bg-[#f9fafb]">
            <tr className="border-b border-[#e4e7ec]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${TABLE_HEAD} ${column.align === 'right' ? 'text-right' : ''} ${
                    column.secondary ? 'hidden lg:table-cell' : ''
                  }`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e4e7ec]">
            {rows.map((row) => (
              <tr key={getKey(row)} className="hover:bg-[#f9fafb]">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`${TABLE_CELL} ${column.align === 'right' ? 'text-right' : ''} ${
                      column.secondary ? 'hidden lg:table-cell' : ''
                    }`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Money({ amount, currency }: { amount: number; currency?: string }) {
  return <span className="tabular-nums">{money(amount || 0, currency || 'USD')}</span>;
}

export function DateCell({ value }: { value?: string }) {
  if (!value) return <span className="text-[#98a2b3]">—</span>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span className="text-[#98a2b3]">—</span>;
  return (
    <time dateTime={value} className="whitespace-nowrap text-sm text-[#475467]">
      {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
    </time>
  );
}
