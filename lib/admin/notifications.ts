import 'server-only';
import type { Transaction } from 'firebase-admin/firestore';
import { db } from '@/firebase/admin';
import { serialize } from '@/lib/security';
import type { AdminNotification } from '@/types/admin';
import { PAGE_SIZE, countOf, readPage } from './query';

const COLLECTION = 'adminNotifications';

/** Donations at or above this amount raise a dashboard notification. */
export const HIGH_VALUE_DONATION = 1000;

/**
 * Raises a dashboard notification for the administration team. Called from
 * server-side flows (campaign submission, webhooks, payout requests) — never
 * from the browser.
 */
export async function notifyAdmins(entry: Omit<AdminNotification, 'id' | 'read' | 'createdAt'>) {
  await db()
    .collection(COLLECTION)
    .add({ ...entry, read: false, createdAt: new Date().toISOString() });
}

/** Same as `notifyAdmins`, written inside an existing Firestore transaction. */
export function notifyAdminsIn(
  tx: Transaction,
  entry: Omit<AdminNotification, 'id' | 'read' | 'createdAt'>,
) {
  tx.create(db().collection(COLLECTION).doc(), {
    ...entry,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function listAdminNotifications(filters: { unread?: boolean; cursor?: string } = {}) {
  let query = db().collection(COLLECTION) as FirebaseFirestore.Query;
  if (filters.unread) query = query.where('read', '==', false);
  query = query.orderBy('createdAt', 'desc');
  const page = await readPage<AdminNotification>(query, {
    collection: COLLECTION,
    cursor: filters.cursor,
    limit: PAGE_SIZE,
  });
  return { ...page, rows: serialize(page.rows) };
}

export const unreadNotificationCount = () =>
  countOf(db().collection(COLLECTION).where('read', '==', false));

export async function markNotificationRead(id: string, read = true) {
  await db().collection(COLLECTION).doc(id).update({ read });
}

export async function markAllNotificationsRead() {
  const snap = await db().collection(COLLECTION).where('read', '==', false).limit(400).get();
  if (snap.empty) return 0;
  const batch = db().batch();
  snap.docs.forEach((doc) => batch.update(doc.ref, { read: true }));
  await batch.commit();
  return snap.size;
}
