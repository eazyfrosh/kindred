import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/firebase/admin';
import {
  assertLive,
  assertOrigin,
  jsonBody,
  rateLimit,
  requireUser,
  HttpError,
} from '@/lib/security';
import { apiError } from '@/lib/api';
import { campaignBalance } from '@/lib/admin/payouts';
import { notifyAdmins } from '@/lib/admin/notifications';
import type { Campaign } from '@/types';

const requestSchema = z.object({
  campaignId: z.string().trim().min(1).max(128),
  amount: z.number().positive().max(1_000_000).multipleOf(0.01),
  /** A masked description only — never an account number or routing detail. */
  destinationSummary: z.string().trim().min(4).max(120),
  destinationRef: z.string().trim().max(200).default(''),
});

/**
 * A campaign organizer requests a withdrawal of raised funds.
 *
 * The amount is validated against the balance computed on the server, and a
 * campaign can only have one open request at a time, so duplicate submissions
 * cannot reserve the same funds twice.
 */
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    assertLive();
    const user = await requireUser();
    await rateLimit(request, `payout:${user.uid}`, 5);
    const input = requestSchema.parse(await jsonBody(request));

    const campaignSnap = await db().collection('campaigns').doc(input.campaignId).get();
    const campaign = campaignSnap.data() as Campaign | undefined;
    if (!campaign) throw new HttpError(404, 'Campaign not found.');
    if (campaign.organizerId !== user.uid)
      throw new HttpError(403, 'Only the campaign organizer can request a payout.');
    if (!['approved', 'completed'].includes(campaign.status))
      throw new HttpError(400, 'Payouts are available on published campaigns.');

    const open = await db()
      .collection('payouts')
      .where('campaignId', '==', input.campaignId)
      .where('status', 'in', ['requested', 'under_review', 'approved', 'processing'])
      .limit(1)
      .get();
    if (!open.empty)
      throw new HttpError(409, 'A payout request for this campaign is already in progress.');

    const balance = await campaignBalance(input.campaignId);
    if (input.amount > balance.available)
      throw new HttpError(
        400,
        `The available balance is ${balance.currency} ${balance.available.toFixed(2)}.`,
      );

    const now = new Date().toISOString();
    const ref = db().collection('payouts').doc();
    await ref.create({
      campaignId: input.campaignId,
      campaignTitle: campaign.title,
      organizerId: user.uid,
      organizerName: `${user.firstName} ${user.lastName}`.trim(),
      organizerEmail: user.email,
      amount: input.amount,
      currency: campaign.currency || balance.currency,
      status: 'requested',
      destinationSummary: input.destinationSummary,
      destinationRef: input.destinationRef,
      availableAtRequest: balance.available,
      adminNotes: '',
      history: [],
      requestedAt: now,
      updatedAt: now,
      paidAt: null,
      processedBy: null,
      providerReference: '',
    });
    await notifyAdmins({
      type: 'payout_requested',
      title: 'New payout request',
      message: `${campaign.title} — ${campaign.currency} ${input.amount}`,
      href: `/admin/payouts/${ref.id}`,
    });
    return NextResponse.json({ ok: true, id: ref.id }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
