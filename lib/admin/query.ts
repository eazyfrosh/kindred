import 'server-only';
import type { Query } from 'firebase-admin/firestore';
import { db } from '@/firebase/admin';

/** Default admin table page size. Admin queries are never unbounded. */
export const PAGE_SIZE = 25;

export interface PageOptions {
  collection: string;
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  rows: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Cursor pagination for admin tables. The cursor is the last document id of the
 * previous page, so Firestore can `startAfter` it without scanning earlier rows.
 */
export async function readPage<T>(query: Query, options: PageOptions): Promise<Page<T>> {
  const size = Math.min(Math.max(options.limit ?? PAGE_SIZE, 1), 100);
  let scoped = query;
  if (options.cursor) {
    const cursor = await db().collection(options.collection).doc(options.cursor).get();
    if (cursor.exists) scoped = scoped.startAfter(cursor);
  }
  const snap = await scoped.limit(size + 1).get();
  const docs = snap.docs.slice(0, size);
  return {
    rows: docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T),
    nextCursor: snap.size > size ? (docs.at(-1)?.id ?? null) : null,
    hasMore: snap.size > size,
  };
}

/** Inclusive ISO range bounds from `YYYY-MM-DD` date inputs. */
export function dateRange(from?: string, to?: string) {
  return {
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  };
}

/** Counts documents with Firestore's aggregate query — never by reading rows. */
export async function countOf(query: Query) {
  return (await query.count().get()).data().count;
}
