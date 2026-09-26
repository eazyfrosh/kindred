import { getStorage } from 'firebase-admin/storage';
import QRCode from 'qrcode';
import { adminApp, db } from '@/firebase/admin';
import { currentUser, HttpError } from '@/lib/security';
import { apiError } from '@/lib/api';
import { privatePayment } from '@/services/manual-payments';
export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams;
    let method;
    if (q.has('payment'))
      method = (await privatePayment(q.get('payment')!, q.get('token') || '')).method;
    else {
      const id = q.get('method') || '';
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new HttpError(404, 'Not found.');
      const snap = await db().collection('paymentMethods').doc(id).get();
      method = snap.data();
      if (!method || (!method.enabled && (await currentUser())?.role !== 'admin'))
        throw new HttpError(404, 'Not found.');
    }
    let bytes: Buffer;
    let mime = 'image/png';
    if (method.qrPath) {
      if (!/^payment-methods\/[a-f0-9-]+\.(png|jpg|webp)$/.test(method.qrPath))
        throw new HttpError(400, 'Invalid QR path.');
      [bytes] = await getStorage(adminApp()).bucket().file(method.qrPath).download();
      mime = method.qrPath.endsWith('.jpg')
        ? 'image/jpeg'
        : method.qrPath.endsWith('.webp')
          ? 'image/webp'
          : 'image/png';
    } else
      bytes = await QRCode.toBuffer(method.walletAddress, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private,no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
