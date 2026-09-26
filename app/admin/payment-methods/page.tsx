import { requireUser, serialize } from '@/lib/security';
import { db } from '@/firebase/admin';
import { Workspace } from '@/components/workspace';
import { PaymentMethodManager } from '@/components/payment-method-manager';
import type { PaymentMethod } from '@/lib/manual-payment';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment methods', robots: { index: false, follow: false } };
export default async function Page() {
  await requireUser(true);
  const snap = await db().collection('paymentMethods').limit(100).get();
  const methods = serialize(
    snap.docs.map((d) => ({ ...d.data(), id: d.id }) as PaymentMethod),
  ).sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <Workspace admin tab="payment-methods">
      <PaymentMethodManager methods={methods} />
    </Workspace>
  );
}
