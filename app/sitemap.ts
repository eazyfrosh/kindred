import type { MetadataRoute } from 'next';
import { brand, demoMode } from '@/lib/brand';
import { db } from '@/firebase/admin';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (demoMode) return [];
  const rows = await db()
    .collection('campaigns')
    .where('status', '==', 'approved')
    .limit(10000)
    .get();
  return [
    ...['', '/causes', '/about', '/how-it-works', '/impact', '/volunteer', '/contact'].map((p) => ({
      url: `${brand.url}${p}`,
      changeFrequency: 'weekly' as const,
    })),
    ...rows.docs.map((d) => ({
      url: `${brand.url}/campaign/${d.data().slug}`,
      lastModified: new Date(d.data().updatedAt),
    })),
  ];
}
