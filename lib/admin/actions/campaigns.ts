'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '../auth';
import { moderateCampaign, updateCampaignDetails } from '../campaigns';
import { campaignActionSchema, campaignEditSchema } from '../schemas';
import { invalidateCache } from '../cache';
import { type ActionState, field, success, toActionError } from '../action-result';

export async function moderateCampaignAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  let deleted = false;
  try {
    const actor = await requireAdmin();
    const input = campaignActionSchema.parse({
      action: field(form, 'action'),
      id: field(form, 'id'),
      ...(form.has('reason') ? { reason: field(form, 'reason') } : {}),
    });
    await moderateCampaign(actor, input);
    deleted = input.action === 'delete';
    invalidateCache();
    revalidatePath('/admin');
    revalidatePath('/admin/campaigns');
    revalidatePath(`/admin/campaigns/${input.id}`);
  } catch (error) {
    return toActionError(error);
  }
  if (deleted && field(form, 'redirectTo')) redirect(field(form, 'redirectTo'));
  return success('Campaign updated.');
}

export async function updateCampaignAction(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = campaignEditSchema.parse(Object.fromEntries(form));
    await updateCampaignDetails(actor, input);
    invalidateCache();
    revalidatePath(`/admin/campaigns/${input.id}`);
    return success('Campaign details saved.');
  } catch (error) {
    return toActionError(error);
  }
}
