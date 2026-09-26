import 'server-only';
import Stripe from 'stripe';
import { randomBytes, createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/firebase/admin';
import { brand } from '@/lib/brand';
import { HttpError } from '@/lib/security';
import { assertPaymentMatch, minorUnits, validSignature } from '@/lib/payment-integrity';
import type { Donation } from '@/types';
export type Provider = 'stripe' | 'flutterwave' | 'manual';
export function secret(provider: Provider) {
  const value =
    process.env[`${provider.toUpperCase()}_SECRET_KEY`] ||
    (process.env.PAYMENT_PROVIDER === provider ? process.env.PAYMENT_PROVIDER_SECRET : '');
  if (!value)
    throw new HttpError(503, `${provider} is not configured. Choose another payment provider.`);
  return value;
}
export const stripe = () => new Stripe(secret('stripe'));
async function providerFetch(url: string, provider: Provider, body?: unknown) {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${secret(provider)}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  if (!response.ok || result.status === false || result.status === 'error')
    throw new HttpError(
      502,
      'The payment provider could not complete this request. Please try again.',
    );
  return result;
}
export async function initializePayment(d: Donation) {
  if (!['stripe', 'flutterwave'].includes(d.paymentProvider))
    throw new HttpError(400, 'Use the manual payment checkout for this method.');
  const success = `${brand.url}/donation/success?reference=${d.id}&token=${d.receiptToken}`;
  if (d.frequency === 'monthly' && d.paymentProvider !== 'stripe')
    throw new HttpError(400, 'Monthly giving is currently available through Stripe.');
  if (d.paymentProvider === 'stripe') {
    let customerId: string | undefined;
    if (d.donorId) {
      const billingRef = db().collection('_billingCustomers').doc(d.donorId);
      customerId = (await billingRef.get()).data()?.customerId;
      if (!customerId) {
        const profile = (await db().collection('users').doc(d.donorId).get()).data();
        if (!profile?.email) throw new HttpError(400, 'A donor account email is required.');
        const customer = await stripe().customers.create(
          { email: profile.email, metadata: { uid: d.donorId } },
          { idempotencyKey: `kindred-customer:${d.donorId}` },
        );
        customerId = customer.id;
        await billingRef.set({ customerId }, { merge: true });
      }
    }
    const session = await stripe().checkout.sessions.create(
      {
        mode: d.frequency === 'monthly' ? 'subscription' : 'payment',
        ...(customerId ? { customer: customerId } : { customer_email: d.donorEmail }),
        client_reference_id: d.id,
        metadata: { reference: d.id },
        ...(d.frequency === 'monthly'
          ? { subscription_data: { metadata: { reference: d.id } } }
          : { payment_intent_data: { metadata: { reference: d.id } } }),
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: d.currency.toLowerCase(),
              unit_amount: minorUnits(d.amount),
              product_data: { name: `Support ${d.campaignTitle}` },
              ...(d.frequency === 'monthly' ? { recurring: { interval: 'month' as const } } : {}),
            },
          },
        ],
        success_url: success,
        cancel_url: `${brand.url}/donate/${d.campaignId}?canceled=1`,
      },
      { idempotencyKey: d.id },
    );
    return { url: session.url, sessionId: session.id };
  }
  const result = await providerFetch('https://api.flutterwave.com/v3/payments', 'flutterwave', {
    tx_ref: d.id,
    amount: d.amount,
    currency: d.currency,
    redirect_url: success,
    customer: { email: d.donorEmail, name: d.donorName },
    customizations: { title: 'Kindred donation', description: d.campaignTitle },
  });
  return { url: result.data.link, sessionId: d.id };
}
export interface ConfirmedPayment {
  reference: string;
  transactionId: string;
  amountMinor: number;
  currency: string;
  provider: Provider;
  recurring?: boolean;
  customerId?: string;
  subscriptionId?: string;
}
export async function settlePayment(
  payment: ConfirmedPayment,
  reviewer?: { uid: string; note: string },
) {
  const intentRef = db().collection('donations').doc(payment.reference);
  const marker = db()
    .collection('_paymentTransactions')
    .doc(createHash('sha256').update(`${payment.provider}:${payment.transactionId}`).digest('hex'));
  const now = new Date().toISOString();
  await db().runTransaction(async (tx) => {
    const [intentSnap, existing] = await Promise.all([tx.get(intentRef), tx.get(marker)]);
    let manualRef: FirebaseFirestore.DocumentReference | undefined;
    if (payment.provider === 'manual') {
      if (!reviewer) throw new HttpError(403, 'Administrator review required.');
      manualRef = db().collection('manualPayments').doc(payment.reference);
      const [manual, actor] = await Promise.all([
        tx.get(manualRef),
        tx.get(db().collection('users').doc(reviewer.uid)),
      ]);
      if (actor.data()?.role !== 'admin' || actor.data()?.disabled)
        throw new HttpError(403, 'Administrator access required.');
      const p = manual.data();
      if (
        existing.exists &&
        existing.data()?.donationId === payment.reference &&
        p?.status === 'confirmed'
      )
        return;
      if (existing.exists) throw new HttpError(409, 'Transaction already credited.');
      if (
        !p ||
        !['pending', 'verifying'].includes(p.status) ||
        !p.transactionHash ||
        p.transactionIdentity !== payment.transactionId
      )
        throw new HttpError(409, 'Payment is not eligible for confirmation.');
    }
    if (existing.exists) return;
    if (!intentSnap.exists) throw new Error('Donation intent not found.');
    const original = intentSnap.data() as Donation;
    assertPaymentMatch(original, payment);
    const campaignRef = db().collection('campaigns').doc(original.campaignId);
    const campaign = await tx.get(campaignRef);
    if (!campaign.exists) throw new Error('Campaign not found.');
    const identity = createHash('sha256').update(original.donorEmail.toLowerCase()).digest('hex');
    const campaignDonorRef = db()
      .collection('_campaignDonors')
      .doc(original.campaignId + '_' + identity);
    const globalDonorRef = db().collection('_donors').doc(identity);
    const userCampaignRef = original.donorId
      ? db()
          .collection('_userCampaigns')
          .doc(original.donorId + '_' + original.campaignId)
      : null;
    const [campaignDonor, globalDonor, userCampaign] = await Promise.all([
      tx.get(campaignDonorRef),
      tx.get(globalDonorRef),
      userCampaignRef ? tx.get(userCampaignRef) : Promise.resolve(null),
    ]);
    const recurring = payment.recurring && !!original.providerTransactionId;
    if (!recurring && original.paymentStatus === 'successful') return;
    const ref = recurring ? db().collection('donations').doc() : intentRef;
    const id = ref.id;
    const amount = payment.amountMinor / 100;
    const newRaisedMinor =
      Number(
        campaign.data()!.amountRaisedMinor ??
          Math.round(Number(campaign.data()!.amountRaised) * 100),
      ) + payment.amountMinor;
    const donation = {
      ...original,
      id,
      amount,
      category: String(campaign.data()!.category || 'Community'),
      paymentStatus: 'successful',
      providerTransactionId: payment.transactionId,
      createdAt: now,
      confirmedAt: now,
      ...(recurring
        ? { receiptToken: randomBytes(32).toString('hex'), parentDonationId: original.id }
        : {}),
    };
    if (manualRef && reviewer) {
      tx.update(manualRef, {
        status: 'confirmed',
        reviewNote: reviewer.note,
        reviewedBy: reviewer.uid,
        confirmedAt: now,
        updatedAt: now,
      });
      tx.create(db().collection('auditLogs').doc(), {
        actorId: reviewer.uid,
        action: 'payment.confirmed',
        resourceId: id,
        amount,
        currency: original.currency,
        transactionId: payment.transactionId,
        note: reviewer.note,
        createdAt: now,
      });
    }
    tx.set(ref, donation, { merge: true });
    tx.create(marker, { donationId: id, createdAt: now, provider: payment.provider });
    tx.update(campaignRef, {
      amountRaised: newRaisedMinor / 100,
      amountRaisedMinor: newRaisedMinor,
      fundingRatio: newRaisedMinor / 100 / Number(campaign.data()!.goalAmount),
      donorCount: FieldValue.increment(campaignDonor.exists ? 0 : 1),
      updatedAt: now,
    });
    tx.set(
      db().collection('siteSettings').doc('metrics'),
      {
        [`raised${original.currency}`]: FieldValue.increment(amount),
        ['count' + original.currency]: FieldValue.increment(1),
        ['category' + original.currency]: {
          [String(campaign.data()!.category || 'Community')]: FieldValue.increment(amount),
        },
        donationCount: FieldValue.increment(1),
        donorCount: FieldValue.increment(globalDonor.exists ? 0 : 1),
      },
      { merge: true },
    );
    if (!campaignDonor.exists) tx.create(campaignDonorRef, { createdAt: now });
    if (!globalDonor.exists) tx.create(globalDonorRef, { createdAt: now });
    for (const period of [now.slice(0, 10), now.slice(0, 7)])
      tx.set(
        db().collection('_revenuePeriods').doc(period),
        {
          ['raised' + original.currency]: FieldValue.increment(amount),
          ['count' + original.currency]: FieldValue.increment(1),
        },
        { merge: true },
      );
    if (userCampaignRef && !userCampaign?.exists) tx.create(userCampaignRef, { createdAt: now });
    if (original.donorId)
      tx.set(
        db().collection('_userStats').doc(original.donorId),
        {
          ['total' + original.currency]: FieldValue.increment(amount),
          donationCount: FieldValue.increment(1),
          campaignCount: FieldValue.increment(userCampaign?.exists ? 0 : 1),
        },
        { merge: true },
      );
    tx.set(db().collection('publicDonations').doc(id), {
      campaignId: original.campaignId,
      donorName: original.anonymous ? 'Anonymous supporter' : original.donorName,
      amount,
      currency: original.currency,
      message: original.anonymous ? '' : original.message,
      createdAt: now,
    });
    tx.create(db().collection('notifications').doc(), {
      userId: campaign.data()!.organizerId,
      title: 'A new act of kindness',
      message: `Your campaign received ${original.currency} ${amount}.`,
      campaignId: original.campaignId,
      read: false,
      createdAt: now,
    });
    const oldPercent = Math.floor(
      (Number(campaign.data()!.amountRaised) / Number(campaign.data()!.goalAmount)) * 4,
    );
    const newPercent = Math.floor(
      ((Number(campaign.data()!.amountRaised) + amount) / Number(campaign.data()!.goalAmount)) * 4,
    );
    if (newPercent > oldPercent)
      tx.create(db().collection('notifications').doc(), {
        userId: campaign.data()!.organizerId,
        title: newPercent >= 4 ? 'Your campaign reached its goal!' : 'A campaign milestone reached',
        message: original.campaignTitle,
        campaignId: original.campaignId,
        read: false,
        createdAt: now,
      });
    if (payment.customerId && original.donorId)
      tx.set(
        db().collection('_billingCustomers').doc(original.donorId),
        { customerId: payment.customerId },
        { merge: true },
      );
    if (payment.subscriptionId)
      tx.set(
        db().collection('_subscriptions').doc(payment.subscriptionId),
        {
          donorId: original.donorId,
          reference: original.id,
          customerId: payment.customerId || '',
          updatedAt: now,
        },
        { merge: true },
      );
  });
}
export async function processWebhook(provider: Exclude<Provider, 'manual'>, request: Request) {
  const raw = await request.text();
  if (raw.length > 1024 * 1024) throw new HttpError(413, 'Webhook too large.');
  if (provider === 'stripe') {
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET ||
      (process.env.PAYMENT_PROVIDER === 'stripe' ? process.env.PAYMENT_WEBHOOK_SECRET : '');
    if (!webhookSecret) throw new HttpError(503, 'Webhook is not configured.');
    let event: Stripe.Event;
    try {
      event = stripe().webhooks.constructEvent(
        raw,
        request.headers.get('stripe-signature') || '',
        webhookSecret,
      );
    } catch {
      throw new HttpError(400, 'Invalid webhook signature.');
    }
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const eventSession = event.data.object as Stripe.Checkout.Session;
      const session = await stripe().checkout.sessions.retrieve(eventSession.id);
      if (
        session.mode === 'payment' &&
        session.payment_status === 'paid' &&
        session.metadata?.reference
      )
        await settlePayment({
          reference: session.metadata.reference,
          transactionId: String(session.payment_intent),
          amountMinor: session.amount_total || 0,
          currency: session.currency || '',
          provider,
          customerId: typeof session.customer === 'string' ? session.customer : undefined,
        });
    }
    if (event.type === 'invoice.paid') {
      const invoice = await stripe().invoices.retrieve((event.data.object as Stripe.Invoice).id);
      const sub = invoice.parent?.subscription_details?.subscription;
      if (sub) {
        const subscription = await stripe().subscriptions.retrieve(
          typeof sub === 'string' ? sub : sub.id,
        );
        const reference = subscription.metadata.reference;
        if (reference && invoice.status === 'paid')
          await settlePayment({
            reference,
            transactionId: invoice.id,
            amountMinor: invoice.amount_paid,
            currency: invoice.currency,
            provider,
            recurring: true,
            subscriptionId: subscription.id,
            customerId:
              typeof subscription.customer === 'string'
                ? subscription.customer
                : subscription.customer.id,
          });
      }
    }
    if (
      event.type === 'checkout.session.expired' ||
      event.type === 'checkout.session.async_payment_failed'
    ) {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.reference) await markFailed(s.metadata.reference);
    }
    if (event.type === 'charge.refunded') {
      const charge = await stripe().charges.retrieve((event.data.object as Stripe.Charge).id);
      if (typeof charge.payment_intent === 'string')
        await recordStripeRefund(charge.payment_intent, charge.amount_refunded);
    }
    return;
  }
  const webhookSecret =
    process.env.FLUTTERWAVE_WEBHOOK_SECRET ||
    (process.env.PAYMENT_PROVIDER === 'flutterwave' ? process.env.PAYMENT_WEBHOOK_SECRET : '') ||
    '';
  if (
    !validSignature(
      raw,
      request.headers.get('flutterwave-signature'),
      webhookSecret,
      'sha256',
      'base64',
    )
  )
    throw new HttpError(400, 'Invalid webhook signature.');
  const payload = JSON.parse(raw);
  if (payload.event !== 'charge.completed') return;
  const id = String(payload.data.id);
  if (!/^\d+$/.test(id)) throw new HttpError(400, 'Invalid transaction ID.');
  const { data } = await providerFetch(
    `https://api.flutterwave.com/v3/transactions/${id}/verify`,
    provider,
  );
  if (data.status === 'successful')
    await settlePayment({
      reference: data.tx_ref,
      transactionId: String(data.id),
      amountMinor: minorUnits(Number(data.amount)),
      currency: data.currency,
      provider,
    });
}
async function markFailed(id: string) {
  const ref = db().collection('donations').doc(id);
  await db().runTransaction(async (tx) => {
    const d = await tx.get(ref);
    if (d.exists && d.data()?.paymentStatus === 'pending')
      tx.update(ref, { paymentStatus: 'failed' });
  });
}
export async function recordStripeRefund(paymentIntent: string, refundedMinor: number) {
  let found = await db()
    .collection('donations')
    .where('providerTransactionId', '==', paymentIntent)
    .limit(1)
    .get();
  if (found.empty) {
    const invoices = await stripe().invoicePayments.list({
      payment: { type: 'payment_intent', payment_intent: paymentIntent },
      limit: 1,
    });
    const invoice = invoices.data[0]?.invoice;
    if (invoice)
      found = await db()
        .collection('donations')
        .where('providerTransactionId', '==', typeof invoice === 'string' ? invoice : invoice.id)
        .limit(1)
        .get();
  }
  if (found.empty) throw new Error('Refund arrived before donation settlement. Retry required.');
  const ref = found.docs[0].ref;
  await db().runTransaction(async (tx) => {
    const d = await tx.get(ref);
    const donation = d.data()!;
    const campaignRef = db().collection('campaigns').doc(donation.campaignId);
    const campaign = await tx.get(campaignRef);
    const old = Number(donation.refundedMinor || 0);
    const delta = refundedMinor - old;
    if (delta <= 0) return;
    if (refundedMinor > minorUnits(donation.amount)) throw new Error('Refund exceeds donation.');
    tx.update(ref, {
      refundedMinor,
      paymentStatus: refundedMinor === minorUnits(donation.amount) ? 'refunded' : 'successful',
    });
    const raisedMinor =
      Number(
        campaign.data()!.amountRaisedMinor ??
          Math.round(Number(campaign.data()!.amountRaised) * 100),
      ) - delta;
    tx.update(campaignRef, {
      amountRaised: raisedMinor / 100,
      amountRaisedMinor: raisedMinor,
      fundingRatio: raisedMinor / 100 / Number(campaign.data()!.goalAmount),
    });
    tx.set(
      db().collection('siteSettings').doc('metrics'),
      {
        ['raised' + donation.currency]: FieldValue.increment(-delta / 100),
        ['category' + donation.currency]: {
          [String(donation.category || campaign.data()!.category || 'Community')]:
            FieldValue.increment(-delta / 100),
        },
      },
      { merge: true },
    );
    if (donation.donorId)
      tx.set(
        db().collection('_userStats').doc(donation.donorId),
        { ['total' + donation.currency]: FieldValue.increment(-delta / 100) },
        { merge: true },
      );
    for (const period of [donation.createdAt.slice(0, 10), donation.createdAt.slice(0, 7)])
      tx.set(
        db().collection('_revenuePeriods').doc(period),
        { ['raised' + donation.currency]: FieldValue.increment(-delta / 100) },
        { merge: true },
      );
    tx.delete(db().collection('publicDonations').doc(ref.id));
  });
}
