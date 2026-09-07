'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight, ListFilter, Search, X } from 'lucide-react';
import { BUTTON, BUTTON_SECONDARY, INPUT } from './theme';

export interface FilterSelect {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}

/**
 * Filters are plain GET form fields, so every table state is a shareable URL
 * and the page still works with JavaScript disabled. Selects submit on change
 * when scripting is available.
 */
export function FilterBar({
  searchPlaceholder = 'Search…',
  selects = [],
  dateRange = false,
  children,
}: {
  searchPlaceholder?: string;
  selects?: FilterSelect[];
  dateRange?: boolean;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const active = ['q', 'status', 'from', 'to', ...selects.map((s) => s.name)].some((key) =>
    params.get(key),
  );

  return (
    <form
      ref={formRef}
      method="get"
      action={pathname}
      className="mb-4 flex flex-wrap items-end gap-2"
    >
      <div className="relative min-w-[200px] flex-1">
        <label className="sr-only" htmlFor="admin-filter-search">
          Search
        </label>
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]"
        />
        <input
          id="admin-filter-search"
          type="search"
          name="q"
          defaultValue={params.get('q') || ''}
          placeholder={searchPlaceholder}
          className={`${INPUT} pl-9`}
        />
      </div>
      {selects.map((select) => (
        <label key={select.name} className="block min-w-[150px]">
          <span className="sr-only">{select.label}</span>
          <select
            name={select.name}
            defaultValue={params.get(select.name) || ''}
            onChange={() => formRef.current?.requestSubmit()}
            className={INPUT}
          >
            <option value="">{select.label}: all</option>
            {select.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {dateRange && (
        <>
          <label className="block text-xs text-[#667085]">
            <span className="mb-1 block">From</span>
            <input
              type="date"
              name="from"
              defaultValue={params.get('from') || ''}
              className={INPUT}
            />
          </label>
          <label className="block text-xs text-[#667085]">
            <span className="mb-1 block">To</span>
            <input type="date" name="to" defaultValue={params.get('to') || ''} className={INPUT} />
          </label>
        </>
      )}
      {children}
      <button type="submit" className={BUTTON}>
        <ListFilter size={15} /> Apply
      </button>
      {active && (
        <Link href={pathname} className={BUTTON_SECONDARY}>
          <X size={15} /> Clear
        </Link>
      )}
    </form>
  );
}

/**
 * Cursor pagination controls. The trail of previous page cursors travels in the
 * URL so "previous" works without ever loading the whole collection.
 */
export function Pagination({ nextCursor, count }: { nextCursor: string | null; count: number }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const trail = (params.get('trail') || '').split(',').filter(Boolean);
  const cursor = params.get('cursor');

  function href(next: { cursor?: string | null; trail: string[] }) {
    const search = new URLSearchParams(params.toString());
    search.delete('cursor');
    search.delete('trail');
    if (next.cursor) search.set('cursor', next.cursor);
    if (next.trail.length) search.set('trail', next.trail.join(','));
    const query = search.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const previousTrail = trail.slice(0, -1);
  const previousCursor = trail.at(-1) ?? null;

  if (!cursor && !nextCursor) return null;
  return (
    <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-xs text-[#667085]">
        Showing {count} record{count === 1 ? '' : 's'} on this page
      </p>
      <div className="flex gap-2">
        {cursor ? (
          <Link
            href={href({ cursor: previousCursor, trail: previousTrail })}
            className={BUTTON_SECONDARY}
          >
            <ChevronLeft size={15} /> Previous
          </Link>
        ) : (
          <span className={`${BUTTON_SECONDARY} pointer-events-none opacity-50`}>
            <ChevronLeft size={15} /> Previous
          </span>
        )}
        {nextCursor ? (
          <Link
            href={href({ cursor: nextCursor, trail: cursor ? [...trail, cursor] : [] })}
            className={BUTTON_SECONDARY}
          >
            Next <ChevronRight size={15} />
          </Link>
        ) : (
          <span className={`${BUTTON_SECONDARY} pointer-events-none opacity-50`}>
            Next <ChevronRight size={15} />
          </span>
        )}
      </div>
    </nav>
  );
}

/** Standalone search box for tables that need nothing else. */
export function SearchInput({ placeholder = 'Search…' }: { placeholder?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <form method="get" action={pathname} className="relative mb-4 max-w-sm">
      <label className="sr-only" htmlFor="admin-search-input">
        Search
      </label>
      <Search
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]"
      />
      <input
        id="admin-search-input"
        type="search"
        name="q"
        defaultValue={params.get('q') || ''}
        placeholder={placeholder}
        className={`${INPUT} pl-9`}
      />
    </form>
  );
}
