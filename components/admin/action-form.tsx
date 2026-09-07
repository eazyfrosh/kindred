'use client';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { idle, type ActionState } from '@/lib/admin/action-state';
import { BUTTON, BUTTON_DANGER, BUTTON_SECONDARY, INPUT } from './theme';

type ServerAction = (state: ActionState, form: FormData) => Promise<ActionState>;

const VARIANTS = { primary: BUTTON, secondary: BUTTON_SECONDARY, danger: BUTTON_DANGER };

export function SubmitButton({
  children,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${VARIANTS[variant]} ${className}`}>
      {pending && <LoaderCircle size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

/** Surfaces the action result as a toast and as inline text for screen readers. */
function useActionToast(state: ActionState) {
  const seen = useRef<ActionState>(idle);
  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.error) toast.error(state.error);
    else if (state.ok && state.message) toast.success(state.message);
  }, [state]);
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** When set, the dialog collects a reason that is stored with the decision. */
  reasonLabel?: string;
  reasonRequired?: boolean;
  confirmLabel?: string;
}

/**
 * A single server-action button.
 *
 * Destructive and reason-bearing decisions open a confirmation dialog first;
 * the reason is submitted with the action and recorded in the audit log. All
 * authorization happens inside the server action, never here.
 */
export function ActionButton({
  action,
  fields,
  label,
  icon,
  variant = 'secondary',
  confirm,
  className = '',
}: {
  action: ServerAction;
  fields: Record<string, string>;
  label: string;
  icon?: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  confirm?: ConfirmOptions;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  // The dialog remembers which action result it was opened against, so a
  // successful submission closes it while a rejected one stays open with the
  // operator's text intact — no effect required.
  const [dialog, setDialog] = useState<{ open: boolean; against: ActionState }>({
    open: false,
    against: idle,
  });
  const open = dialog.open && !(state !== dialog.against && state.ok);
  const reasonId = useId();
  useActionToast(state);
  const closeDialog = () => setDialog({ open: false, against: state });

  const hidden = Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));

  if (!confirm)
    return (
      <form action={formAction} className={className}>
        {hidden}
        <SubmitButton variant={variant}>
          {icon}
          {label}
        </SubmitButton>
      </form>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setDialog({ open: true, against: state })}
        className={`${VARIANTS[variant]} ${className}`}
      >
        {icon}
        {label}
      </button>
      <ConfirmDialog
        open={open}
        onClose={closeDialog}
        title={confirm.title}
        description={confirm.description}
        danger={variant === 'danger'}
      >
        <form action={formAction} className="space-y-3">
          {hidden}
          {confirm.reasonLabel && (
            <label htmlFor={reasonId} className="block text-sm font-medium text-[#344054]">
              {confirm.reasonLabel}
              <textarea
                id={reasonId}
                name="reason"
                rows={3}
                required={confirm.reasonRequired !== false}
                minLength={10}
                maxLength={2000}
                placeholder="This is stored with the decision and shared with the organizer."
                className={`${INPUT} mt-1 font-normal`}
              />
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeDialog} className={BUTTON_SECONDARY}>
              Cancel
            </button>
            <SubmitButton variant={variant === 'danger' ? 'danger' : 'primary'}>
              {confirm.confirmLabel || label}
            </SubmitButton>
          </div>
        </form>
      </ConfirmDialog>
    </>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  danger,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#101828]/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-lg border border-[#e4e7ec] bg-white p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start gap-3">
          {danger && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fef3f2] text-[#b42318]">
              <TriangleAlert size={17} />
            </span>
          )}
          <div>
            <h2 className="text-[15px] font-semibold leading-6 text-[#101828]">{title}</h2>
            {description && <p className="mt-1 text-sm leading-5 text-[#667085]">{description}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * Wraps a longer editing form (settings, content, records) with the shared
 * pending state, toast handling, and inline error region.
 */
export function AdminForm({
  action,
  children,
  className = '',
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, idle);
  useActionToast(state);
  return (
    <form action={formAction} className={className}>
      {state.error && (
        <p
          role="alert"
          className="mb-3 rounded-md border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-sm text-[#b42318]"
        >
          {state.error}
        </p>
      )}
      {children}
    </form>
  );
}
