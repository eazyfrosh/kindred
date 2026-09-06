import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.USE_FIREBASE_EMULATORS = 'true';
process.env.FIREBASE_ADMIN_PROJECT_ID = 'demo-kindred';
if (!process.env.FIRESTORE_EMULATOR_HOST)
  throw new Error('Run this integration test inside the Firebase emulator.');
const { db, adminApp } = await import('../firebase/admin');
const { settlePayment, recordStripeRefund } = await import('../services/payments');
const { deleteApp } = await import('firebase-admin/app');
const campaignId = `ledger-${randomUUID()}`;
async function intent(amount = 25, frequency = 'once') {
  const id = `test-${randomUUID()}`;
  await db().collection('donations').doc(id).set({
    id,
    campaignId,
    campaignTitle: 'Test cause',
    donorId: 'test-donor',
    donorName: 'Test Donor',
    donorEmail: 'test@example.org',
    amount,
    currency: 'USD',
    anonymous: true,
    message: 'Private',
    paymentProvider: 'stripe',
    paymentReference: id,
    paymentStatus: 'pending',
    frequency,
    receiptToken: 'test-token',
    createdAt: new Date().toISOString(),
  });
  return id;
}
test('concurrent duplicate webhooks settle once; mismatched payments leave totals intact; recurring invoices count once each', async () => {
  await db().collection('campaigns').doc(campaignId).set({
    amountRaised: 0,
    goalAmount: 100,
    donorCount: 0,
    organizerId: 'organizer',
    status: 'approved',
  });
  const id = await intent();
  const payment = {
    reference: id,
    transactionId: `pi_${randomUUID()}`,
    amountMinor: 2500,
    currency: 'USD',
    provider: 'stripe' as const,
  };
  await Promise.all(Array.from({ length: 6 }, () => settlePayment(payment)));
  let campaign = (await db().collection('campaigns').doc(campaignId).get()).data()!;
  assert.equal(campaign.amountRaised, 25);
  assert.equal(campaign.donorCount, 1);
  const donor = (await db().collection('publicDonations').doc(id).get()).data()!;
  assert.equal(donor.donorName, 'Anonymous supporter');
  assert.equal(donor.message, '');
  assert.equal('donorEmail' in donor, false);
  const badId = await intent();
  await assert.rejects(
    settlePayment({ ...payment, reference: badId, transactionId: randomUUID(), amountMinor: 1 }),
  );
  assert.equal(
    (await db().collection('donations').doc(badId).get()).data()!.paymentStatus,
    'pending',
  );
  assert.equal((await db().collection('campaigns').doc(campaignId).get()).data()!.amountRaised, 25);
  const monthlyId = await intent(10, 'monthly');
  const invoice = {
    reference: monthlyId,
    transactionId: `in_${randomUUID()}`,
    amountMinor: 1000,
    currency: 'USD',
    provider: 'stripe' as const,
    recurring: true,
  };
  await settlePayment(invoice);
  await settlePayment(invoice);
  await settlePayment({ ...invoice, transactionId: `in_${randomUUID()}` });
  campaign = (await db().collection('campaigns').doc(campaignId).get()).data()!;
  assert.equal(campaign.amountRaised, 45);
  assert.equal(campaign.donorCount, 1);
  assert.equal(campaign.fundingRatio, 0.45);
  const records = await db()
    .collection('donations')
    .where('campaignId', '==', campaignId)
    .where('paymentStatus', '==', 'successful')
    .get();
  assert.equal(records.size, 3);
  await recordStripeRefund(payment.transactionId, 1000);
  await recordStripeRefund(payment.transactionId, 1000);
  assert.equal((await db().collection('campaigns').doc(campaignId).get()).data()!.amountRaised, 35);
  await assert.rejects(recordStripeRefund(payment.transactionId, 3000));
  await recordStripeRefund(payment.transactionId, 2500);
  assert.equal((await db().collection('campaigns').doc(campaignId).get()).data()!.amountRaised, 20);
  assert.equal(
    (await db().collection('donations').doc(id).get()).data()!.paymentStatus,
    'refunded',
  );
});
after(async () => {
  await deleteApp(adminApp());
});
