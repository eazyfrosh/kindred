import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/firebase/admin';
import {
  assertOrigin,
  assertLive,
  rateLimit,
  currentUser,
  jsonBody,
  HttpError,
} from '@/lib/security';
import { donationSchema } from '@/lib/validation';
import { apiError } from '@/lib/api';
import { initializePayment } from '@/services/payments';
import type { Donation } from '@/types';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    assertLive();
    await rateLimit(request, 'checkout', 8);
    const data = donationSchema.parse(await jsonBody(request));
    const user = await currentUser();
    if (data.frequency === 'monthly' && !user)
      throw new HttpError(
        401,
        'Please sign in for monthly giving so you can manage your subscription.',
      );
    if (data.frequency === 'monthly' && data.provider !== 'stripe')
      throw new HttpError(400, 'Choose Stripe for monthly giving.');
    const campaign = await db().collection('campaigns').doc(data.campaignId).get();
    const c = campaign.data();
    if (!c || c.status !== 'approved' || Date.parse(c.endDate) < Date.now())
      throw new HttpError(400, 'This campaign is not accepting donations.');
    const id = `KND_${createHash('sha256').update(`${data.email.toLowerCase()}:${data.idempotencyKey}`).digest('hex').slice(0, 40)}`;
    const ref = db().collection('donations').doc(id);
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ ...data, donorId: user?.uid || null }))
      .digest('hex');
    const intent = await db().runTransaction(async (tx) => {
      const [old, currentCampaign] = await Promise.all([tx.get(ref), tx.get(campaign.ref)]);
      const current = currentCampaign.data();
      if (
        !current ||
        current.status !== 'approved' ||
        Date.parse(current.endDate) < Date.now() ||
        current.currency !== c.currency
      )
        throw new HttpError(
          409,
          'This campaign changed while checkout was starting. Please reload the campaign.',
        );
      if (old.exists) {
        if (old.data()?.fingerprint !== fingerprint)
          throw new HttpError(
            409,
            'This checkout reference belongs to different donation details. Start a new donation.',
          );
        return old.data() as Donation & { checkoutUrl?: string; fingerprint: string };
      }
      const donation: Donation = {
        id,
        campaignId: campaign.id,
        campaignTitle: c.title,
        donorId: user?.uid || null,
        donorName: `${data.firstName} ${data.lastName}`,
        donorEmail: data.email.toLowerCase(),
        amount: data.amount,
        currency: c.currency,
        anonymous: data.anonymous,
        message: data.message,
        paymentProvider: data.provider,
        paymentReference: id,
        paymentStatus: 'pending',
        frequency: data.frequency,
        receiptToken: randomBytes(32).toString('hex'),
        createdAt: new Date().toISOString(),
      };
      tx.create(ref, { ...donation, country: data.country, fingerprint });
      return { ...donation, fingerprint };
    });
    if (intent.paymentStatus === 'successful')
      return NextResponse.json({
        url: `/donation/success?reference=${id}&token=${intent.receiptToken}`,
      });
    if ('checkoutUrl' in intent && intent.checkoutUrl)
      return NextResponse.json({ url: intent.checkoutUrl });
    const checkout = await initializePayment(intent);
    if (!checkout.url) throw new HttpError(502, 'Checkout is not available.');
    await ref.update({ checkoutUrl: checkout.url, providerSessionId: checkout.sessionId });
    return NextResponse.json({ url: checkout.url });
  } catch (e) {
    return apiError(e);
  }
}
