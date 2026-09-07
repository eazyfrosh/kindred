import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminAuth, db } from '@/firebase/admin';
import { HttpError } from '@/lib/security';
import { demoMode } from '@/lib/brand';
import type { Role } from '@/types';

/**
 * The verified identity of the person making a request.
 *
 * Every field here is derived server-side from the signed Firebase session
 * cookie and the Firestore user record. Nothing on this object is ever read
 * from the browser, from `localStorage`, or from a request body.
 */
export interface AuthenticatedUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  photoURL: string;
  role: Role;
  verified: boolean;
  disabled: boolean;
  /** True when the Firebase Auth token itself carries an admin custom claim. */
  claimAdmin: boolean;
  /** True when the Firestore user record carries the admin role. */
  recordAdmin: boolean;
}

/**
 * Verifies the `__session` cookie with the Firebase Admin SDK and loads the
 * matching Firestore profile. Returns `null` for anonymous, revoked, missing,
 * or disabled accounts. Memoised per request by `react.cache`.
 */
export const getAuthenticatedUser = cache(
  async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
    if (demoMode) return null;
    const cookie = (await cookies()).get('__session')?.value;
    if (!cookie) return null;
    let claims;
    try {
      // checkRevoked: a role change or suspension revokes refresh tokens, which
      // invalidates the session cookie on the next request.
      claims = await adminAuth().verifySessionCookie(cookie, true);
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
      console.error('Admin session verification failed:', code);
      return null;
    }
    const snap = await db().collection('users').doc(claims.uid).get();
    const profile = snap.data();
    if (!snap.exists || !profile || profile.disabled === true) return null;
    const claimAdmin = claims.admin === true || claims.role === 'admin';
    const recordAdmin = profile.role === 'admin';
    const firstName = String(profile.firstName || '');
    const lastName = String(profile.lastName || '');
    return {
      uid: claims.uid,
      email: String(profile.email || claims.email || ''),
      firstName,
      lastName,
      displayName: `${firstName} ${lastName}`.trim() || 'Administrator',
      photoURL: String(profile.photoURL || ''),
      // Custom claims are preferred, but the existing Firestore role architecture
      // stays authoritative when no claim has been minted for the account.
      role: (claimAdmin ? 'admin' : (profile.role as Role)) || 'user',
      verified: profile.verified === true,
      disabled: false,
      claimAdmin,
      recordAdmin,
    };
  },
);

/** Returns the signed-in user or throws a 401. For API routes and actions. */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  return user;
}

/** Returns the signed-in administrator or throws 401/403. */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== 'admin') throw new HttpError(403, 'Administrator access required.');
  return user;
}

/**
 * Page-level guard. Unauthorized visitors are redirected away from `/admin`
 * rather than shown an error, and never receive any admin payload.
 */
export async function requireAdminPage(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login?next=/admin');
  if (user.role !== 'admin') redirect('/dashboard?denied=admin');
  return user;
}

/** True when the account may reach `/admin`. Never trusts client-supplied state. */
export async function isAdmin(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return user?.role === 'admin';
}
