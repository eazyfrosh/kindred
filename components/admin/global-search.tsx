'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import type { GroupedResults, SearchResult } from '@/lib/admin/search';

const EMPTY: GroupedResults = { campaigns: [], users: [], donations: [] };

const GROUPS: { key: keyof GroupedResults; label: string }[] = [
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'users', label: 'Users' },
  { key: 'donations', label: 'Donations' },
];

export function GlobalSearch() {
  const [term, setTerm] = useState('');
  // Results carry the term they answer, so a stale response is never rendered
  // against a newer query and no reset effect is needed.
  const [answer, setAnswer] = useState<{ term: string; results: GroupedResults }>({
    term: '',
    results: EMPTY,
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        setAnswer({ term: query, results: response.ok ? await response.json() : EMPTY });
      } catch {
        // Aborted or offline: leave the previous answer in place.
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const query = term.trim();
  const results = answer.term === query ? answer.results : EMPTY;
  const total = GROUPS.reduce((sum, group) => sum + results[group.key].length, 0);
  const pending = loading || (query.length >= 2 && answer.term !== query);

  return (
    <div className="relative min-w-0 flex-1 max-w-xl" ref={containerRef}>
      <label className="sr-only" htmlFor="admin-global-search">
        Search campaigns, users and donations
      </label>
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#98a2b3]"
      />
      <input
        id="admin-global-search"
        type="search"
        autoComplete="off"
        value={term}
        placeholder="Search campaigns, users, donation reference…"
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-md border border-[#d0d5dd] bg-white py-2 pl-9 pr-9 text-sm text-[#101828] placeholder:text-[#98a2b3] focus:border-[#193be0] focus:outline-none focus:ring-2 focus:ring-[#193be0]/15"
      />
      {pending && (
        <LoaderCircle
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#98a2b3]"
        />
      )}
      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[70vh] overflow-y-auto rounded-lg border border-[#e4e7ec] bg-white py-1 shadow-lg">
          {total === 0 && !pending && (
            <p className="px-3 py-3 text-sm text-[#667085]">No matching records.</p>
          )}
          {GROUPS.map(({ key, label }) =>
            results[key].length ? (
              <div key={key} className="py-1">
                <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#98a2b3]">
                  {label}
                </p>
                {results[key].map((result: SearchResult) => (
                  <Link
                    key={`${key}-${result.id}`}
                    href={result.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 hover:bg-[#f9fafb]"
                  >
                    <span className="block truncate text-sm font-medium text-[#101828]">
                      {result.title}
                    </span>
                    <span className="block truncate text-xs text-[#667085]">{result.subtitle}</span>
                  </Link>
                ))}
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
