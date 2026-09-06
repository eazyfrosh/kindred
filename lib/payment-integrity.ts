import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifyReceiptToken(token: string | undefined, expected: unknown) {
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected) || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function validSignature(
  raw: string,
  signature: string | null,
  secret: string,
  algorithm: 'sha256' | 'sha512',
  encoding: 'hex' | 'base64',
) {
  if (!signature || !secret) return false;
  const expected = Buffer.from(createHmac(algorithm, secret).update(raw).digest(encoding));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
export function minorUnits(amount: number) {
  const result = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(result) ||
    Math.abs(result / 100 - amount) > 0.000001
  )
    throw new Error('Invalid payment amount.');
  return result;
}
export function assertPaymentMatch(
  expected: { amount: number; currency: string; paymentProvider: string },
  actual: { amountMinor: number; currency: string; provider: string },
) {
  if (
    actual.amountMinor !== minorUnits(expected.amount) ||
    actual.currency.toUpperCase() !== expected.currency.toUpperCase() ||
    actual.provider !== expected.paymentProvider
  )
    throw new Error('Payment does not match the recorded donation intent.');
}
