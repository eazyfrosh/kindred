import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { EmptyState, Panel } from './ui';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
}

export interface ActivitySection {
  title: string;
  href: string;
  emptyText: string;
  items: ActivityItem[];
}

/** Compact "what just happened" lists for the overview. */
export function ActivityFeed({ sections }: { sections: ActivitySection[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => (
        <Panel
          key={section.title}
          className="min-w-0"
          title={section.title}
          action={
            <Link
              href={section.href}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#193be0] hover:underline"
            >
              View all <ArrowUpRight size={13} />
            </Link>
          }
        >
          {section.items.length === 0 ? (
            <EmptyState title={section.emptyText} />
          ) : (
            <ul className="divide-y divide-[#e4e7ec]">
              {section.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="block truncate text-sm font-medium text-[#101828] hover:underline"
                      >
                        {item.title}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium text-[#101828]">{item.title}</p>
                    )}
                    {item.subtitle && (
                      <p className="truncate text-xs text-[#667085]">{item.subtitle}</p>
                    )}
                  </div>
                  {item.meta && (
                    <span className="shrink-0 whitespace-nowrap text-xs text-[#667085]">
                      {item.meta}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ))}
    </div>
  );
}
