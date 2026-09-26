import { notFound } from 'next/navigation';
import { privatePayment } from '@/services/manual-payments';
import { HttpError } from '@/lib/security';
import { ManualPaymentCheckout } from '@/components/manual-payment-checkout';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Complete your transfer',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token = '' } = await searchParams;
  let payment;
  try {
    payment = await privatePayment(id, token);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  return (
    <ManualPaymentCheckout
      payment={payment}
      token={token}
      initiallyExpired={payment.quoteExpired}
    />
  );
}
