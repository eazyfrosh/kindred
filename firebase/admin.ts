import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
export function adminApp() {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.USE_FIREBASE_EMULATORS === 'true' &&
    process.env.FIRESTORE_EMULATOR_HOST &&
    process.env.FIREBASE_ADMIN_PROJECT_ID?.startsWith('demo-')
  )
    return getApps()[0] || initializeApp({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID });
  if (
    !process.env.FIREBASE_ADMIN_PROJECT_ID ||
    !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    !process.env.FIREBASE_ADMIN_PRIVATE_KEY
  )
    throw new Error('Firebase server configuration is missing.');
  return (
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
  );
}
export const db = () => getFirestore(adminApp());
export const adminAuth = () => getAuth(adminApp());
