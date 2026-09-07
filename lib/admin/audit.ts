import 'server-only';
import type { Transaction } from 'firebase-admin/firestore';
import { db } from '@/firebase/admin';
import { serialize } from '@/lib/security';
import type { AuditLog } from '@/types/admin';
import type { AuthenticatedUser } from './auth';
import { PAGE_SIZE, readPage } from './query';

export const AUDIT_COLLECTION = 'auditLogs';

export interface AuditInput {
  action: string;
  targetType: string;
  targetId: string;
  description: string;
  metadata?: Record<string, unknown>;
}

function auditDocument(actor: Pick<AuthenticatedUser, 'uid' | 'email'>, entry: AuditInput) {
  return {
    adminId: actor.uid,
    adminEmail: actor.email,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    description: entry.description,
    metadata: entry.metadata ?? {},
    createdAt: new Date().toISOString(),
  };
}

/**
 * Records a sensitive administrator action. Audit logs are append-only: no
 * admin UI path updates or deletes them, and Firestore rules deny client writes.
 */
export async function recordAudit(
  actor: Pick<AuthenticatedUser, 'uid' | 'email'>,
  entry: AuditInput,
) {
  await db().collection(AUDIT_COLLECTION).add(auditDocument(actor, entry));
}

/** Same as `recordAudit`, written inside an existing Firestore transaction. */
export function recordAuditIn(
  tx: Transaction,
  actor: Pick<AuthenticatedUser, 'uid' | 'email'>,
  entry: AuditInput,
) {
  tx.create(db().collection(AUDIT_COLLECTION).doc(), auditDocument(actor, entry));
}

export interface AuditFilters {
  q?: string;
  action?: string;
  targetType?: string;
  adminId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export async function listAuditLogs(filters: AuditFilters = {}) {
  let query = db().collection(AUDIT_COLLECTION).orderBy('createdAt', 'desc');
  if (filters.targetType) query = query.where('targetType', '==', filters.targetType);
  if (filters.action) query = query.where('action', '==', filters.action);
  if (filters.adminId) query = query.where('adminId', '==', filters.adminId);
  if (filters.from) query = query.where('createdAt', '>=', filters.from);
  if (filters.to) query = query.where('createdAt', '<=', `${filters.to}T23:59:59.999Z`);
  const page = await readPage<AuditLog>(query, {
    collection: AUDIT_COLLECTION,
    cursor: filters.cursor,
    limit: filters.limit ?? PAGE_SIZE,
  });
  const needle = filters.q?.trim().toLowerCase();
  return {
    ...page,
    rows: serialize(
      needle
        ? page.rows.filter((row) =>
            `${row.adminEmail} ${row.description} ${row.targetId} ${row.action}`
              .toLowerCase()
              .includes(needle),
          )
        : page.rows,
    ),
  };
}

/** Recent audit entries for a single record, shown on detail pages. */
export async function auditHistoryFor(targetType: string, targetId: string, max = 20) {
  const snap = await db()
    .collection(AUDIT_COLLECTION)
    .where('targetType', '==', targetType)
    .where('targetId', '==', targetId)
    .orderBy('createdAt', 'desc')
    .limit(max)
    .get();
  return serialize(snap.docs.map((d) => ({ ...(d.data() as AuditLog), id: d.id })));
}
