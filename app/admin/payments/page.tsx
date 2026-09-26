import Link from 'next/link';
import { requireUser, serialize } from '@/lib/security';
import { db } from '@/firebase/admin';
import { Workspace } from '@/components/workspace';
import { PaymentReview } from '@/components/payment-review';
import { verificationStatuses, type ManualPayment } from '@/lib/manual-payment';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment review', robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; cursor?: string }>;
}) {
  await requireUser(true);
  const p = await searchParams;
  const status = verificationStatuses.find((s) => s === p.status);
  let query = db()
    .collection('manualPayments')
    .orderBy('createdAt', 'desc')
    .orderBy('__name__', 'desc');
  if (status) query = query.where('status', '==', status);
  if (p.cursor && /^[a-zA-Z0-9_-]{1,128}$/.test(p.cursor)) {
    const cursor = await db().collection('manualPayments').doc(p.cursor).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const snap = await query.limit(25).get();
  const payments = serialize(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as ManualPayment));
  return (
    <Workspace admin tab="payments">
      <h1>Payment reviews</h1>
      <p>
        Verify the actual transfer before confirming. A transaction ID alone is not proof of
        payment.
      </p>
      <form className="panel mb-6">
        <label>
          Status
          <select name="status" defaultValue={status || ''}>
            <option value="">All statuses</option>
            {verificationStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <button className="button">Filter</button>
      </form>
      {payments.length ? (
        payments.map((p) => <PaymentReview key={p.id} payment={p} />)
      ) : (
        <p className="notice">No payments found.</p>
      )}
      {snap.size === 25 && (
        <Link
          className="button secondary"
          href={`/admin/payments?status=${status || ''}&cursor=${snap.docs.at(-1)!.id}`}
        >
          Next page
        </Link>
      )}
    </Workspace>
  );
}
