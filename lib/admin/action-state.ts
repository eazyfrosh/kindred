/**
 * The shape a server action returns to the form that called it.
 *
 * Kept in its own module with no server imports so client components can use it
 * without pulling the Firebase Admin SDK into the browser bundle.
 */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
}

export const idle: ActionState = {};
