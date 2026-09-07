'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '@/firebase/client';
import { requestJSON } from './forms';
import { toast } from 'sonner';
export function AuthForm({ mode }: { mode: 'login' | 'signup' | 'forgot-password' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function establish() {
    const user = auth().currentUser;
    if (!user) throw new Error('Please sign in.');
    await requestJSON('/api/auth/session', { idToken: await user.getIdToken(true) });
    window.location.replace('/dashboard');
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      if (mode === 'forgot-password') {
        await sendPasswordResetEmail(auth(), f.email);
        toast.success('If an account exists, a reset email will arrive shortly.');
        return;
      }
      if (mode === 'signup') {
        if (f.password !== f.confirm) throw new Error('Passwords do not match.');
        if (f.password.length < 12)
          throw new Error('Use at least 12 characters for your password.');
        const result = await createUserWithEmailAndPassword(auth(), f.email, f.password);
        await updateProfile(result.user, { displayName: `${f.firstName} ${f.lastName}` });
        await sendEmailVerification(result.user);
        await requestJSON('/api/auth/session', {
          idToken: await result.user.getIdToken(),
          firstName: f.firstName,
          lastName: f.lastName,
        });
        toast.success('Account created. Check your email to verify your address.');
        window.location.replace('/dashboard');
      } else {
        await signInWithEmailAndPassword(auth(), f.email, f.password);
        await establish();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError('');
    try {
      await signInWithPopup(auth(), new GoogleAuthProvider());
      await establish();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-panel">
      <div className="eyebrow">A COMMUNITY OF POSSIBILITY</div>
      <h1>
        {mode === 'signup'
          ? 'Good to have you here.'
          : mode === 'login'
            ? 'Welcome back.'
            : 'Let’s get you back in.'}
      </h1>
      <p>
        {mode === 'signup'
          ? 'Create your account and start making a difference.'
          : mode === 'login'
            ? 'Your next act of kindness is waiting.'
            : 'Enter your email and we’ll send reset instructions.'}
      </p>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      <form onSubmit={submit}>
        {mode === 'signup' && (
          <div className="form-grid">
            <label>
              First name
              <input name="firstName" required maxLength={80} autoComplete="given-name" />
            </label>
            <label>
              Last name
              <input name="lastName" required maxLength={80} autoComplete="family-name" />
            </label>
          </div>
        )}
        <label>
          Email
          <input name="email" type="email" required autoComplete="email" maxLength={254} />
        </label>
        {mode !== 'forgot-password' && (
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={mode === 'signup' ? 12 : 1}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </label>
        )}
        {mode === 'signup' && (
          <>
            <label>
              Confirm password
              <input
                name="confirm"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </label>
            <label className="check-label">
              <input type="checkbox" required />I agree to the <Link href="/terms">terms</Link> and{' '}
              <Link href="/privacy">privacy policy</Link>.
            </label>
          </>
        )}
        <button className="button" disabled={busy}>
          {busy
            ? 'Please wait…'
            : mode === 'signup'
              ? 'Create account'
              : mode === 'login'
                ? 'Log in'
                : 'Send reset link'}
        </button>
      </form>
      {mode !== 'forgot-password' && (
        <>
          <div className="auth-divider">or continue with</div>
          <button className="button secondary" disabled={busy} onClick={google}>
            Google
          </button>
        </>
      )}
      <div className="auth-links">
        {mode === 'login' ? (
          <>
            <Link href="/forgot-password">Forgot password?</Link>
            <p className="mt-3">
              New here? <Link href="/signup">Create an account</Link>
            </p>
          </>
        ) : (
          <Link href="/login">Back to log in</Link>
        )}
      </div>
    </div>
  );
}
export function AccountAuthActions() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function action(kind: string) {
    setBusy(true);
    try {
      if (kind === 'logout') {
        await requestJSON('/api/auth/session', {}, 'DELETE');
        if (auth().currentUser) await signOut(auth());
        router.push('/login');
        router.refresh();
      } else if (kind === 'verify') {
        if (!auth().currentUser) throw new Error('Please log in again to send verification.');
        await sendEmailVerification(auth().currentUser!);
        toast.success('Verification email sent.');
      } else {
        await auth().currentUser?.reload();
        if (!auth().currentUser) throw new Error('Please log in again.');
        await requestJSON('/api/auth/session', {
          idToken: await auth().currentUser!.getIdToken(true),
        });
        router.refresh();
        toast.success('Account status refreshed.');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-actions">
      <button
        className="button secondary small-button"
        disabled={busy}
        onClick={() => action('verify')}
      >
        Send verification email
      </button>
      <button
        className="button secondary small-button"
        disabled={busy}
        onClick={() => action('refresh')}
      >
        Refresh verification
      </button>
      <button
        className="button secondary small-button"
        disabled={busy}
        onClick={() => action('logout')}
      >
        Log out
      </button>
    </div>
  );
}
