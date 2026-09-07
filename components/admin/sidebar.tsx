'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { ADMIN_NAV, type AdminBadgeCounts } from './nav-items';

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export function AdminSidebar({
  badges,
  collapsed,
  drawerOpen,
  onClose,
  onToggleCollapsed,
}: {
  badges: AdminBadgeCounts;
  collapsed: boolean;
  drawerOpen: boolean;
  onClose: () => void;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname() || '/admin';
  return (
    <aside
      aria-label="Administration navigation"
      className={[
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#e4e7ec] bg-white transition-transform duration-200',
        'lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
        drawerOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'w-[72px]' : 'w-[248px]',
      ].join(' ')}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[#e4e7ec] px-3">
        <Link href="/admin" className="flex items-center gap-2 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#193be0] text-white">
            <Heart size={16} fill="currentColor" />
          </span>
          {!collapsed && (
            <span className="truncate text-sm font-semibold tracking-tight text-[#101828]">
              Kindred Admin
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-md p-1.5 text-[#667085] hover:bg-[#f2f4f7] lg:hidden"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {ADMIN_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badge ? badges[item.badge] : undefined;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={[
                'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                active
                  ? 'bg-[#eef2ff] font-medium text-[#193be0]'
                  : 'text-[#475467] hover:bg-[#f2f4f7] hover:text-[#101828]',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && !!count && (
                <span className="rounded-full bg-[#193be0] px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white">
                  {count > 99 ? '99+' : count}
                </span>
              )}
              {collapsed && !!count && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#193be0]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-[#e4e7ec] p-2 lg:block">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-[#667085] hover:bg-[#f2f4f7] hover:text-[#101828]"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
