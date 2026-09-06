import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db } from '@/firebase/admin';
import {
  assertOrigin,
  assertLive,
  requireUser,
  rateLimit,
  jsonBody,
  HttpError,
} from '@/lib/security';
import { apiError } from '@/lib/api';
import { assertOwnedImages } from '@/lib/media';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  try {
    assertOrigin(request);
    assertLive();
    const { id, action } = await params;
    await rateLimit(request, `${action}:${id}`, 5);
    const ref = db().collection('campaigns').doc(id);
    const snap = await ref.get();
    const c = snap.data();
    if (!c) throw new HttpError(404, 'Campaign not found.');
    if (action === 'share' || action === 'view') {
      if (c.status !== 'approved') throw new HttpError(404, 'Campaign unavailable.');
      await ref.update({
        [action === 'share' ? 'shareCount' : 'viewCount']: FieldValue.increment(1),
      });
      return NextResponse.json({ ok: true });
    }
    const user = await requireUser();
    const now = new Date().toISOString();
    const input = await jsonBody(request);
    if (action === 'comments') {
      if (!user.verified || c.status !== 'approved')
        throw new HttpError(403, 'A verified account and active campaign are required.');
      const data = z.object({ message: z.string().trim().min(1).max(1000) }).parse(input);
      await db()
        .collection('comments')
        .add({
          ...data,
          campaignId: id,
          authorId: user.uid,
          authorName: `${user.firstName} ${user.lastName}`,
          status: 'pending',
          createdAt: now,
        });
    } else if (action === 'updates') {
      if (c.organizerId !== user.uid && user.role !== 'admin')
        throw new HttpError(403, 'Only the organizer can post updates.');
      if (!['approved', 'completed'].includes(c.status))
        throw new HttpError(400, 'Updates are available on published campaigns.');
      const data = z
        .object({
          title: z.string().trim().min(1).max(140),
          body: z.string().trim().min(1).max(10000),
          image: z.string().url().or(z.literal('')).default(''),
        })
        .parse(input);
      if (data.image) assertOwnedImages([data.image], user.uid);
      await db()
        .collection('campaignUpdates')
        .add({ ...data, campaignId: id, organizerId: user.uid, createdAt: now });
    } else if (action === 'close') {
      if (c.organizerId !== user.uid)
        throw new HttpError(403, 'Only the organizer can request closure.');
      await ref.update({ closureRequested: true, updatedAt: now });
    } else throw new HttpError(404, 'Unknown action.');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
