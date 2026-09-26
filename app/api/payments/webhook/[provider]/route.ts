import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertLive } from '@/lib/security';
import { apiError } from '@/lib/api';
import { processWebhook } from '@/services/payments';
export const runtime = 'nodejs';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    assertLive();
    const provider = z.enum(['stripe', 'flutterwave']).parse((await params).provider);
    await processWebhook(provider, request);
    return NextResponse.json({ received: true });
  } catch (e) {
    return apiError(e);
  }
}
