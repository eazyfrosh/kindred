'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { Bell, ChevronDown, LogOut, Menu, Settings, User } from 'lucide-react';
import { auth } from '@/firebase/client';
import { requestJSON } from '@/components/forms';
import { GlobalSearch } from './global-search';
import type { AdminIdentity } from './shell';

export function AdminTopbar({
  admin,
  unreadNotifications,
  onOpenDrawer,
}: {
  admin: AdminIdentity;
  unreadNotifications: number;
  onOpenDrawer: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  async function logout() {
    setBusy(true);
    try {
      await requestJSON('/api/auth/session', {}, 'DELETE');
      if (auth().currentUser) await signOut(auth());
      router.push('/login');
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const initials =
    admin.name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'A';

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-[#e4e7ec] bg-white/95 px-4 backdrop-blur sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onOpenDrawer}
        aria-label="Open navigation"
        className="rounded-md p-2 text-[#475467] hover:bg-[#f2f4f7] lg:hidden"
      >
        <Menu size={18} />
      </button>

      <GlobalSearch />

      <Link
        href="/admin/notifications"
        aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
        className="relative rounded-md p-2 text-[#475467] hover:bg-[#f2f4f7]"
      >
        <Bell size={18} />
        {unreadNotifications > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#d92d20] px-1 text-[10px] font-semibold leading-none text-white">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-[#f2f4f7]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef2ff] text-xs font-semibold text-[#193be0]">
            {initials}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-4 text-[#101828]">{admin.name}</span>
            <span className="block text-[11px] leading-4 text-[#667085]">Administrator</span>
          </span>
          <ChevronDown size={15} className="text-[#98a2b3]" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-[#e4e7ec] bg-white py-1 shadow-lg"
          >
            <div className="border-b border-[#e4e7ec] px-3 py-2">
              <p className="truncate text-sm font-medium text-[#101828]">{admin.name}</p>
              <p className="truncate text-xs text-[#667085]">{admin.email}</p>
            </div>
            <Link
              role="menuitem"
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#475467] hover:bg-[#f9fafb]"
            >
              <User size={15} /> My account
            </Link>
            <Link
              role="menuitem"
              href="/admin/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#475467] hover:bg-[#f9fafb]"
            >
              <Settings size={15} /> Platform settings
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={logout}
              disabled={busy}
              className="flex w-full items-center gap-2 border-t border-[#e4e7ec] px-3 py-2 text-left text-sm text-[#b42318] hover:bg-[#fef3f2]"
            >
              <LogOut size={15} /> {busy ? 'Signing out…' : 'Log out'}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
