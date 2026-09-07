import 'server-only';
import { db } from '@/firebase/admin';
import { HttpError, serialize } from '@/lib/security';
import type { ContactMessage, NewsletterSubscriber, VolunteerApplication } from '@/types/admin';
import type { AuthenticatedUser } from './auth';
import { recordAudit } from './audit';
import { PAGE_SIZE, countOf, readPage } from './query';
import type { messageActionSchema, volunteerActionSchema } from './schemas';
import type { z } from 'zod';

interface ListFilters {
  q?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}

async function listSubmissions<T extends { id: string }>(
  collection: string,
  filters: ListFilters,
  searchable: (row: T) => string,
  orderField = 'createdAt',
) {
  let query = db().collection(collection) as FirebaseFirestore.Query;
  if (filters.status) query = query.where('status', '==', filters.status);
  query = query.orderBy(orderField, 'desc');
  const page = await readPage<T>(query, {
    collection,
    cursor: filters.cursor,
    limit: filters.limit ?? PAGE_SIZE,
  });
  const needle = filters.q?.trim().toLowerCase();
  return {
    ...page,
    rows: serialize(
      needle
        ? page.rows.filter((row) => searchable(row).toLowerCase().includes(needle))
        : page.rows,
    ),
  };
}

export const listVolunteers = (filters: ListFilters = {}) =>
  listSubmissions<VolunteerApplication>(
    'volunteerApplications',
    filters,
    (row) => `${row.name} ${row.email} ${row.country} ${row.interest}`,
  );

export const listMessages = (filters: ListFilters = {}) =>
  listSubmissions<ContactMessage>(
    'contactMessages',
    filters,
    (row) => `${row.name} ${row.email} ${row.subject} ${row.message}`,
  );

export const listSubscribers = (filters: ListFilters = {}) =>
  listSubmissions<NewsletterSubscriber>('newsletterSubscribers', filters, (row) => row.email);

export const unreadMessageCount = () =>
  countOf(db().collection('contactMessages').where('status', '==', 'unread'));

export async function administerVolunteer(
  actor: AuthenticatedUser,
  input: z.infer<typeof volunteerActionSchema>,
) {
  const ref = db().collection('volunteerApplications').doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Application not found.');
  const now = new Date().toISOString();
  if (input.action === 'delete') await ref.delete();
  else if (input.action === 'status') await ref.update({ status: input.status, updatedAt: now });
  else await ref.update({ notes: input.notes, updatedAt: now });
  await recordAudit(actor, {
    action: `volunteer.${input.action}`,
    targetType: 'volunteer',
    targetId: input.id,
    description: `Volunteer application for ${String(snap.data()?.email || input.id)} — ${input.action}`,
    metadata: input.action === 'status' ? { status: input.status } : {},
  });
}

export async function administerMessage(
  actor: AuthenticatedUser,
  input: z.infer<typeof messageActionSchema>,
) {
  const ref = db().collection('contactMessages').doc(input.id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Message not found.');
  const now = new Date().toISOString();
  if (input.action === 'delete') await ref.delete();
  else await ref.update({ status: input.status, updatedAt: now });
  await recordAudit(actor, {
    action: `message.${input.action}`,
    targetType: 'message',
    targetId: input.id,
    description: `Contact message from ${String(snap.data()?.email || input.id)} — ${input.action}`,
    metadata: input.action === 'status' ? { status: input.status } : {},
  });
}

export async function removeSubscriber(actor: AuthenticatedUser, id: string) {
  const ref = db().collection('newsletterSubscribers').doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Subscriber not found.');
  await ref.delete();
  await recordAudit(actor, {
    action: 'newsletter.remove',
    targetType: 'subscriber',
    targetId: id,
    description: `Removed newsletter subscriber ${String(snap.data()?.email || id)}`,
    metadata: {},
  });
}

/** Full subscriber export for the CSV download. Capped to keep the read bounded. */
export async function exportSubscribers() {
  const snap = await db()
    .collection('newsletterSubscribers')
    .orderBy('createdAt', 'desc')
    .limit(5000)
    .get();
  return snap.docs.map((d) => ({ ...(d.data() as NewsletterSubscriber), id: d.id }));
}
