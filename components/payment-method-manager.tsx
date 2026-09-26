'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { requestJSON } from './forms';
import { methodSchema, type PaymentMethod } from '@/lib/manual-payment';
const blank: Omit<PaymentMethod, 'id'> = {
  name: '',
  symbol: '',
  kind: 'crypto',
  network: '',
  walletAddress: '',
  instructions: '',
  minimumAmount: 1,
  displayOrder: 0,
  enabled: false,
  settlementCurrency: 'USD',
  unitsPerCurrency: 1,
  precision: 8,
  qrPath: '',
};
export function PaymentMethodManager({ methods }: { methods: PaymentMethod[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  function field<K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) {
    setForm({ ...form, [key]: value });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const parsed = methodSchema.parse(form);
      await requestJSON('/api/admin/payment-methods', {
        ...(editing ? { id: editing } : {}),
        method: parsed,
      });
      toast.success('Payment method saved.');
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.set('file', file);
      const r = await fetch('/api/admin/payment-methods/qr', { method: 'POST', body });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      field('qrPath', result.path);
      toast.success('QR image uploaded. Save the method to publish it.');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <div className="eyebrow">GIVING, YOUR WAY</div>
          <h1>Payment methods</h1>
          <p>Configure wallets, networks and instructions. New methods start disabled.</p>
        </div>
        <button
          className="button"
          onClick={() => {
            setEditing(null);
            setForm(blank);
            setOpen(true);
          }}
        >
          + Add Payment Method
        </button>
      </div>
      {open && (
        <form onSubmit={save} className="panel mb-8">
          <h2>{editing ? 'Edit payment method' : 'Add payment method'}</h2>
          <div className="form-grid">
            <label>
              Name
              <input required value={form.name} onChange={(e) => field('name', e.target.value)} />
            </label>
            <label>
              Symbol
              <input
                required
                maxLength={16}
                value={form.symbol}
                onChange={(e) => field('symbol', e.target.value.toUpperCase())}
              />
            </label>
            <label>
              Type
              <select
                value={form.kind}
                onChange={(e) => field('kind', e.target.value as 'crypto' | 'custom')}
              >
                <option value="crypto">Cryptocurrency</option>
                <option value="custom">Custom / manual</option>
              </select>
            </label>
            <label>
              Network (required for crypto)
              <input
                required={form.kind === 'crypto'}
                placeholder="Bitcoin, Ethereum, TRC20, ERC20, BEP20…"
                value={form.network}
                onChange={(e) => field('network', e.target.value)}
              />
            </label>
            <label className="full">
              Wallet address / payment destination
              <input
                required
                maxLength={250}
                value={form.walletAddress}
                onChange={(e) => field('walletAddress', e.target.value)}
              />
            </label>
            <label className="full">
              Payment instructions
              <textarea
                maxLength={3000}
                value={form.instructions}
                onChange={(e) => field('instructions', e.target.value)}
              />
            </label>
            <label>
              Campaign currency
              <select
                value={form.settlementCurrency}
                onChange={(e) =>
                  field('settlementCurrency', e.target.value as typeof form.settlementCurrency)
                }
              >
                {['USD', 'NGN', 'GBP', 'EUR'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Units of {form.symbol || 'asset'} per 1 {form.settlementCurrency}
              <input
                type="number"
                required
                step="any"
                min="0.000000000001"
                value={form.unitsPerCurrency}
                onChange={(e) => field('unitsPerCurrency', Number(e.target.value))}
              />
            </label>
            <label>
              Asset decimal places
              <input
                type="number"
                min={0}
                max={12}
                required
                value={form.precision}
                onChange={(e) => field('precision', Number(e.target.value))}
              />
            </label>
            <label>
              Minimum donation ({form.settlementCurrency})
              <input
                type="number"
                min={1}
                max={100000}
                step="0.01"
                required
                value={form.minimumAmount}
                onChange={(e) => field('minimumAmount', Number(e.target.value))}
              />
            </label>
            <label>
              Display order
              <input
                type="number"
                min={0}
                max={10000}
                required
                value={form.displayOrder}
                onChange={(e) => field('displayOrder', Number(e.target.value))}
              />
            </label>
            <label>
              QR image (optional, maximum 2 MB)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
          </div>
          <p className="notice">
            Without an uploaded image, a QR code is generated from the saved destination. Quotes
            lock your configured rate for 24 hours. Review rates before enabling a method. For
            uploaded QR images, verify that the scanned destination matches the address.
          </p>
          {form.qrPath && (
            <button type="button" className="text-link" onClick={() => field('qrPath', '')}>
              Use generated QR instead of uploaded image
            </button>
          )}
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => field('enabled', e.target.checked)}
            />
            Enabled at checkout
          </label>
          <div className="action-row">
            <button className="button" disabled={busy}>
              Save method
            </button>
            <button type="button" className="button secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {!methods.length && (
        <div className="notice">
          No payment methods yet. Add a method to make it available at checkout.
        </div>
      )}
      <div className="three-grid">
        {methods.map((m) => (
          <article className="panel" key={m.id}>
            <span className="status">{m.enabled ? 'Enabled' : 'Disabled'}</span>
            <h2>{m.name}</h2>
            <p>
              {m.symbol} · {m.network || 'Custom method'}
            </p>
            <Image
              unoptimized
              width={160}
              height={160}
              src={`/api/payment-methods/qr?method=${m.id}`}
              alt={`${m.name} payment QR`}
            />
            <p className="break-all small">{m.walletAddress}</p>
            <p>
              Minimum {m.settlementCurrency} {m.minimumAmount} · Order {m.displayOrder}
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setEditing(m.id);
                setForm(m);
                setOpen(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Edit method
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
