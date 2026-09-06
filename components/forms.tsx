'use client';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
export async function requestJSON(url: string, data?: unknown, method = 'POST') {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || 'Something went wrong. Please try again.');
  return json;
}
export function SubmissionForm({ kind }: { kind: 'contact' | 'volunteer' | 'newsletter' }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await requestJSON(`/api/submissions/${kind}`, {
        ...data,
        ...(kind === 'newsletter' ? { consent: data.consent === 'on' } : {}),
      });
      setDone(true);
      toast.success('Thank you. Your submission has been received.');
      form.reset();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="notice success" role="status">
        {kind === 'newsletter'
          ? 'You’re on the list. Thank you for joining our community.'
          : 'Thank you. Our team has received your message and will be in touch.'}
      </div>
    );
  return (
    <form onSubmit={submit} className={kind === 'newsletter' ? 'newsletter-form' : 'form-grid'}>
      <div className="honeypot" aria-hidden="true">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {kind !== 'newsletter' && (
        <label>
          Your name
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
      )}
      <label className={kind === 'newsletter' ? 'newsletter-email' : ''}>
        {kind === 'newsletter' ? <span className="sr-only">Email address</span> : 'Email address'}
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          placeholder={kind === 'newsletter' ? 'Your email address' : undefined}
          autoComplete="email"
        />
      </label>
      {kind === 'contact' && (
        <label className="full">
          Subject
          <input name="subject" required maxLength={160} />
        </label>
      )}
      {kind === 'volunteer' && (
        <>
          <label>
            Phone number
            <input name="phone" required type="tel" maxLength={40} />
          </label>
          <label>
            Country
            <input name="country" required maxLength={100} autoComplete="country-name" />
          </label>
          <label className="full">
            Area of interest
            <select name="interest" required>
              <option value="">Choose an area</option>
              {[
                'Community outreach',
                'Education',
                'Food support',
                'Environment',
                'Campaign support',
                'Other',
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="full">
            Your skills
            <textarea name="skills" required maxLength={2000} rows={3} />
          </label>
        </>
      )}
      {kind !== 'newsletter' && (
        <label className="full">
          {kind === 'volunteer' ? 'Tell us why you’d like to help' : 'Your message'}
          <textarea name="message" required maxLength={5000} rows={5} />
        </label>
      )}
      {kind === 'newsletter' && (
        <label className="check-label full">
          <input name="consent" type="checkbox" required /> I agree to receive news and impact
          updates. Unsubscribe anytime.
        </label>
      )}
      <button className="button" disabled={busy}>
        {busy ? <LoaderCircle className="spin" size={18} /> : null}
        {kind === 'newsletter'
          ? 'Count me in'
          : kind === 'contact'
            ? 'Send message'
            : 'Send application'}
        <ArrowUpRight size={18} />
      </button>
      <p className="small muted full">
        We use your information only to respond to your request.{' '}
        <Link href="/privacy">Privacy policy</Link>
      </p>
    </form>
  );
}
