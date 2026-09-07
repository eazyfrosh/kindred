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
    await setDoc(doc(db, 'payouts/alice-payout'), {
      organizerId: 'alice',
      campaignId: 'public',
      amount: 100,
      status: 'requested',
    });
    await setDoc(doc(db, 'auditLogs/entry'), {
      adminId: 'admin',
      adminEmail: 'admin@example.org',
      action: 'campaign.approve',
      targetType: 'campaign',
      targetId: 'public',
    });
    await setDoc(doc(db, 'adminNotifications/alert'), {
      type: 'campaign_submitted',
      title: 'New campaign submitted',
      read: false,
    });
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
test('payouts are readable by their organizer and admins only', { skip: !enabled }, async () => {
  await assertSucceeds(
    getDoc(doc(env.authenticatedContext('alice').firestore(), 'payouts/alice-payout')),
  );
  await assertSucceeds(
    getDoc(doc(env.authenticatedContext('admin').firestore(), 'payouts/alice-payout')),
  );
  await assertFails(
    getDoc(doc(env.authenticatedContext('bob').firestore(), 'payouts/alice-payout')),
  );
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'payouts/alice-payout')));
  // Organizers request payouts through an authorized server route, never directly.
  await assertFails(
    updateDoc(doc(env.authenticatedContext('alice').firestore(), 'payouts/alice-payout'), {
      status: 'approved',
    }),
  );
  await assertFails(
    updateDoc(doc(env.authenticatedContext('admin').firestore(), 'payouts/alice-payout'), {
      status: 'paid',
    }),
  );
});
test('audit logs are closed to every client, including admins', { skip: !enabled }, async () => {
  for (const context of [
    env.unauthenticatedContext(),
    env.authenticatedContext('alice'),
    env.authenticatedContext('admin'),
  ]) {
    await assertFails(getDoc(doc(context.firestore(), 'auditLogs/entry')));
    await assertFails(setDoc(doc(context.firestore(), 'auditLogs/forged'), { action: 'forged' }));
    await assertFails(
      updateDoc(doc(context.firestore(), 'auditLogs/entry'), { action: 'rewritten' }),
    );
  }
});
test('admin notifications are admin-read and server-write only', { skip: !enabled }, async () => {
  await assertSucceeds(
    getDoc(doc(env.authenticatedContext('admin').firestore(), 'adminNotifications/alert')),
  );
  await assertFails(
    getDoc(doc(env.authenticatedContext('alice').firestore(), 'adminNotifications/alert')),
  );
  await assertFails(
    updateDoc(doc(env.authenticatedContext('admin').firestore(), 'adminNotifications/alert'), {
      read: true,
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
