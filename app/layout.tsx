import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { SiteChrome } from '@/components/site-chrome';
import { brand, demoMode } from '@/lib/brand';
import './globals.css';
export const metadata: Metadata = {
  metadataBase: new URL(brand.url),
  title: { default: `${brand.name} — Small acts. Lasting change.`, template: `%s | ${brand.name}` },
  description: brand.description,
  icons: { icon: '/icon.svg' },
  openGraph: {
    type: 'website',
    siteName: brand.name,
    title: brand.name,
    description: brand.description,
  },
  twitter: { card: 'summary_large_image' },
  robots: demoMode ? { index: false, follow: false } : { index: true, follow: true },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {demoMode && (
          <div className="demo-banner">
            Demonstration · Fictional campaigns and impact figures · Payments are disabled
          </div>
        )}
        <SiteChrome>
          <Navigation />
        </SiteChrome>
        <main id="main">{children}</main>
        <SiteChrome>
          <Footer />
        </SiteChrome>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
