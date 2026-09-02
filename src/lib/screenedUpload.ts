import { supabaseClient } from './supabase';
import { moderateImage } from './imageModeration';
import { coverRegions } from './coverContactText';

/**
 * Uploads one picture and puts it through the same gate wherever it is going.
 *
 * This exists because the gate was only ever on one path. Chat photos were
 * scanned; mail attachments were not, so a phone number written on a notepad
 * travelled by mail untouched while the identical picture was refused in chat.
 * Every screen that accepts a picture from a member now calls this.
 *
 * The picture is uploaded first because Vision reads it from a URL. If it is
 * refused, the object is deleted rather than left addressable in the bucket.
 */

export interface ScreenedUpload {
  ok: boolean;
  /**
   * Where the image actually ended up. When contact details had to be covered
   * this is NOT the path that was passed in: the covered version is written
   * beside it under a new name and the original deleted. Overwriting in place
   * meant trusting both an UPDATE policy and the CDN to stop serving the copy
   * it had already cached at that path - which is how a photo could be
   * reported as covered and still arrive readable. Callers must store this.
   */
  path?: string;
  /** Why it was refused, ready to show the sender. */
  error?: string;
  /** Something worth telling the sender even though it went through. */
  notice?: string;
}

export async function uploadScreenedImage(opts: {
  bucket: string;
  path: string;
  blob: Blob;
  userId: string;
  /** Private buckets need a signed URL for Vision to be able to read them. */
  isPublicBucket: boolean;
  contentType?: 'chat_media' | 'photo' | 'feed_media';
}): Promise<ScreenedUpload> {
  const { bucket, path, userId, isPublicBucket } = opts;
  const store = supabaseClient.storage.from(bucket);

  const put = (at: string, body: Blob) =>
    store.upload(at, body, { contentType: 'image/jpeg', upsert: false });

  const readableUrl = async (at: string): Promise<string | null> => {
    if (isPublicBucket) return store.getPublicUrl(at).data.publicUrl;
    const { data } = await store.createSignedUrl(at, 600);
    return data?.signedUrl ?? null;
  };

  const discard = (at: string) => store.remove([at]);

  const blob = opts.blob;

  const { error: uploadError } = await put(path, blob);
  if (uploadError) {
    console.error('Upload failed:', uploadError);
    return { ok: false, error: 'Could not upload that photo. Please try again.' };
  }

  let url = await readableUrl(path);
  if (!url) {
    await discard(path);
    return { ok: false, error: 'Could not prepare that photo for checking. Please try again.' };
  }

  let verdict = await moderateImage(url, userId, opts.contentType ?? 'chat_media', { scanText: true });

  if (!verdict.allowed) {
    await discard(path);
    return { ok: false, error: verdict.reason ?? 'This image does not meet our content rules.' };
  }

  if (!verdict.textScan.found || verdict.textScan.boxes.length === 0) {
    return { ok: true, path };
  }

  // Paint over the words Vision located and store the result under a NEW name,
  // then read that one back. If anything is still legible after covering, it
  // does not go.
  const coveredPath = path.replace(/(\.[a-z0-9]+)?$/i, '') + '-covered.jpg';
  const covered = await coverRegions(blob, verdict.textScan.boxes);

  const { error: coverError } = await put(coveredPath, covered);
  if (coverError) {
    console.error('Could not store the covered version of the photo:', coverError);
    await discard(path);
    return { ok: false, error: 'Could not hide the contact details in that photo. Please try again.' };
  }

  url = await readableUrl(coveredPath);
  if (url) {
    verdict = await moderateImage(url, userId, opts.contentType ?? 'chat_media', { scanText: true });
  }

  if (verdict.textScan.found) {
    await discard(path);
    await discard(coveredPath);
    return {
      ok: false,
      error:
        'That photo has contact details written in it that could not be hidden. ' +
        'Phone numbers, emails and links cannot be shared here.',
    };
  }

  // The uncovered original must not be left addressable.
  await discard(path);

  return {
    ok: true,
    path: coveredPath,
    notice: 'Contact details written in that photo were covered before it was sent.',
  };
}
