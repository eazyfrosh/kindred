'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { money } from '@/lib/brand';
import type { Campaign } from '@/types';
import { requestJSON } from './forms';
export function DonationForm({
  campaign: c,
  providers,
}: {
  campaign: Campaign;
  providers: string[];
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(25);
  const [frequency, setFrequency] = useState('once');
  const [provider, setProvider] = useState(providers[0] || 'stripe');
  const [key, setKey] = useState('');
  const [donor, setDonor] = useState({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    message: '',
    anonymous: false,
  });
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    setBusy(true);
    try {
      const idempotencyKey = key || crypto.randomUUID();
      setKey(idempotencyKey);
      const result = await requestJSON('/api/donations/initialize', {
        campaignId: c.id,
        amount,
        frequency,
        provider,
        ...donor,
        idempotencyKey,
      });
      window.location.assign(result.url);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="donation-layout">
      <div>
        <div className="step-indicator">
          {['Your gift', 'Your details', 'Secure payment'].map((x, i) => (
            <span key={x} className={i <= step ? 'active' : ''}>
              {i + 1}. {x}
            </span>
          ))}
        </div>
        <form className="panel" onSubmit={submit}>
          <h2 className="text-2xl">
            {
              [
                'How much kindness will you share?',
                'A little about you.',
                'You’re one step from making a difference.',
              ][step]
            }
          </h2>
          {step === 0 && (
            <>
              <div className="toggle-group">
                <button
                  className={`choice ${frequency === 'once' ? 'active' : ''}`}
                  type="button"
                  onClick={() => setFrequency('once')}
                >
                  One-time gift
                </button>
                <button
                  className={`choice ${frequency === 'monthly' ? 'active' : ''}`}
                  type="button"
                  onClick={() => {
                    setFrequency('monthly');
                    setProvider('stripe');
                  }}
                >
                  Give monthly
                </button>
              </div>
              <div className="amount-grid">
                {[10, 25, 50, 100, 250].map((a) => (
                  <button
                    key={a}
                    className={`choice ${amount === a ? 'active' : ''}`}
                    type="button"
                    onClick={() => setAmount(a)}
                  >
                    {money(a, c.currency)}
                  </button>
                ))}
                <button
                  className="choice"
                  type="button"
                  onClick={() => {
                    setAmount(0);
                    document.getElementById('custom-amount')?.focus();
                  }}
                >
                  Custom
                </button>
              </div>
              <label>
                Donation amount ({c.currency})
                <input
                  id="custom-amount"
                  type="number"
                  required
                  min={1}
                  max={100000}
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              {frequency === 'monthly' && (
                <p className="notice mt-5">
                  A monthly gift repeats until you cancel. Sign in to manage it from your account.
                  Monthly checkout uses Stripe.
                </p>
              )}
            </>
          )}
          {step === 1 && (
            <div className="form-grid">
              {(['firstName', 'lastName', 'email', 'country'] as const).map((name, i) => (
                <label key={name}>
                  {['First name', 'Last name', 'Email address', 'Country'][i]}
                  <input
                    type={name === 'email' ? 'email' : 'text'}
                    value={donor[name]}
                    required
                    maxLength={name === 'email' ? 254 : 100}
                    onChange={(e) => setDonor({ ...donor, [name]: e.target.value })}
                  />
                </label>
              ))}
              <label className="full">
                A message of support (optional)
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={donor.message}
                  onChange={(e) => setDonor({ ...donor, message: e.target.value })}
                />
              </label>
              <label className="full check-label">
                <input
                  type="checkbox"
                  checked={donor.anonymous}
                  onChange={(e) => setDonor({ ...donor, anonymous: e.target.checked })}
                />
                Show my gift anonymously to the public
              </label>
            </div>
          )}
          {step === 2 && (
            <>
              <div className="notice">
                {money(amount, c.currency)} {frequency === 'monthly' ? 'every month' : 'one-time'}{' '}
                to {c.title}
              </div>
              <label>
                Payment provider
                <select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  {(providers.length ? providers : ['stripe', 'paystack', 'flutterwave'])
                    .filter((p) => frequency === 'once' || p === 'stripe')
                    .map((p) => (
                      <option key={p} value={p}>
                        {p[0].toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                </select>
              </label>
              <p className="small mt-5">
                You’ll enter payment details on the provider’s secure checkout. Kindred never
                receives or stores your card number or CVV.
              </p>
              <label className="check-label">
                <input type="checkbox" required />I agree to the{' '}
                <Link href="/terms">giving terms</Link>.
              </label>
            </>
          )}
          <div className="wizard-actions">
            <button
              className="button secondary"
              type="button"
              disabled={busy || step === 0}
              onClick={() => {
                setStep(step - 1);
                setKey('');
              }}
            >
              Back
            </button>
            <button className="button" disabled={busy}>
              {busy ? 'Opening checkout…' : step === 2 ? 'Continue to payment' : 'Continue'}
              <ArrowUpRight size={17} />
            </button>
          </div>
        </form>
      </div>
      <aside className="panel">
        <div className="donation-summary-image">
          <Image src={c.coverImage} alt={c.title} fill sizes="(max-width:600px) 100vw, 35vw" />
        </div>
        <span className="eyebrow">YOU’RE SUPPORTING</span>
        <h3>{c.title}</h3>
        <p className="small">Organized by {c.organizerName}</p>
        <hr className="border-gray-200 mb-5" />
        <h3>
          {money(amount, c.currency)}
          {frequency === 'monthly' && <span className="small"> / month</span>}
        </h3>
        <p className="small">
          <ShieldCheck size={16} className="inline mr-1" />
          Your kindness. Securely delivered.
        </p>
        <Link className="text-link" href={`/campaign/${c.slug}`}>
          Back to campaign
        </Link>
      </aside>
    </div>
  );
}
