import { supabaseClient } from './supabase';
import type { CoverBox } from './coverContactText';

/**
 * Real image moderation, via the moderate-image edge function (Google Cloud
 * Vision).
 *
 * This replaces contentModeration.scanImage(), which was a stub: it read the
 * file and returned a heuristic verdict, so nothing on this site actually
 * detected nudity. Scanning happens server-side because a client-side check is
 * advice, not enforcement - anyone can skip it.
 */

export interface TextScan {
  /** True when text detection actually ran on this image. */
  scanned: boolean;
  /** True when a phone number, email, link or handle was read out of it. */
  found: boolean;
  /** What was read, for the message shown to the sender. */
  matches: string[];
  /** Where each offending word sits, in the scanned image's pixels. */
  boxes: CoverBox[];
}

export interface ImageVerdict {
  /** False only when the scan positively identified disallowed content. */
  allowed: boolean;
  /** Allowed, but queued for a human to look at. */
  review: boolean;
  /** User-facing explanation when refused. */
  reason: string | null;
  /** False when GOOGLE_VISION_API_KEY is not set - nothing was scanned. */
  configured: boolean;
  /** Only populated when scanText was asked for. */
  textScan: TextScan;
}

const NO_TEXT_SCAN: TextScan = { scanned: false, found: false, matches: [], boxes: [] };

export async function moderateImage(
  imageUrl: string,
  userId: string,
  contentType: 'photo' | 'chat_media' | 'feed_media' = 'photo',
  options: { scanText?: boolean } = {}
): Promise<ImageVerdict> {
  try {
    const { data, error } = await supabaseClient.functions.invoke('moderate-image', {
      body: { imageUrl, userId, contentType, scanText: options.scanText === true },
    });

    if (error) {
      // Availability over strictness: a moderation outage must not stop people
      // uploading a profile photo at all. The server queues unscanned images
      // for review, so this is not a silent pass.
      console.error('Image moderation call failed, allowing upload:', error);
      return { allowed: true, review: true, reason: null, configured: false, textScan: NO_TEXT_SCAN };
    }

    return {
      allowed: data?.allowed !== false,
      review: !!data?.review,
      reason: data?.reason ?? null,
      configured: !!data?.configured,
      textScan: {
        scanned: !!data?.textScan?.scanned,
        found: !!data?.textScan?.found,
        matches: Array.isArray(data?.textScan?.matches) ? data.textScan.matches : [],
        boxes: Array.isArray(data?.textScan?.boxes) ? data.textScan.boxes : [],
      },
    };
  } catch (err) {
    console.error('Image moderation threw, allowing upload:', err);
    return { allowed: true, review: true, reason: null, configured: false, textScan: NO_TEXT_SCAN };
  }
}
