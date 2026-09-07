'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../auth';
import { transitionPayout } from '../payouts';
import { payoutActionSchema } from '../schemas';
import { invalidateCache } from '../cache';
import { type ActionState, field, success, toActionError } from '../action-result';

export async function transitionPayoutAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = payoutActionSchema.parse({
      action: field(form, 'action'),
      id: field(form, 'id'),
      note: field(form, 'note'),
      ...(form.has('providerReference')
        ? { providerReference: field(form, 'providerReference') }
        : {}),
    });
    await transitionPayout(actor, input);
    invalidateCache();
    revalidatePath('/admin/payouts');
    revalidatePath(`/admin/payouts/${input.id}`);
    return success('Payout updated.');
  } catch (error) {
    return toActionError(error);
  }
}
