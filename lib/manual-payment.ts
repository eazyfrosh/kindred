import { z } from 'zod';
const text = (max: number) => z.string().trim().min(1).max(max);
export const methodSchema = z
  .object({
    name: text(100),
    symbol: text(16).transform((v) => v.toUpperCase()),
    kind: z.enum(['crypto', 'custom']),
    network: z.string().trim().max(80),
    walletAddress: text(250),
    instructions: z.string().trim().max(3000),
    minimumAmount: z.number().min(1).max(100000).multipleOf(0.01),
    displayOrder: z.number().int().min(0).max(10000),
    enabled: z.boolean(),
    settlementCurrency: z.enum(['USD', 'NGN', 'GBP', 'EUR']),
    unitsPerCurrency: z.number().min(0.000000000001).max(1000000),
    precision: z.number().int().min(0).max(12),
    qrPath: z
      .string()
      .regex(/^payment-methods\/[a-f0-9-]+\.(png|jpg|webp)$/)
      .or(z.literal('')),
  })
  .refine((v) => v.kind !== 'crypto' || v.network.length > 0, {
    message: 'A network is required for every cryptocurrency, including multi-network tokens.',
    path: ['network'],
  });
export type PaymentMethod = z.infer<typeof methodSchema> & { id: string };
export const verificationStatuses = [
  'pending',
  'verifying',
  'confirmed',
  'rejected',
  'expired',
] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];
export interface ManualPayment {
  id: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  requiredAmount: string;
  donorId: string | null;
  donorName: string;
  donorEmail: string;
  campaignId: string;
  campaignTitle: string;
  status: VerificationStatus;
  transactionHash: string;
  createdAt: string;
  submittedAt?: string;
  expiresAt: string;
  reviewNote?: string;
}
export function quoteAmount(
  amount: number,
  method: Pick<PaymentMethod, 'unitsPerCurrency' | 'precision'>,
) {
  const cents = Math.round(amount * 100);
  if (
    !Number.isSafeInteger(cents) ||
    cents <= 0 ||
    Math.abs(amount * 100 - cents) > 1e-7 ||
    !Number.isFinite(method.unitsPerCurrency) ||
    method.unitsPerCurrency < 1e-12 ||
    method.unitsPerCurrency > 1e6 ||
    !Number.isInteger(method.precision) ||
    method.precision < 0 ||
    method.precision > 12
  )
    throw new Error('Invalid payment quote.');
  // Decimal arithmetic avoids charging an extra unit because of binary floating-point noise.
  const [mantissa, exponent = '0'] = method.unitsPerCurrency.toString().split('e');
  const decimals = (mantissa.split('.')[1]?.length || 0) - Number(exponent);
  const rate = BigInt(mantissa.replace('.', '')) * 10n ** BigInt(Math.max(0, -decimals));
  const denominator = 100n * 10n ** BigInt(Math.max(0, decimals));
  const scale = 10n ** BigInt(method.precision);
  const numerator = BigInt(cents) * rate * scale;
  const units = (numerator + denominator - 1n) / denominator;
  if (units > BigInt(Number.MAX_SAFE_INTEGER) || units <= 0n)
    throw new Error('Amount is outside this payment method’s supported range.');
  const digits = units.toString().padStart(method.precision + 1, '0');
  return method.precision
    ? `${digits.slice(0, -method.precision)}.${digits.slice(-method.precision)}`
    : digits;
}
export function canReview(from: VerificationStatus, to: VerificationStatus) {
  return (
    (from === 'pending' || from === 'verifying') &&
    ['verifying', 'confirmed', 'rejected', 'expired'].includes(to)
  );
}
