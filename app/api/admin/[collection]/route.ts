import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, adminAuth } from '@/firebase/admin';
import { assertLive, assertOrigin, requireUser, jsonBody, HttpError } from '@/lib/security';
import { apiError } from '@/lib/api';
const text = (max: number) => z.string().trim().min(1).max(max);
const contentSchema = z.object({
  announcement: z.string().max(300),
  impact: z.object({
    people: z.number().int().min(0),
    countries: z.number().int().min(0).max(250),
    projects: z.number().int().min(0),
  }),
  testimonials: z
    .array(z.object({ quote: text(1000), name: text(120), detail: text(200) }))
    .max(12),
  partners: z.array(text(100)).max(20),
  faqs: z.array(z.object({ question: text(300), answer: text(3000) })).max(30),
  team: z.array(z.object({ name: text(120), role: text(200) })).max(20),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string }> },
) {
  try {
    assertOrigin(request);
    assertLive();
    const user = await requireUser(true);
    const { collection } = await params;
    const input = await jsonBody(request);
    const now = new Date().toISOString();
    if (collection === 'content') {
      const data = contentSchema.parse(input);
      await db().collection('siteSettings').doc('public').set(data);
      await audit(user.uid, 'content', 'public', 'update');
      return NextResponse.json({ ok: true });
    }
    const { id, action } = z.object({ id: text(128), action: text(50) }).parse(input);
    if (collection === 'campaigns') {
      const ref = db().collection('campaigns').doc(id);
      await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const c = snap.data();
        if (!c) throw new HttpError(404, 'Campaign not found.');
        if (action === 'delete') {
          if (c.amountRaised > 0 || c.donorCount > 0)
            throw new HttpError(
              400,
              'Funded campaigns must be suspended or completed to preserve financial records.',
            );
          const payments = await tx.get(
            db().collection('donations').where('campaignId', '==', id).limit(1),
          );
          if (!payments.empty)
            throw new HttpError(400, 'Campaigns with payment records cannot be deleted.');
          tx.delete(ref);
          return;
        }
        if (action === 'feature') {
          if (c.status !== 'approved')
            throw new HttpError(400, 'Only approved campaigns can be featured.');
          tx.update(ref, { featured: !c.featured, updatedAt: now });
          return;
        }
        if (action === 'urgent') {
          tx.update(ref, { urgent: !c.urgent, updatedAt: now });
          return;
        }
        const statuses: Record<string, string> = {
          approve: 'approved',
          reject: 'rejected',
          suspend: 'suspended',
          complete: 'completed',
        };
        if (!statuses[action]) throw new HttpError(400, 'Invalid campaign action.');
        tx.update(ref, {
          status: statuses[action],
          verified: action === 'approve' ? true : c.verified,
          featured: action === 'approve' ? c.featured : false,
          updatedAt: now,
        });
        tx.create(db().collection('notifications').doc(), {
          userId: c.organizerId,
          campaignId: id,
          title: `Campaign ${statuses[action]}`,
          message: c.title,
          read: false,
          createdAt: now,
        });
      });
    } else if (collection === 'users') {
      if (id === user.uid)
        throw new HttpError(400, 'Use another administrator to change your own access.');
      const ref = db().collection('users').doc(id);
      if (!(await ref.get()).exists) throw new HttpError(404, 'User not found.');
      if (action === 'role') {
        const role = z.enum(['user', 'fundraiser', 'admin']).parse(input.role);
        await ref.update({ role, updatedAt: now });
        await adminAuth().revokeRefreshTokens(id);
      } else if (action === 'disable') {
        const disabled = z.boolean().parse(input.disabled);
        if (disabled) await ref.update({ disabled: true, updatedAt: now });
        await adminAuth().updateUser(id, { disabled });
        await adminAuth().revokeRefreshTokens(id);
        if (!disabled) await ref.update({ disabled: false, updatedAt: now });
      } else if (action === 'verify') {
        await ref.update({ fundraiserVerified: true, updatedAt: now });
      } else throw new HttpError(400, 'Invalid user action.');
    } else if (['volunteerApplications', 'contactMessages', 'comments'].includes(collection)) {
      const ref = db().collection(collection).doc(id);
      if (!(await ref.get()).exists) throw new HttpError(404, 'Record not found.');
      if (action === 'delete') await ref.delete();
      else if (action === 'status') {
        const status =
          collection === 'volunteerApplications'
            ? z.enum(['new', 'reviewing', 'accepted', 'declined']).parse(input.status)
            : collection === 'contactMessages'
              ? z.enum(['unread', 'read', 'resolved']).parse(input.status)
              : z.enum(['pending', 'approved', 'rejected']).parse(input.status);
        await ref.update({ status, updatedAt: now });
      } else if (action === 'notes' && collection === 'volunteerApplications')
        await ref.update({ notes: z.string().max(5000).parse(input.notes), updatedAt: now });
      else throw new HttpError(400, 'Invalid action.');
    } else throw new HttpError(404, 'Unknown administration area.');
    await audit(user.uid, collection, id, action);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
async function audit(actorId: string, collection: string, id: string, action: string) {
  await db()
    .collection('_auditLog')
    .add({ actorId, collection, recordId: id, action, createdAt: new Date().toISOString() });
}
