import 'server-only';
import { ZodError } from 'zod';
import { HttpError } from '@/lib/security';
import type { ActionState } from './action-state';

export { idle, type ActionState } from './action-state';

/**
 * Turns a thrown error into a message that is safe to render.
 *
 * Validation and deliberate `HttpError`s carry text written for the operator;
 * anything else is logged server-side and reported generically so internal
 * details and Firebase configuration never reach the browser.
 */
export function toActionError(error: unknown): ActionState {
  if (error instanceof ZodError)
    return {
      ok: false,
      error: error.issues
        .map((issue) => `${issue.path.join('.') || 'field'}: ${issue.message}`)
        .join('; '),
    };
  if (error instanceof HttpError) return { ok: false, error: error.message };
  console.error('Admin action failed:', error instanceof Error ? error.message : 'Unknown error');
  return { ok: false, error: 'We could not complete this action. Please try again.' };
}

export const success = (message: string): ActionState => ({ ok: true, message });

/** Reads a form field as a trimmed string. */
export const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim();
export const boolField = (form: FormData, name: string) =>
  form.get(name) === 'on' || form.get(name) === 'true';
