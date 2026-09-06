'use client';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '@/firebase/client';
export async function uploadImage(file: File, kind: 'campaigns' | 'profiles' = 'campaigns') {
  const user = auth().currentUser;
  if (!user) throw new Error('Sign in again before uploading.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Choose a JPG, PNG, or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Images must be smaller than 5 MB.');
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const path = `${kind}/${user.uid}/${crypto.randomUUID()}.${ext}`;
  const target = ref(storage(), path);
  await uploadBytes(target, file, { contentType: file.type, cacheControl: 'public,max-age=3600' });
  return getDownloadURL(target);
}
