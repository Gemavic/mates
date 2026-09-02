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

  const put = (body: Blob) =>
    store.upload(path, body, { contentType: 'image/jpeg', upsert: true });

  const readableUrl = async (): Promise<string | null> => {
    if (isPublicBucket) return store.getPublicUrl(path).data.publicUrl;
    const { data } = await store.createSignedUrl(path, 600);
    return data?.signedUrl ?? null;
  };

  const discard = () => store.remove([path]);

  let blob = opts.blob;

  const { error: uploadError } = await put(blob);
  if (uploadError) {
    console.error('Upload failed:', uploadError);
    return { ok: false, error: 'Could not upload that photo. Please try again.' };
  }

  let url = await readableUrl();
  if (!url) {
    await discard();
    return { ok: false, error: 'Could not prepare that photo for checking. Please try again.' };
  }

  let verdict = await moderateImage(url, userId, opts.contentType ?? 'chat_media', { scanText: true });

  if (!verdict.allowed) {
    await discard();
    return { ok: false, error: verdict.reason ?? 'This image does not meet our content rules.' };
  }

  if (!verdict.textScan.found || verdict.textScan.boxes.length === 0) {
    return { ok: true };
  }

  // Paint over the words Vision located, replace the stored file, and read it
  // again. If anything is still legible after covering, it does not go.
  const covered = await coverRegions(blob, verdict.textScan.boxes);
  const { error: coverError } = await put(covered);

  if (coverError) {
    await discard();
    return { ok: false, error: 'Could not hide the contact details in that photo. Please try again.' };
  }

  blob = covered;
  url = await readableUrl();

  if (url) {
    verdict = await moderateImage(url, userId, opts.contentType ?? 'chat_media', { scanText: true });
  }

  if (verdict.textScan.found) {
    await discard();
    return {
      ok: false,
      error:
        'That photo has contact details written in it that could not be hidden. ' +
        'Phone numbers, emails and links cannot be shared here.',
    };
  }

  return { ok: true, notice: 'Contact details written in that photo were covered before it was sent.' };
}
