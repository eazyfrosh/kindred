import 'server-only';
import type { ManualPayment } from '@/lib/manual-payment';
/** Future adapters must independently fetch network, destination, asset, amount and finality.
 * No adapter is registered: the current release requires administrator review.
 * Verification does not mutate accounting; settlement must use the idempotent ledger.
 */
export interface BlockchainVerifier {
  verify(payment: ManualPayment): Promise<{
    status: 'verifying' | 'confirmed' | 'rejected';
    network: string;
    destination: string;
    asset: string;
    transferredUnits: string;
    confirmations: number;
    evidence: string;
  }>;
}
