// supabase/functions/moderate-image/index.ts
//
// Real image moderation. Replaces contentModeration.scanImage(), which read the
// file and returned a heuristic verdict - i.e. there was no nudity detection on
// this site at all, only something shaped like it.
//
// Uses Google Cloud Vision SafeSearch: purpose-built for this, returns a
// likelihood per category, and costs about $1.50 per 1000 images.
//
// Set GOOGLE_VISION_API_KEY in Edge Function secrets to switch it on. Until
// then this returns configured:false and allows the image, and says so loudly
// in the logs - a moderation endpoint that silently approves everything while
// looking like it works is worse than none.

// Alongside SafeSearch it can also run DOCUMENT_TEXT_DETECTION, which is how
// a phone number written on a notepad is caught. That is asked for only where
// a leak is possible - a photo sent to another member - because Vision bills
// per feature per image.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { findContactText } from './contactText.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

type Likelihood =
  | 'UNKNOWN'
  | 'VERY_UNLIKELY'
  | 'UNLIKELY'
  | 'POSSIBLE'
  | 'LIKELY'
  | 'VERY_LIKELY';

const RANK: Record<Likelihood, number> = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 1,
  UNLIKELY: 2,
  POSSIBLE: 3,
  LIKELY: 4,
  VERY_LIKELY: 5,
};

interface SafeSearch {
  adult?: Likelihood;
  racy?: Likelihood;
  violence?: Likelihood;
  medical?: Likelihood;
  spoof?: Likelihood;
}

/**
 * Thresholds. Adult and violence are refused at LIKELY; "racy" is deliberately
 * stricter-to-tolerate at VERY_LIKELY only, because on a dating app swimwear
 * and gym photos routinely score racy=LIKELY and refusing those would reject
 * ordinary members. Anything that trips `review` is allowed through but queued
 * for a human.
 */
function verdict(safe: SafeSearch): {
  allowed: boolean;
  review: boolean;
  reason: string | null;
  category: string | null;
} {
  const adult = RANK[safe.adult ?? 'UNKNOWN'];
  const racy = RANK[safe.racy ?? 'UNKNOWN'];
  const violence = RANK[safe.violence ?? 'UNKNOWN'];

  if (adult >= RANK.LIKELY) {
    return { allowed: false, review: false, reason: 'Sexual or nude content is not allowed.', category: 'nudity' };
  }
  if (violence >= RANK.LIKELY) {
    return { allowed: false, review: false, reason: 'Violent content is not allowed.', category: 'violence' };
  }
  if (racy >= RANK.VERY_LIKELY) {
    return { allowed: false, review: false, reason: 'This image is too explicit for a public profile.', category: 'nudity' };
  }
  if (adult >= RANK.POSSIBLE || racy >= RANK.LIKELY) {
    return { allowed: true, review: true, reason: null, category: 'borderline' };
  }
  return { allowed: true, review: false, reason: null, category: null };
}

/** Service-role client so queueing is not subject to the caller's RLS. */
function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

async function queueForReview(
  userId: string | null,
  contentType: string,
  reason: string,
  severity: string,
  imageUrl: string
) {
  if (!userId) return;
  try {
    await admin().from('moderation_queue').insert({
      user_id: userId,
      content_type: contentType,
      // The table has a column for this; burying the URL inside `reason` meant
      // the review screen could not render the image it is meant to judge.
      content_url: imageUrl,
      reason,
      severity,
      status: 'pending',
    });
  } catch (error) {
    console.error('Failed to queue image for review:', error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { imageUrl, userId, contentType = 'photo', scanText = false } = await req.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return json({ allowed: false, error: 'imageUrl is required' }, 400);
    }

    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      console.error(
        'GOOGLE_VISION_API_KEY is not set - image moderation is INERT and every image is being allowed.'
      );
      return json({ allowed: true, configured: false, review: false, reason: null });
    }

    const features: Array<Record<string, string>> = [{ type: 'SAFE_SEARCH_DETECTION' }];
    if (scanText) features.push({ type: 'DOCUMENT_TEXT_DETECTION' });

    const annotate = async (image: Record<string, unknown>) => {
      const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ image, features }] }),
      });
      return { res, body: await res.json() };
    };

    // Ask Vision to fetch the URL itself first - cheapest path, no bytes move
    // through this function.
    let { res: response, body: result } = await annotate({ source: { imageUri: imageUrl } });

    // Vision cannot fetch every host (it is refused by Wikimedia, for one) and
    // says so with code 14, "We can not access the URL currently. Please
    // download the content and pass it in." Without this fallback such an image
    // would go unscanned, which is precisely the hole this function exists to
    // close - so do what it asks and send the bytes.
    const fetchFailed =
      !response.ok ||
      result?.responses?.[0]?.error?.code === 14 ||
      /can not access the URL/i.test(result?.responses?.[0]?.error?.message ?? '');

    if (fetchFailed) {
      try {
        const download = await fetch(imageUrl);
        if (download.ok) {
          const bytes = new Uint8Array(await download.arrayBuffer());
          // Chunked to avoid blowing the call stack on a large image.
          let binary = '';
          for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
          }
          ({ res: response, body: result } = await annotate({ content: btoa(binary) }));
        }
      } catch (error) {
        console.error('Could not download image for inline scan:', error);
      }
    }

    if (!response.ok || result?.responses?.[0]?.error) {
      // Availability over strictness: a Vision outage must not stop people
      // signing up. The image is allowed but a human is asked to look at it,
      // so nothing slips through entirely unexamined.
      console.error('Vision API error:', JSON.stringify(result?.error ?? result?.responses?.[0]?.error));
      await queueForReview(userId ?? null, contentType, 'Moderation unavailable - not scanned', 'medium', imageUrl);
      return json({ allowed: true, configured: true, review: true, reason: null, scanned: false });
    }

    const safe: SafeSearch = result?.responses?.[0]?.safeSearchAnnotation ?? {};
    const decision = verdict(safe);

    // Contact details written on paper, a screen or a hand. Reported rather
    // than refused: the caller covers the words and sends the rest of the
    // photo, which is what a member actually wants.
    let textScan: { scanned: boolean; found: boolean; matches: string[]; boxes: unknown[] } =
      { scanned: false, found: false, matches: [], boxes: [] };

    if (scanText) {
      const hits = findContactText(result?.responses?.[0]?.fullTextAnnotation);
      textScan = { scanned: true, found: hits.found, matches: hits.matches, boxes: hits.boxes };
      if (hits.found) {
        console.log('Contact details found in image', { userId, contentType, count: hits.boxes.length });
      }
    }

    if (!decision.allowed) {
      await queueForReview(userId ?? null, contentType, `Blocked: ${decision.category}`, 'critical', imageUrl);
    } else if (decision.review) {
      await queueForReview(userId ?? null, contentType, 'Borderline image, allowed pending review', 'medium', imageUrl);
    }

    console.log('Image scanned', { userId, contentType, safe, allowed: decision.allowed });

    return json({
      allowed: decision.allowed,
      review: decision.review,
      reason: decision.reason,
      category: decision.category,
      configured: true,
      scanned: true,
      likelihoods: safe,
      textScan,
    });
  } catch (error: any) {
    console.error('moderate-image failed:', error?.message ?? error);
    return json({ allowed: true, configured: true, review: true, scanned: false, reason: null });
  }
});
