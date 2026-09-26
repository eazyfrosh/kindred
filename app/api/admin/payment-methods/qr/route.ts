import { NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'node:crypto';
import { adminApp } from '@/firebase/admin';
import { assertOrigin, requireUser, HttpError } from '@/lib/security';
import { apiError } from '@/lib/api';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await requireUser(true);
    if (Number(request.headers.get('content-length')) > 2200000)
      throw new HttpError(413, 'Maximum QR image size is 2 MB.');
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || file.size > 2000000)
      throw new HttpError(400, 'Upload a PNG, JPEG or WebP smaller than 2 MB.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const webp =
      bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    const ext = png ? 'png' : jpg ? 'jpg' : webp ? 'webp' : null;
    if (!ext || file.type !== { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[ext])
      throw new HttpError(400, 'Invalid image type.');
    const path = `payment-methods/${randomUUID()}.${ext}`;
    await getStorage(adminApp())
      .bucket()
      .file(path)
      .save(bytes, {
        resumable: false,
        metadata: { contentType: file.type, cacheControl: 'public,max-age=3600' },
      });
    return NextResponse.json({ path });
  } catch (e) {
    return apiError(e);
  }
}
