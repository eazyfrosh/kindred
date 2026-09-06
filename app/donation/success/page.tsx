import Link from 'next/link';
import { verifyReceiptToken } from '@/lib/payment-integrity';
import { db } from '@/firebase/admin';
import { currentUser } from '@/lib/security';
import { demoMode, money } from '@/lib/brand';
import { PageHero, Empty } from '@/components/ui';
import { ReceiptActions } from '@/components/receipt';
export const metadata = {
  title: 'Your donation receipt',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; token?: string }>;
}) {
  const { reference, token } = await searchParams;
  if (demoMode || !reference || !/^[a-zA-Z0-9_-]{1,128}$/.test(reference))
    return (
      <div className="container section">
        <Empty title="No confirmed donation to display.">
          Your receipt will appear after a payment has been confirmed by the provider.
        </Empty>
      </div>
    );
  const [snap, user] = await Promise.all([
    db().collection('donations').doc(reference).get(),
    currentUser(),
  ]);
  const d = snap.data();
  const authorized =
    !!d && (verifyReceiptToken(token, d.receiptToken) || (!!user && d.donorId === user.uid));
  if (!authorized)
    return (
      <div className="container section">
        <Empty title="This receipt is private.">
          Use the receipt link from your checkout, or sign in to your donor account.
        </Empty>
      </div>
    );
  const success = d!.paymentStatus === 'successful';
  const pending = d!.paymentStatus === 'pending';
  return (
    <>
      <PageHero
        eyebrow={success ? 'KINDNESS, CONFIRMED' : 'PAYMENT STATUS'}
        title={
          success
            ? 'You just made a difference.'
            : pending
              ? 'We’re checking your payment.'
              : d!.paymentStatus === 'refunded'
                ? 'Your donation was refunded.'
                : 'Your payment was not completed.'
        }
      />
      <div className="container">
        <div className="narrow panel">
          <h2 className="text-2xl">
            {success ? 'Your donation receipt' : `Status: ${d!.paymentStatus}`}
          </h2>
          {pending && (
            <p>
              A redirect alone does not confirm payment. We update this page only after server
              verification. Please do not pay again while a payment is pending.
            </p>
          )}
          <dl className="space-y-4 mb-8">
            <div>
              <dt className="small muted">Campaign</dt>
              <dd>{d!.campaignTitle}</dd>
            </div>
            <div>
              <dt className="small muted">Amount</dt>
              <dd className="text-3xl font-semibold">{money(d!.amount, d!.currency)}</dd>
            </div>
            <div>
              <dt className="small muted">Reference</dt>
              <dd className="break-all">{reference}</dd>
            </div>
            {d!.refundedMinor > 0 && (
              <div>
                <dt className="small muted">Refunded</dt>
                <dd>{money(d!.refundedMinor / 100, d!.currency)}</dd>
              </div>
            )}
            <div>
              <dt className="small muted">Date</dt>
              <dd>{new Date(d!.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="small muted">Payment provider</dt>
              <dd>{d!.paymentProvider}</dd>
            </div>
          </dl>
          <ReceiptActions pending={pending} />
          <p className="small mt-6">
            This is a payment receipt, not a determination of tax deductibility. Keep your private
            receipt link secure.
          </p>
          <Link href="/dashboard" className="text-link">
            View your account
          </Link>
        </div>
      </div>
    </>
  );
}
