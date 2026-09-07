'use client';
import { usePathname } from 'next/navigation';

/**
 * Hides the public site header and footer on `/admin`, which renders its own
 * dashboard shell. The public site itself is unchanged.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith('/admin')) return null;
  return <>{children}</>;
}
