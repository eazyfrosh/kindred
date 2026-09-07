'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../auth';
import { adjustDonationStatus } from '../donations';
import { donationAdjustmentSchema } from '../schemas';
import { invalidateCache } from '../cache';
import { type ActionState, field, success, toActionError } from '../action-result';

/**
 * Records an out-of-band refund, dispute, or abandoned intent. There is no path
 * here to mark a payment successful — that only ever comes from a verified
 * provider webhook.
 */
export async function adjustDonationAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = donationAdjustmentSchema.parse({
      id: field(form, 'id'),
      status: field(form, 'status'),
      reason: field(form, 'reason'),
    });
    await adjustDonationStatus(actor, input);
    invalidateCache();
    revalidatePath('/admin/donations');
    revalidatePath(`/admin/donations/${input.id}`);
    return success('Donation record adjusted and written to the audit log.');
  } catch (error) {
    return toActionError(error);
  }
}
