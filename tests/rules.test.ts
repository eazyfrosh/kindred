import { test, after, before } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
test(
  'manual payment configuration, accounting and audit records reject direct client writes',
  { skip: !enabled },
  async () => {
    for (const uid of ['alice', 'admin']) {
      const client = env.authenticatedContext(uid).firestore();
      for (const path of [
        'paymentMethods/test',
        'manualPayments/test',
        'auditLogs/test',
        '_manualSubmissions/test',
      ])
        await assertFails(setDoc(doc(client, path), { status: 'confirmed', enabled: true }));
    }
    await assertFails(
      uploadBytes(
        ref(env.authenticatedContext('admin').storage(), 'payment-methods/test.png'),
        new Uint8Array([137, 80, 78, 71]),
        { contentType: 'image/png' },
      ),
    );
  },
);
let env: RulesTestEnvironment;
before(async () => {
  if (!enabled) return;
  env = await initializeTestEnvironment({
    projectId: 'demo-kindred',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8') },
    storage: { rules: readFileSync('firebase/storage.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), {
      role: 'user',
      disabled: false,
      firstName: 'Alice',
      lastName: 'Doe',
    });
    await setDoc(doc(db, 'users/admin'), { role: 'admin', disabled: false });
    await setDoc(doc(db, 'campaigns/public'), {
      status: 'approved',
      organizerId: 'alice',
      amountRaised: 0,
    });
    await setDoc(doc(db, 'campaigns/private'), { status: 'pending', organizerId: 'alice' });
    await setDoc(doc(db, 'donations/private'), { donorId: 'alice', paymentStatus: 'pending' });
  });
});
after(async () => {
  if (env) await env.cleanup();
});
test('public can read approved campaigns but not private data', { skip: !enabled }, async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db, 'campaigns/public')));
  await assertFails(getDoc(doc(db, 'campaigns/private')));
  await assertFails(getDoc(doc(db, 'donations/private')));
  await assertFails(getDoc(doc(db, 'users/alice')));
});
test(
  'users cannot escalate roles, forge payments, or change counters',
  { skip: !enabled },
  async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(db, 'users/alice'), { role: 'admin' }));
    await assertFails(updateDoc(doc(db, 'campaigns/public'), { amountRaised: 5000 }));
    await assertFails(updateDoc(doc(db, 'donations/private'), { paymentStatus: 'successful' }));
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { firstName: 'Alicia' }));
  },
);
test('private profile ownership and server-only admin writes', { skip: !enabled }, async () => {
  await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'users/alice')));
  await assertFails(
    updateDoc(doc(env.authenticatedContext('admin').firestore(), 'campaigns/public'), {
      amountRaised: 9000,
    }),
  );
});
test(
  'uploads allow verified owners and reject anonymous, unverified, wrong-owner, oversized and invalid files',
  { skip: !enabled },
  async () => {
    await assertSucceeds(
      uploadBytes(
        ref(
          env.authenticatedContext('alice', { email_verified: true }).storage(),
          'campaigns/alice/valid.jpg',
        ),
        new Uint8Array([255, 216, 255]),
        { contentType: 'image/jpeg' },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(
          env.authenticatedContext('alice', { email_verified: false }).storage(),
          'campaigns/alice/unverified.jpg',
        ),
        new Uint8Array([1]),
        { contentType: 'image/jpeg' },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(
          env.authenticatedContext('alice', { email_verified: true }).storage(),
          'campaigns/alice/large.jpg',
        ),
        new Uint8Array(5 * 1024 * 1024 + 1),
        { contentType: 'image/jpeg' },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(env.unauthenticatedContext().storage(), 'campaigns/alice/test.jpg'),
        new Uint8Array([1]),
        { contentType: 'image/jpeg' },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(
          env.authenticatedContext('alice', { email_verified: true }).storage(),
          'campaigns/bob/test.jpg',
        ),
        new Uint8Array([1]),
        { contentType: 'image/jpeg' },
      ),
    );
    await assertFails(
      uploadBytes(
        ref(
          env.authenticatedContext('alice', { email_verified: true }).storage(),
          'campaigns/alice/test.html',
        ),
        new Uint8Array([1]),
        { contentType: 'text/html' },
      ),
    );
  },
);
