import 'server-only';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { adminAuth, db } from '@/firebase/admin';
import type { UserProfile } from '@/types';
import { brand, demoMode } from './brand';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function currentUser(): Promise<UserProfile | null> {
  if (demoMode) return null;
  const cookie = (await cookies()).get('__session')?.value;
  if (!cookie) return null;
  let uid: string;
  try {
    uid = (await adminAuth().verifySessionCookie(cookie, true)).uid;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
    console.error('Session verification failed:', code);
    return null;
  }
  const snap = await db().collection('users').doc(uid).get();
  if (!snap.exists || snap.data()?.disabled) return null;
  return snap.data() as UserProfile;
}
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  if (admin && user.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  return user;
}
export function assertOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(brand.url).origin)
    throw new HttpError(403, 'Invalid request origin.');
}
export function assertLive() {
  if (demoMode)
    throw new HttpError(
      503,
      'This is a demonstration. Connect Firebase and turn off demo mode to enable this action.',
    );
}
export async function rateLimit(request: Request, key: string, limit = 15) {
  const salt = process.env.RATE_LIMIT_SALT;
  if (!salt) throw new HttpError(503, 'Server rate limiting is not configured.');
  const ip =
    (process.env.VERCEL
      ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]
      : undefined) || 'local';
  const id = createHash('sha256')
    .update(`${salt}:${key}:${ip}:${Math.floor(Date.now() / 60000)}`)
    .digest('hex');
  const ref = db().collection('_rateLimits').doc(id);
  await db().runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if ((s.data()?.count || 0) >= limit)
      throw new HttpError(429, 'Too many requests. Please wait a minute.');
    tx.set(ref, { count: (s.data()?.count || 0) + 1, expiresAt: new Date(Date.now() + 120000) });
  });
}
export async function jsonBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 65536) throw new HttpError(413, 'Request is too large.');
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
}
export function serialize<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) =>
      v && typeof v === 'object' && '_seconds' in v ? new Date(v._seconds * 1000).toISOString() : v,
    ),
  );
}
