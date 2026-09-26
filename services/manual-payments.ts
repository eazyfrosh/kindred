import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/firebase/admin';
import { HttpError, serialize } from '@/lib/security';
import { quoteAmount, type PaymentMethod, type ManualPayment } from '@/lib/manual-payment';
import { verifyReceiptToken } from '@/lib/payment-integrity';
import type { Donation } from '@/types';
export async function enabledMethods(currency?: string) {
  const snap = await db()
    .collection('paymentMethods')
    .where('enabled', '==', true)
    .limit(100)
    .get();
  return serialize(
    snap.docs
      .map((d) => ({ ...d.data(), id: d.id }) as PaymentMethod)
      .filter((m) => !currency || m.settlementCurrency === currency)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  );
}
export async function privatePayment(id: string, token: string) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new HttpError(404, 'Payment not found.');
  const [d, p] = await Promise.all([
    db().collection('donations').doc(id).get(),
    db().collection('manualPayments').doc(id).get(),
  ]);
  if (!p.exists || !verifyReceiptToken(token, d.data()?.receiptToken))
    throw new HttpError(404, 'Payment not found.');
  const result = serialize(p.data() as ManualPayment);
  delete result.reviewNote;
  return { ...result, quoteExpired: Date.parse(result.expiresAt) < Date.now() };
}
export async function initializeManual(
  data: {
    campaignId: string;
    methodId: string;
    amount: number;
    firstName: string;
    lastName: string;
    email: string;
    anonymous: boolean;
    message: string;
    country: string;
    idempotencyKey: string;
  },
  uid: string | null,
) {
  const id =
    'KND_' +
    createHash('sha256')
      .update(`${data.email.toLowerCase()}:${data.idempotencyKey}`)
      .digest('hex')
      .slice(0, 40);
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ ...data, uid }))
    .digest('hex');
  return db().runTransaction(async (tx) => {
    const donationRef = db().collection('donations').doc(id);
    const [old, campaign, method] = await Promise.all([
      tx.get(donationRef),
      tx.get(db().collection('campaigns').doc(data.campaignId)),
      tx.get(db().collection('paymentMethods').doc(data.methodId)),
    ]);
    if (old.exists) {
      if (old.data()?.fingerprint !== fingerprint)
        throw new HttpError(409, 'Start a new checkout for changed details.');
      return { id, token: old.data()!.receiptToken };
    }
    const c = campaign.data();
    const m = { ...method.data(), id: method.id } as PaymentMethod;
    if (!c || c.status !== 'approved' || Date.parse(c.endDate) < Date.now())
      throw new HttpError(400, 'Campaign is not accepting donations.');
    if (
      !method.exists ||
      !m.enabled ||
      m.settlementCurrency !== c.currency ||
      data.amount < m.minimumAmount
    )
      throw new HttpError(400, 'Payment method unavailable or minimum amount not met.');
    const now = new Date().toISOString();
    const token = randomBytes(32).toString('hex');
    const donation: Donation = {
      id,
      campaignId: campaign.id,
      campaignTitle: c.title,
      donorId: uid,
      donorName: `${data.firstName} ${data.lastName}`,
      donorEmail: data.email.toLowerCase(),
      amount: data.amount,
      currency: c.currency,
      anonymous: data.anonymous,
      message: data.message,
      paymentProvider: 'manual',
      paymentReference: id,
      paymentStatus: 'pending',
      frequency: 'once',
      createdAt: now,
      receiptToken: token,
    };
    tx.create(donationRef, { ...donation, fingerprint, country: data.country });
    tx.create(db().collection('manualPayments').doc(id), {
      id,
      method: m,
      amount: data.amount,
      currency: c.currency,
      requiredAmount: quoteAmount(data.amount, m),
      donorId: uid,
      donorName: donation.donorName,
      donorEmail: donation.donorEmail,
      campaignId: campaign.id,
      campaignTitle: c.title,
      status: 'pending',
      transactionHash: '',
      createdAt: now,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    return { id, token };
  });
}
