import { NextResponse } from 'next/server';
import { db } from '@/firebase/admin';
import {
  assertLive,
  assertOrigin,
  requireUser,
  rateLimit,
  jsonBody,
  HttpError,
} from '@/lib/security';
import { apiError } from '@/lib/api';
import { campaignSchema } from '@/lib/validation';
import { assertOwnedImages } from '@/lib/media';
import { tokens } from '@/lib/brand';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    assertLive();
    const user = await requireUser();
    if (!user.verified) throw new HttpError(403, 'Verify your email before submitting a campaign.');
    await rateLimit(request, `campaign:${user.uid}`, 4);
    const input = campaignSchema.parse(await jsonBody(request));
    assertOwnedImages([input.coverImage, ...input.gallery], user.uid);
    const ref = db().collection('campaigns').doc();
    const now = new Date().toISOString();
    const slug = `${
      input.title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80) || 'community-campaign'
    }-${ref.id.slice(0, 7)}`;
    await ref.create({
      ...input,
      id: ref.id,
      slug,
      organizerId: user.uid,
      status: 'pending',
      amountRaised: 0,
      fundingRatio: 0,
      donorCount: 0,
      viewCount: 0,
      shareCount: 0,
      featured: false,
      verified: false,
      urgent: false,
      startDate: now,
      createdAt: now,
      updatedAt: now,
      searchTokens: tokens(
        `${input.title} ${input.category} ${input.shortDescription} ${input.location}`,
      ),
    });
    return NextResponse.json({ id: ref.id, slug }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
