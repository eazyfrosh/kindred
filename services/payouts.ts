import 'server-only';
import { HttpError } from '@/lib/security';

/**
 * Payout provider boundary.
 *
 * Disbursement is deliberately isolated behind this server-only service so the
 * admin dashboard never talks to a banking provider directly. Credentials live
 * in environment variables or a secret manager; only a masked destination
 * summary and an opaque provider token are ever stored in Firestore, and no
 * account or routing number reaches the browser.
 *
 * Wire a concrete provider in `sendPayout` when one is contracted. Until then
 * the admin flow ends at `processing` → `paid` recorded by an administrator
 * with the provider's own reference, which keeps the ledger honest rather than
 * implying an automated transfer that did not happen.
 */
export interface PayoutInstruction {
  payoutId: string;
  amount: number;
  currency: string;
  /** Opaque provider-side token for the stored destination. Never raw bank details. */
  destinationRef: string;
  narration: string;
}

export interface PayoutReceipt {
  providerReference: string;
  status: 'processing' | 'paid';
}

export function payoutProviderConfigured() {
  return Boolean(process.env.PAYOUT_PROVIDER && process.env.PAYOUT_PROVIDER_SECRET);
}

export async function sendPayout(instruction: PayoutInstruction): Promise<PayoutReceipt> {
  if (!payoutProviderConfigured())
    throw new HttpError(
      503,
      'No payout provider is configured. Complete the transfer in your banking provider, then record the reference here.',
    );
  throw new HttpError(
    501,
    `Automated disbursement is not enabled for this deployment. Record the provider reference for payout ${instruction.payoutId} manually.`,
  );
}

/** Masks a destination for display. Full credentials are never rendered. */
export function maskDestination(summary: string) {
  const digits = summary.replace(/\D/g, '');
  if (digits.length < 4) return summary;
  return `${summary.replace(/\d/g, '•').slice(0, -4)}${digits.slice(-4)}`;
}
