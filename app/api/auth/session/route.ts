import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { adminAuth, db } from '@/firebase/admin';
import { assertOrigin, assertLive, jsonBody, rateLimit, HttpError } from '@/lib/security';
import { apiError } from '@/lib/api';
import { tokens } from '@/lib/brand';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    assertLive();
    await rateLimit(request, 'session', 15);
    const data = z
      .object({
        idToken: z.string().min(20),
        firstName: z.string().trim().max(80).optional(),
        lastName: z.string().trim().max(80).optional(),
      })
      .parse(await jsonBody(request));
    const claims = await adminAuth().verifyIdToken(data.idToken, true);
    if (Date.now() / 1000 - claims.auth_time > 300)
      throw new HttpError(401, 'Please log in again to renew your session.');
    const record = await adminAuth().getUser(claims.uid);
    if (record.disabled) throw new HttpError(403, 'Account access is disabled.');
    const now = new Date().toISOString();
    await db().runTransaction(async (tx) => {
      const ref = db().collection('users').doc(claims.uid);
      const user = await tx.get(ref);
      if (user.exists) {
        if (user.data()?.disabled) throw new HttpError(403, 'Account access is disabled.');
        tx.update(ref, {
          verified: record.emailVerified,
          email: record.email || '',
          searchTokens: tokens(
            `${user.data()?.firstName || ''} ${user.data()?.lastName || ''} ${record.email || ''}`,
          ),
          updatedAt: now,
        });
      } else {
        const [first, ...last] = (record.displayName || 'Kindred member').split(' ');
        tx.create(ref, {
          uid: claims.uid,
          firstName: data.firstName || first,
          searchTokens: tokens(
            `${data.firstName || first} ${data.lastName || last.join(' ')} ${record.email || ''}`,
          ),
          lastName: data.lastName || last.join(' '),
          email: record.email || '',
          photoURL: record.photoURL || '',
          role: 'user',
          verified: record.emailVerified,
          disabled: false,
          savedCampaigns: [],
          createdAt: now,
          updatedAt: now,
        });
      }
    });
    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const session = await adminAuth().createSessionCookie(data.idToken, { expiresIn });
    (await cookies()).set('__session', session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn / 1000,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertOrigin(request);
    (await cookies()).delete('__session');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
