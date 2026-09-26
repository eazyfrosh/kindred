import { test } from 'node:test';
import assert from 'node:assert/strict';
import { methodSchema, quoteAmount, canReview } from '../lib/manual-payment';
const method = {
  name: 'Test token',
  symbol: 'USDT',
  kind: 'crypto',
  network: 'TRC20',
  walletAddress: 'test-only-destination',
  instructions: '',
  minimumAmount: 1,
  displayOrder: 0,
  enabled: false,
  settlementCurrency: 'USD',
  unitsPerCurrency: 1,
  precision: 6,
  qrPath: '',
};
test('crypto requires a network, including multi-network tokens; QR paths cannot escape Storage folder', () => {
  assert.equal(methodSchema.safeParse(method).success, true);
  assert.equal(methodSchema.safeParse({ ...method, network: '' }).success, false);
  assert.equal(
    methodSchema.safeParse({ ...method, qrPath: 'profiles/private.png' }).success,
    false,
  );
  assert.equal(methodSchema.safeParse({ ...method, unitsPerCurrency: 0 }).success, false);
});
test('quotes calculate transfer units and reject unsafe amounts', () => {
  assert.equal(quoteAmount(1.1, { unitsPerCurrency: 1, precision: 2 }), '1.10');
  assert.equal(quoteAmount(25, { unitsPerCurrency: 0.00000001, precision: 8 }), '0.00000025');
  assert.equal(quoteAmount(25, { unitsPerCurrency: 0.00001, precision: 8 }), '0.00025000');
  assert.equal(quoteAmount(25, { unitsPerCurrency: 1, precision: 6 }), '25.000000');
  assert.throws(() => quoteAmount(100000, { unitsPerCurrency: 1000000, precision: 12 }));
});
test('confirmed, rejected and expired payments cannot be credited again', () => {
  for (const from of ['confirmed', 'rejected', 'expired'] as const)
    assert.equal(canReview(from, 'confirmed'), false);
  assert.equal(canReview('pending', 'confirmed'), true);
  assert.equal(canReview('verifying', 'rejected'), true);
});
