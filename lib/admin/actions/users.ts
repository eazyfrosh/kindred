'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../auth';
import { administerUser } from '../users';
import { userActionSchema } from '../schemas';
import { invalidateCache } from '../cache';
import { type ActionState, field, success, toActionError } from '../action-result';

export async function administerUserAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = userActionSchema.parse({
      action: field(form, 'action'),
      uid: field(form, 'uid'),
      ...(form.has('role') ? { role: field(form, 'role') } : {}),
      ...(form.has('reason') ? { reason: field(form, 'reason') } : {}),
      ...(form.has('notes') ? { notes: field(form, 'notes') } : {}),
    });
    await administerUser(actor, input);
    invalidateCache();
    revalidatePath('/admin/users');
    revalidatePath('/admin/fundraisers');
    revalidatePath(`/admin/users/${input.uid}`);
    return success('Account updated.');
  } catch (error) {
    return toActionError(error);
  }
}
