import type { MetadataRoute } from 'next';
import { brand, demoMode } from '@/lib/brand';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: demoMode ? undefined : '/',
      disallow: demoMode
        ? '/'
        : ['/admin', '/dashboard', '/api', '/donate', '/donation', '/start-a-fundraiser'],
    },
    sitemap: `${brand.url}/sitemap.xml`,
  };
}
