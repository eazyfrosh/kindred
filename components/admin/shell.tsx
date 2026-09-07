'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from './sidebar';
import { AdminTopbar } from './topbar';
import type { AdminBadgeCounts } from './nav-items';

const STORAGE_KEY = 'kindred:admin:sidebar';

/**
 * Sidebar collapse lives in localStorage rather than React state so the value
 * can be read during render on the client and still fall back to "expanded"
 * during server rendering, with no hydration effect.
 */
let collapseListeners: (() => void)[] = [];
const collapseStore = {
  subscribe(listener: () => void) {
    collapseListeners = [...collapseListeners, listener];
    return () => {
      collapseListeners = collapseListeners.filter((entry) => entry !== listener);
    };
  },
  isCollapsed() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'collapsed';
    } catch {
      return false;
    }
  },
  serverSnapshot() {
    return false;
  },
  toggle() {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        collapseStore.isCollapsed() ? 'expanded' : 'collapsed',
      );
    } catch {
      // Storage can be unavailable; the sidebar simply reverts on reload.
    }
    collapseListeners.forEach((listener) => listener());
  },
};

export interface AdminIdentity {
  name: string;
  email: string;
  photoURL: string;
}

/**
 * Persistent admin frame: a collapsible sidebar on desktop, a slide-over drawer
 * on small screens, and a sticky topbar. Layout state is presentation only —
 * every page behind it is re-authorized on the server.
 */
export function AdminShell({
  admin,
  badges,
  unreadNotifications,
  children,
}: {
  admin: AdminIdentity;
  badges: AdminBadgeCounts;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    collapseStore.isCollapsed,
    collapseStore.serverSnapshot,
  );
  const pathname = usePathname();
  // The drawer is scoped to the route it was opened on, so a navigation closes
  // it without an effect.
  const [drawer, setDrawer] = useState({ open: false, path: pathname });
  const drawerOpen = drawer.open && drawer.path === pathname;
  const closeDrawer = () => setDrawer({ open: false, path: pathname });

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawer({ open: false, path: pathname });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, pathname]);

  return (
    <div className="admin-shell flex min-h-screen w-full bg-[#f6f7f9] text-[#101828]">
      <AdminSidebar
        badges={badges}
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        onClose={closeDrawer}
        onToggleCollapsed={collapseStore.toggle}
      />
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-[#101828]/40 lg:hidden"
          onClick={closeDrawer}
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          admin={admin}
          unreadNotifications={unreadNotifications}
          onOpenDrawer={() => setDrawer({ open: true, path: pathname })}
        />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
