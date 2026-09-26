'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { requestJSON } from './forms';
import type { ManualPayment } from '@/lib/manual-payment';
export function ManualPaymentCheckout({
  payment: p,
  token,
  initiallyExpired,
}: {
  payment: ManualPayment;
  token: string;
  initiallyExpired: boolean;
}) {
  const router = useRouter();
  const [hash, setHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(initiallyExpired);
  useEffect(() => {
    const timer = setTimeout(
      () => setExpired(true),
      Math.max(0, Date.parse(p.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [p.expiresAt]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await requestJSON(
        '/api/manual-payments',
        { id: p.id, token, transactionHash: hash },
        'PATCH',
      );
      toast.success('Transaction submitted. Your payment is pending verification.');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container section max-w-3xl">
      <div className="eyebrow">YOUR ACT OF KINDNESS</div>
      <h1>{p.status === 'confirmed' ? 'Donation confirmed' : 'Complete your donation'}</h1>
      <div className="panel">
        <span className="status">{p.status}</span>
        <h2>{p.method.name}</h2>
        <p>
          Supporting {p.campaignTitle} · {p.currency} {p.amount}
        </p>
        {p.status === 'confirmed' ? (
          <Link className="button" href={`/donation/success?reference=${p.id}&token=${token}`}>
            View receipt
          </Link>
        ) : (
          <>
            <p className="text-3xl font-bold">
              {p.requiredAmount} {p.method.symbol}
            </p>
            <p>
              Network: <strong>{p.method.network || 'Custom/manual method'}</strong>
            </p>
            <p className="notice">
              {p.method.kind === 'crypto'
                ? 'Send only the selected asset on the exact network shown. Transfers on another network may be unrecoverable.'
                : 'Follow the payment instructions exactly and include your transaction reference.'}
            </p>
            {!expired && p.status === 'pending' && !p.transactionHash && (
              <>
                <Image
                  unoptimized
                  width={260}
                  height={260}
                  src={`/api/payment-methods/qr?payment=${p.id}&token=${token}`}
                  alt="Scan payment destination"
                />
                <label>
                  Wallet address / destination
                  <textarea readOnly value={p.method.walletAddress} />
                </label>
                <button
                  type="button"
                  className="button secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(p.method.walletAddress);
                      toast.success('Address copied.');
                    } catch {
                      toast.error('Copy is unavailable. Select and copy the address above.');
                    }
                  }}
                >
                  Copy Address
                </button>
              </>
            )}
            <p className="whitespace-pre-wrap mt-5">{p.method.instructions}</p>
            <p className="small">
              Quote valid until {new Date(p.expiresAt).toLocaleString()}. Required amount uses the
              organization’s configured exchange rate.
            </p>
            {expired && !p.transactionHash && (
              <p role="alert" className="notice">
                This quote has expired. Do not send funds. Start a new donation. If you already
                paid, contact the organization with reference {p.id}.
              </p>
            )}
            {p.transactionHash ? (
              <div className="notice">
                <p className="break-all">Submitted transaction: {p.transactionHash}</p>
                <p>
                  Submitting a transaction ID does not confirm payment. An administrator must verify
                  the transfer before it counts toward the campaign.
                </p>
              </div>
            ) : (
              !expired &&
              p.status === 'pending' && (
                <form onSubmit={submit}>
                  <label>
                    Transaction hash / transaction ID
                    <input
                      required
                      minLength={6}
                      maxLength={200}
                      pattern="[a-zA-Z0-9:_-]+"
                      value={hash}
                      onChange={(e) => setHash(e.target.value)}
                    />
                  </label>
                  <button className="button" disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit for verification'}
                  </button>
                </form>
              )
            )}
            <button className="button secondary mt-4" onClick={() => router.refresh()}>
              Refresh payment status
            </button>
          </>
        )}
      </div>
    </div>
  );
}
