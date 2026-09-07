import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '@/firebase/admin';
import { assertOrigin, assertLive, jsonBody, rateLimit, HttpError } from '@/lib/security';
import { apiError } from '@/lib/api';
import { contactSchema, volunteerSchema, newsletterSchema } from '@/lib/validation';
import { notifyAdmins } from '@/lib/admin/notifications';
export async function POST(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    assertOrigin(request);
    assertLive();
    const { kind } = await params;
    await rateLimit(request, `submit:${kind}`, 4);
    const input = await jsonBody(request);
    const now = new Date().toISOString();
    if (kind === 'newsletter') {
      const data = newsletterSchema.parse(input);
      const email = data.email.toLowerCase();
      await db()
        .collection('newsletterSubscribers')
        .doc(createHash('sha256').update(email).digest('hex'))
        .set({ email, consent: true, createdAt: now, status: 'subscribed' }, { merge: true });
    } else if (kind === 'contact') {
      const data = contactSchema.parse(input);
      await db()
        .collection('contactMessages')
        .add({ ...data, status: 'unread', createdAt: now });
      await notifyAdmins({
        type: 'contact_message',
        title: 'New contact message',
        message: `${data.subject} — ${data.name}`,
        href: '/admin/messages',
      });
    } else if (kind === 'volunteer') {
      const data = volunteerSchema.parse(input);
      await db()
        .collection('volunteerApplications')
        .add({ ...data, status: 'new', notes: '', createdAt: now });
      await notifyAdmins({
        type: 'volunteer_application',
        title: 'New volunteer application',
        message: `${data.name} — ${data.interest}`,
        href: '/admin/volunteers',
      });
    } else throw new HttpError(404, 'Unknown form.');
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}
