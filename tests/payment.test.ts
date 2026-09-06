import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  minorUnits,
  assertPaymentMatch,
  validSignature,
  verifyReceiptToken,
} from '../lib/payment-integrity';
import { campaignSchema, donationSchema } from '../lib/validation';
test('money conversion rejects fractional cents, negative and non-finite amounts', () => {
  assert.equal(minorUnits(25.99), 2599);
  for (const n of [0, -1, NaN, Infinity, 1.001]) assert.throws(() => minorUnits(n));
});
test('payment settlement checks currency, provider, and exact amount', () => {
  const expected = { amount: 25, currency: 'USD', paymentProvider: 'stripe' };
  assert.doesNotThrow(() =>
    assertPaymentMatch(expected, { amountMinor: 2500, currency: 'usd', provider: 'stripe' }),
  );
  for (const actual of [
    { amountMinor: 1, currency: 'USD', provider: 'stripe' },
    { amountMinor: 2500, currency: 'NGN', provider: 'stripe' },
    { amountMinor: 2500, currency: 'USD', provider: 'paystack' },
  ])
    assert.throws(() => assertPaymentMatch(expected, actual));
});
test('provider signatures fail on tampering, missing signatures, wrong keys and invalid length', () => {
  const raw = '{"amount":2500}';
  for (const [algo, encoding] of [
    ['sha512', 'hex'],
    ['sha256', 'base64'],
  ] as const) {
    const signature = createHmac(algo, 'test-secret').update(raw).digest(encoding);
    assert.equal(validSignature(raw, signature, 'test-secret', algo, encoding), true);
    assert.equal(validSignature(raw + ' ', signature, 'test-secret', algo, encoding), false);
    assert.equal(validSignature(raw, signature, 'wrong', algo, encoding), false);
    assert.equal(validSignature(raw, null, 'test-secret', algo, encoding), false);
    assert.equal(validSignature(raw, 'x', 'test-secret', algo, encoding), false);
  }
});
test('donation validation rejects browser supplied success and malformed amounts', () => {
  const data = {
    campaignId: 'test',
    amount: 25,
    frequency: 'once',
    firstName: 'A',
    lastName: 'B',
    email: 'a@example.org',
    country: 'Nigeria',
    message: '',
    anonymous: false,
    provider: 'stripe',
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    paymentStatus: 'successful',
  };
  const parsed = donationSchema.parse(data);
  assert.equal('paymentStatus' in parsed, false);
  assert.equal(donationSchema.safeParse({ ...data, amount: -10 }).success, false);
  assert.equal(donationSchema.safeParse({ ...data, amount: 1.001 }).success, false);
});
test('campaign allocation and deadline must be valid', () => {
  assert.equal(
    campaignSchema.safeParse({
      endDate: '2000-01-01',
      allocation: [{ label: 'Invalid', percent: 50 }],
    }).success,
    false,
  );
});

test('receipt tokens reject missing, malformed and guessed legacy values', () => {
  const expected = 'a'.repeat(64);
  assert.equal(verifyReceiptToken(expected, expected), true);
  assert.equal(verifyReceiptToken('missing', undefined), false);
  assert.equal(verifyReceiptToken('', ''), false);
  assert.equal(verifyReceiptToken('b'.repeat(64), expected), false);
});
