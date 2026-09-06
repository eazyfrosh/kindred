import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { db } from '@/firebase/admin';
import { assertLive, assertOrigin, requireUser, jsonBody, HttpError } from '@/lib/security';
import { apiError } from '@/lib/api';
import { profileSchema } from '@/lib/validation';
import { stripe } from '@/services/payments';
import { assertOwnedImages } from '@/lib/media';
import { brand, tokens } from '@/lib/brand';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    assertLive();
    const user = await requireUser();
    const input = await jsonBody(request);
    const action = z
      .enum(['profile', 'photo', 'save', 'notification', 'billing'])
      .parse(input.action);
    const ref = db().collection('users').doc(user.uid);
    if (action === 'profile') {
      const data = profileSchema.parse(input);
      await ref.update({
        ...data,
        searchTokens: tokens(`${data.firstName} ${data.lastName} ${user.email}`),
        updatedAt: new Date().toISOString(),
      });
    }
    if (action === 'photo') {
      const photoURL = z.string().url().parse(input.photoURL);
      assertOwnedImages([photoURL], user.uid, 'profiles');
      await ref.update({ photoURL, updatedAt: new Date().toISOString() });
    }
    if (action === 'save') {
      const id = z.string().min(1).max(128).parse(input.campaignId);
      const campaign = await db().collection('campaigns').doc(id).get();
      if (campaign.data()?.status !== 'approved') throw new HttpError(404, 'Campaign unavailable.');
      let saved = false;
      await db().runTransaction(async (tx) => {
        const s = await tx.get(ref);
        const ids = s.data()?.savedCampaigns || [];
        saved = !ids.includes(id);
        if (saved && ids.length >= 100)
          throw new HttpError(400, 'You can save up to 100 campaigns.');
        tx.update(ref, {
          savedCampaigns: saved ? FieldValue.arrayUnion(id) : FieldValue.arrayRemove(id),
        });
      });
      return NextResponse.json({ ok: true, saved });
    }
    if (action === 'notification') {
      const id = z.string().min(1).max(128).parse(input.id);
      const n = db().collection('notifications').doc(id);
      if ((await n.get()).data()?.userId !== user.uid)
        throw new HttpError(403, 'Notification access denied.');
      await n.update({ read: true });
    }
    if (action === 'billing') {
      const customer = (await db().collection('_billingCustomers').doc(user.uid).get()).data()
        ?.customerId;
      if (!customer) throw new HttpError(400, 'No Stripe subscription is linked to this account.');
      const session = await stripe().billingPortal.sessions.create({
        customer,
        return_url: `${brand.url}/dashboard`,
      });
      return NextResponse.json({ url: session.url });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
