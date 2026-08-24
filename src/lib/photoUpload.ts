import { supabaseClient } from '@/lib/supabase';
import { moderateImage } from '@/lib/imageModeration';

const MAX_DIMENSION = 1200; // plenty for both grid thumbnails and full profile view
const JPEG_QUALITY = 0.85;

/**
 * Resizes an image file client-side (via canvas) to a reasonable max
 * dimension and re-encodes it as JPEG at a sane quality — phone camera
 * photos are routinely 3000-4000px+ and several megabytes; nothing in
 * this app needs that resolution, and shipping it as-is (previously as
 * base64 text embedded directly in the database) meant every profile
 * view downloaded far more data than the UI ever displayed.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image compression failed'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

/**
 * Compresses and uploads a profile photo to real Supabase Storage,
 * returning a stable, publicly-cacheable URL — replaces the previous
 * pattern of embedding the entire file as a base64 data URL directly in
 * the database row.
 */
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  const compressed = await compressImage(file);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error: uploadError } = await supabaseClient.storage
    .from('profile-photos')
    .upload(path, compressed, {
      contentType: 'image/jpeg',
      cacheControl: '31536000', // 1 year — filenames are unique per upload, never reused
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabaseClient.storage.from('profile-photos').getPublicUrl(path);

  // Scan before the URL is handed back, so a refused photo never reaches a
  // profile row. Vision needs to fetch the image, hence scanning after upload
  // rather than before - and a refusal deletes the object again so nothing is
  // left addressable in the bucket.
  const verdict = await moderateImage(data.publicUrl, userId, 'photo');
  if (!verdict.allowed) {
    await supabaseClient.storage.from('profile-photos').remove([path]);
    throw new Error(verdict.reason ?? 'This photo does not meet our content rules.');
  }

  return data.publicUrl;
}
