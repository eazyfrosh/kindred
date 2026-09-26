import { z } from 'zod';
import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '@/firebase/admin';
import { apiError } from '@/lib/api';
import {
  assertLive,
  assertOrigin,
  currentUser,
  HttpError,
  jsonBody,
  rateLimit,
} from '@/lib/security';
import { donationSchema } from '@/lib/validation';
import { initializeManual, privatePayment } from '@/services/manual-payments';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    assertLive();
    await rateLimit(request, 'manual-checkout', 8);
    const data = donationSchema
      .omit({ provider: true, frequency: true })
      .extend({ methodId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/) })
      .strict()
      .parse(await jsonBody(request));
    const result = await initializeManual(data, (await currentUser())?.uid || null);
    return NextResponse.json(
      { url: `/donation/manual/${result.id}?token=${result.token}` },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: Request) {
  try {
    assertOrigin(request);
    assertLive();
    await rateLimit(request, 'manual-submit', 12);
    const data = z
      .object({
        id: z.string().max(128),
        token: z.string().length(64),
        transactionHash: z
          .string()
          .trim()
          .min(6)
          .max(200)
          .regex(/^[a-zA-Z0-9:_-]+$/),
      })
      .strict()
      .parse(await jsonBody(request));
    await privatePayment(data.id, data.token);
    await db().runTransaction(async (tx) => {
      const ref = db().collection('manualPayments').doc(data.id);
      const snap = await tx.get(ref);
      const p = snap.data()!;
      if (p.transactionHash === data.transactionHash && p.status === 'pending') return;
      if (p.status !== 'pending' || p.transactionHash)
        throw new HttpError(409, 'This payment has already been submitted or reviewed.');
      if (Date.parse(p.expiresAt) < Date.now())
        throw new HttpError(409, 'This quote expired. Start a new donation before sending funds.');
      // Reserve globally so network aliases cannot allow the same transaction to be credited twice.
      const identity = data.transactionHash.toLowerCase();
      const marker = db()
        .collection('_manualSubmissions')
        .doc(createHash('sha256').update(identity).digest('hex'));
      if ((await tx.get(marker)).exists)
        throw new HttpError(409, 'This transaction has already been submitted.');
      tx.create(marker, { paymentId: data.id, createdAt: new Date().toISOString() });
      tx.update(ref, {
        transactionHash: data.transactionHash,
        transactionIdentity: identity,
        submittedAt: new Date().toISOString(),
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
