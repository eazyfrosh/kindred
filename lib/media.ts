import 'server-only';
import { HttpError } from './security';
export function assertOwnedImages(urls: string[], uid: string, kind = 'campaigns') {
  for (const value of urls) {
    const url = new URL(value);
    const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const expected = `/v0/b/${bucket}/o/`;
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'firebasestorage.googleapis.com' ||
      !url.pathname.startsWith(expected)
    )
      throw new HttpError(400, 'Use images uploaded to this platform.');
    const path = decodeURIComponent(url.pathname.slice(expected.length));
    if (!path.startsWith(`${kind}/${uid}/`))
      throw new HttpError(403, 'This image belongs to another account.');
  }
}
