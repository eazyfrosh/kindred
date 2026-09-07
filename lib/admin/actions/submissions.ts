'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../auth';
import { administerMessage, administerVolunteer, removeSubscriber } from '../submissions';
import { markAllNotificationsRead, markNotificationRead } from '../notifications';
import { messageActionSchema, subscriberActionSchema, volunteerActionSchema } from '../schemas';
import { type ActionState, field, success, toActionError } from '../action-result';

export async function volunteerAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = volunteerActionSchema.parse({
      action: field(form, 'action'),
      id: field(form, 'id'),
      ...(form.has('status') ? { status: field(form, 'status') } : {}),
      ...(form.has('notes') ? { notes: field(form, 'notes') } : {}),
    });
    await administerVolunteer(actor, input);
    revalidatePath('/admin/volunteers');
    return success('Application updated.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function messageAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = messageActionSchema.parse({
      action: field(form, 'action'),
      id: field(form, 'id'),
      ...(form.has('status') ? { status: field(form, 'status') } : {}),
    });
    await administerMessage(actor, input);
    revalidatePath('/admin/messages');
    return success('Message updated.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function subscriberAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    const actor = await requireAdmin();
    const input = subscriberActionSchema.parse({ action: 'delete', id: field(form, 'id') });
    await removeSubscriber(actor, input.id);
    revalidatePath('/admin/newsletter');
    return success('Subscriber removed.');
  } catch (error) {
    return toActionError(error);
  }
}

export async function notificationAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
    if (field(form, 'action') === 'all') await markAllNotificationsRead();
    else await markNotificationRead(field(form, 'id'), field(form, 'action') !== 'unread');
    revalidatePath('/admin/notifications');
    revalidatePath('/admin');
    return success('Notifications updated.');
  } catch (error) {
    return toActionError(error);
  }
}
