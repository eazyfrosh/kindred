import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/firebase/admin';
import { apiError } from '@/lib/api';
import { assertOrigin, jsonBody, requireUser, HttpError } from '@/lib/security';
import { canReview, verificationStatuses } from '@/lib/manual-payment';
import { settlePayment } from '@/services/payments';
import { minorUnits } from '@/lib/payment-integrity';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const actor = await requireUser(true);
    const data = z
      .object({
        id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
        status: z.enum(verificationStatuses),
        note: z.string().trim().min(10).max(2000),
      })
      .strict()
      .parse(await jsonBody(request));
    const ref = db().collection('manualPayments').doc(data.id);
    if (data.status === 'confirmed') {
      const snap = await ref.get();
      const p = snap.data();
      if (!p) throw new HttpError(404, 'Payment not found.');
      if (!p.transactionIdentity) throw new HttpError(400, 'A submitted transaction is required.');
      await settlePayment(
        {
          reference: data.id,
          transactionId: p.transactionIdentity,
          amountMinor: minorUnits(p.amount),
          currency: p.currency,
          provider: 'manual',
        },
        { uid: actor.uid, note: data.note },
      );
    } else
      await db().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const p = snap.data();
        if (!p) throw new HttpError(404, 'Payment not found.');
        if (!canReview(p.status, data.status))
          throw new HttpError(409, 'This payment cannot transition to that status.');
        if (data.status === 'verifying' && !p.transactionHash)
          throw new HttpError(400, 'No transaction has been submitted.');
        if (data.status === 'expired' && Date.parse(p.expiresAt) > Date.now())
          throw new HttpError(400, 'The quote has not expired.');
        const now = new Date().toISOString();
        tx.update(ref, {
          status: data.status,
          reviewNote: data.note,
          reviewedBy: actor.uid,
          updatedAt: now,
        });
        if (['rejected', 'expired'].includes(data.status))
          tx.update(db().collection('donations').doc(data.id), { paymentStatus: 'failed' });
        tx.create(db().collection('auditLogs').doc(), {
          actorId: actor.uid,
          action: 'payment.' + data.status,
          resourceId: data.id,
          before: p.status,
          after: data.status,
          note: data.note,
          createdAt: now,
        });
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
