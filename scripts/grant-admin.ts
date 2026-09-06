import { loadEnvConfig } from '@next/env';
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
loadEnvConfig(process.cwd());
async function main() {
  const uid = process.argv[2];
  if (!uid) throw new Error('Usage: npm run admin:grant -- FIREBASE_UID');
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
  const user = await getAuth().getUser(uid);
  if (user.disabled) throw new Error('Cannot grant access to a disabled account.');
  const ref = getFirestore().collection('users').doc(uid);
  if (!(await ref.get()).exists)
    throw new Error('Sign in on the platform once before granting admin access.');
  await ref.update({ role: 'admin', updatedAt: new Date().toISOString() });
  await getAuth().revokeRefreshTokens(uid);
  console.log(`Administrator granted to ${uid}. Sign in again.`);
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
