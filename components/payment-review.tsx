'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { requestJSON } from './forms';
import type { ManualPayment, VerificationStatus } from '@/lib/manual-payment';
export function PaymentReview({ payment: p }: { payment: ManualPayment }) {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await requestJSON('/api/admin/payments', { id: p.id, status, note });
      toast.success('Payment review saved.');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel mb-6">
      <div className="section-heading">
        <div>
          <h2>{p.donorName}</h2>
          <p>
            {p.donorEmail} · {p.campaignTitle}
          </p>
        </div>
        <span className="status">{p.status}</span>
      </div>
      <dl className="form-grid">
        <div>
          <dt>Donation</dt>
          <dd>
            {p.currency} {p.amount}
          </dd>
        </div>
        <div>
          <dt>Required transfer</dt>
          <dd>
            {p.requiredAmount} {p.method.symbol}
          </dd>
        </div>
        <div>
          <dt>Cryptocurrency / method</dt>
          <dd>{p.method.name}</dd>
        </div>
        <div>
          <dt>Network</dt>
          <dd>{p.method.network || 'Custom'}</dd>
        </div>
        <div className="full break-all">
          <dt>Wallet destination</dt>
          <dd>{p.method.walletAddress}</dd>
        </div>
        <div className="full break-all">
          <dt>Transaction hash / ID</dt>
          <dd>{p.transactionHash || 'Not submitted'}</dd>
        </div>
        <div>
          <dt>Submission date</dt>
          <dd>{p.submittedAt || 'Awaiting submission'}</dd>
        </div>
        <div>
          <dt>Reference</dt>
          <dd className="break-all">{p.id}</dd>
        </div>
      </dl>
      {['pending', 'verifying'].includes(p.status) && (
        <form onSubmit={submit}>
          <label>
            Verification status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as VerificationStatus);
                setChecked(false);
              }}
            >
              <option value="verifying">Verifying</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </label>
          <label>
            Review evidence / reason (required)
            <textarea
              required
              minLength={10}
              maxLength={2000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {status === 'confirmed' && (
            <label className="check-label">
              <input
                type="checkbox"
                required
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              I independently verified the transaction, network, destination, amount and sufficient
              confirmations. This credits the campaign exactly once.
            </label>
          )}
          <button className="button" disabled={busy}>
            {busy ? 'Saving…' : 'Save review'}
          </button>
        </form>
      )}
    </article>
  );
}
