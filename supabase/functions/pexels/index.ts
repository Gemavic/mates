// supabase/functions/pexels/index.ts
//
// Free stock pictures for the Care Blog, without the key ever reaching a
// browser and without hot-linking somebody else's server.
//
// Two actions, both admin-only:
//   search  - proxies a Pexels photo search and returns what it found
//   import  - fetches the chosen photo, stores it in our own blog-media
//             bucket, and hands back our URL plus the photographer's name
//             and page
//
// Importing rather than hot-linking matters for three reasons: the picture
// keeps working if Pexels moves it, our own sanitiser and screening see it
// like any other image on the site, and readers' browsers are not made to
// call a third party to read an article.
//
// The Pexels licence asks that photographers be credited where a credit can
// be shown, so the name and link travel with the picture and the editor
// keeps them on the article.
//
// Secret (Supabase dashboard -> Edge Functions -> Secrets):
//   PEXELS_API_KEY   required

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const env = (name: string) => (Deno.env.get(name) ?? '').trim();

const MAX_BYTES = 8 * 1024 * 1024;

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  alt: string | null;
  avg_color: string | null;
  photographer: string;
  photographer_url: string;
  src: Record<string, string>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY');
  const pexelsKey = env('PEXELS_API_KEY');

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const asCaller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await asCaller.auth.getUser(authHeader.replace('Bearer ', ''));
  if (userError || !user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: account } = await admin
    .from('app_credit_accounts')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!account?.is_admin) return json({ error: 'forbidden' }, 403);

  if (!pexelsKey) {
    return json({
      error: 'not_configured',
      message: 'PEXELS_API_KEY is not set on this project. Add it under Edge Functions, Secrets.',
    }, 503);
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? 'search');

  // ---- search ---------------------------------------------------------------
  if (action === 'search') {
    const query = String(body?.query ?? '').trim().slice(0, 120);
    const page = Math.min(Math.max(Number(body?.page ?? 1) || 1, 1), 20);
    const orientation = ['landscape', 'portrait', 'square'].includes(String(body?.orientation))
      ? String(body.orientation)
      : 'landscape';
    if (query.length < 2) return json({ error: 'invalid', message: 'Type something to search for.' }, 400);

    const url = new URL('https://api.pexels.com/v1/search');
    url.searchParams.set('query', query);
    url.searchParams.set('per_page', '24');
    url.searchParams.set('page', String(page));
    url.searchParams.set('orientation', orientation);

    const r = await fetch(url.toString(), { headers: { Authorization: pexelsKey } });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      if (r.status === 429) {
        return json({ error: 'rate_limited', message: 'Pexels is rate limiting us. Try again in a little while.' }, 429);
      }
      return json({ error: 'search_failed', message: `Pexels replied ${r.status}. ${text.slice(0, 200)}` }, 502);
    }
    const data = await r.json().catch(() => null);
    const photos: PexelsPhoto[] = Array.isArray(data?.photos) ? data.photos : [];

    return json({
      ok: true,
      total: data?.total_results ?? photos.length,
      page,
      photos: photos.map((p) => ({
        id: p.id,
        thumb: p.src?.medium ?? p.src?.small ?? '',
        full: p.src?.large2x ?? p.src?.large ?? p.src?.original ?? '',
        alt: (p.alt ?? '').slice(0, 200),
        avg_color: p.avg_color ?? null,
        photographer: p.photographer,
        photographer_url: p.photographer_url,
        page_url: p.url,
      })),
    });
  }

  // ---- import ---------------------------------------------------------------
  if (action === 'import') {
    const src = String(body?.url ?? '').trim();
    const photographer = String(body?.photographer ?? '').trim().slice(0, 100);
    const photographerUrl = String(body?.photographer_url ?? '').trim().slice(0, 300);

    // Only Pexels' own image host. This endpoint must never become a way to
    // pull an arbitrary URL into our storage.
    let host = '';
    try { host = new URL(src).hostname.toLowerCase(); } catch { host = ''; }
    if (!src.startsWith('https://') || !(host === 'images.pexels.com' || host.endsWith('.pexels.com'))) {
      return json({ error: 'invalid', message: 'That is not a Pexels picture address.' }, 400);
    }

    const r = await fetch(src);
    if (!r.ok) return json({ error: 'download_failed', message: `Pexels replied ${r.status}.` }, 502);

    const type = (r.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) {
      return json({ error: 'invalid', message: `That file is ${type || 'of an unknown type'}, not a picture we accept.` }, 400);
    }

    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) {
      return json({ error: 'too_large', message: 'That picture is larger than 8 MB. Pick a smaller size.' }, 400);
    }

    const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
    const path = `articles/pexels-${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from('blog-media')
      .upload(path, bytes, { contentType: type, upsert: false });
    if (uploadError) {
      return json({ error: 'store_failed', message: uploadError.message }, 502);
    }

    return json({
      ok: true,
      path,
      url: `${supabaseUrl}/storage/v1/object/public/blog-media/${path}`,
      credit: photographer ? `Photo by ${photographer} on Pexels` : 'Photo from Pexels',
      credit_url: photographerUrl || 'https://www.pexels.com',
    });
  }

  return json({ error: 'unknown_action' }, 400);
});
