import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/firebase/admin';
import { apiError } from '@/lib/api';
import { assertOrigin, jsonBody, requireUser, HttpError } from '@/lib/security';
import { methodSchema } from '@/lib/manual-payment';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const actor = await requireUser(true);
    const { id, method } = z
      .object({
        id: z
          .string()
          .regex(/^[a-zA-Z0-9_-]{1,128}$/)
          .optional(),
        method: methodSchema,
      })
      .strict()
      .parse(await jsonBody(request));
    const ref = id
      ? db().collection('paymentMethods').doc(id)
      : db().collection('paymentMethods').doc();
    await db().runTransaction(async (tx) => {
      const old = await tx.get(ref);
      if (id && !old.exists) throw new HttpError(404, 'Method not found.');
      if (!id && (await tx.get(db().collection('paymentMethods').limit(100))).size >= 100)
        throw new HttpError(
          400,
          'The platform supports up to 100 payment methods. Edit an existing method.',
        );
      const now = new Date().toISOString();
      tx.set(ref, {
        ...method,
        id: ref.id,
        createdAt: old.data()?.createdAt || now,
        updatedAt: now,
      });
      tx.create(db().collection('auditLogs').doc(), {
        actorId: actor.uid,
        action: old.exists ? 'payment-method.updated' : 'payment-method.created',
        resourceId: ref.id,
        before: old.data() || null,
        after: method,
        createdAt: now,
      });
    });
    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e) {
    return apiError(e);
  }
}
