import { NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import { assertLive, assertOrigin, requireUser, jsonBody, HttpError } from '@/lib/security';
import { apiError } from '@/lib/api';
import { campaignSchema } from '@/lib/validation';
import { assertOwnedImages } from '@/lib/media';
import { tokens } from '@/lib/brand';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertOrigin(request);
    assertLive();
    const user = await requireUser();
    const { id } = await params;
    const input = campaignSchema.parse(await jsonBody(request));
    const ref = db().collection('campaigns').doc(id);
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const c = snap.data();
      if (!c) throw new HttpError(404, 'Campaign not found.');
      if (user.role !== 'admin') {
        if (c.organizerId !== user.uid || !['draft', 'pending', 'rejected'].includes(c.status))
          throw new HttpError(
            403,
            'This campaign cannot be edited. Publish an update or contact support.',
          );
        assertOwnedImages([input.coverImage, ...input.gallery], user.uid);
      }
      if (input.currency !== c.currency || input.goalAmount !== c.goalAmount) {
        const payments = await tx.get(
          db().collection('donations').where('campaignId', '==', id).limit(1),
        );
        if (c.amountRaised > 0 || !payments.empty)
          throw new HttpError(
            400,
            'The currency and goal cannot change once a checkout has been created.',
          );
      }
      tx.update(ref, {
        ...input,
        ...(user.role === 'admin' ? {} : { status: 'pending' }),
        updatedAt: new Date().toISOString(),
        searchTokens: tokens(
          `${input.title} ${input.category} ${input.shortDescription} ${input.location}`,
        ),
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
