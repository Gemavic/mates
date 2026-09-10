// supabase/functions/blog-draft/index.ts
//
// A first draft, written by machine, published by a person.
//
// The Care Blog editor's Generate button sends a topic here. This asks
// Gemini for a title, summary, body, SEO fields and picture search terms,
// and hands them straight back into the editor as a DRAFT. Nothing in this
// file writes an article, publishes anything, or notifies anybody - the
// admin reads what comes back, corrects it, and presses Publish.
//
// Two guardrails live in the prompt rather than in hope:
//
//  1. The model is forbidden to describe what Dates.care does - no prices,
//     features, verification claims, safety promises or statistics about
//     the site. Only the people who can read the code know what the site
//     actually backs, so those sentences must be written by the admin. When
//     a point needs one, the model leaves it out of the body and says so in
//     `notes`.
//  2. No invented figures, studies, quotes or names. A blog that cites a
//     statistic nobody can find is worse than one that cites none.
//
// Secrets (Supabase dashboard -> Edge Functions -> Secrets):
//   GEMINI_API_KEY            required
//   GEMINI_MODEL              optional, defaults below
//   BLOG_DRAFT_DAILY_LIMIT    optional, defaults to 40 per admin per day

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

// Google renames these fairly often, so it is an environment variable with a
// sensible default rather than a constant buried in the code.
const MODEL = env('GEMINI_MODEL') || 'gemini-3.8-flash';

// A model name looks like "gemini-2.5-flash". Anything else in that secret is
// almost certainly a key pasted into the wrong box, and a key must never be
// echoed back to a browser, even an admin's.
const MODEL_LOOKS_RIGHT = /^(models\/)?[a-z]+-[a-z0-9.-]{2,50}$/.test(MODEL);
const DAILY_LIMIT = Number(env('BLOG_DRAFT_DAILY_LIMIT') || '40');

const CATEGORY_BRIEF: Record<string, string> = {
  dating: 'dating and relationships - meeting people, first messages, first dates, trust, going slowly, ending things kindly',
  canada: 'life in Canada for people who moved here - winter, work, family expectations back home, loneliness, building a circle',
  safety: 'staying safe and keeping your head - spotting pressure, money requests, moving too fast, meeting in person for the first time',
  community: 'belonging - friendship, faith, food, holidays, keeping culture while building a new life',
  news: 'a plain note from the Dates Care team - leave the specifics to the editor',
};

const AUDIENCE_BRIEF: Record<string, string> = {
  diaspora: 'Nigerians and West Africans building a life in Canada. Write as one of them, not about them. No pity, no lecturing.',
  general: 'Canadian singles generally, of any background.',
  '': 'A general adult readership in Canada.',
};

const LENGTH_WORDS: Record<string, number> = { short: 450, medium: 800, long: 1200 };

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    excerpt: { type: 'string' },
    html: { type: 'string' },
    seo_title: { type: 'string' },
    seo_keywords: { type: 'string' },
    image_queries: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'excerpt', 'html', 'seo_title', 'seo_keywords', 'image_queries', 'notes'],
};

function buildPrompt(opts: {
  topic: string;
  category: string;
  audience: string;
  length: string;
  extra: string;
}): string {
  const words = LENGTH_WORDS[opts.length] ?? LENGTH_WORDS.medium;
  return [
    'You are drafting an article for the Care Blog of Dates.care, a Canadian dating site run by DATES CARE, a sole proprietorship in Scarborough, Ontario.',
    '',
    `TOPIC: ${opts.topic}`,
    `SECTION: ${CATEGORY_BRIEF[opts.category] ?? CATEGORY_BRIEF.dating}`,
    `READER: ${AUDIENCE_BRIEF[opts.audience] ?? AUDIENCE_BRIEF['']}`,
    `LENGTH: about ${words} words.`,
    opts.extra ? `THE EDITOR ALSO ASKS: ${opts.extra}` : '',
    '',
    'RULES YOU MUST NOT BREAK:',
    '1. Never describe what Dates.care does, offers, charges or promises. No features, prices, credits, membership tiers, verification claims, moderation claims, safety guarantees, or numbers about the site or its members. You do not know these and must not guess. If a point would need one, leave it out of the article and write the question in "notes" for the editor to answer.',
    '2. Never invent a statistic, a study, a survey, a research finding, an expert, a quotation, a person or a date. If you would normally cite a figure, make the point without it.',
    '3. Do not give medical, legal, immigration or financial advice as if you were qualified. General, practical, kind observations only.',
    '4. Do not stereotype anyone by nationality, gender, religion or immigration status. Write about people as individuals.',
    '5. Never tell the reader to hurry, to pay for anything, or that they are missing out.',
    '',
    'HOW TO WRITE:',
    '- Plain Canadian English. Short words. Warm and direct, the way a sensible older friend talks. Second person where it helps.',
    '- Open with a concrete situation, not a definition. Never begin with "In today\'s world", "In the digital age", or "Dating can be hard".',
    '- No emojis. No hype. No clickbait. No headings called "Introduction" or "Conclusion".',
    '- Two to five <h2> sections with real, specific headings. Use <h3> only inside a long section.',
    '- Include one small table ONLY where a comparison genuinely helps the reader. Never more than three columns, because most readers are on a phone.',
    '- A short list is fine. Do not turn the whole piece into bullet points.',
    '',
    'OUTPUT - a JSON object with exactly these keys:',
    'title: 4 to 90 characters, specific, no colon-subtitle pattern.',
    'excerpt: one or two plain sentences, under 300 characters, no marketing language.',
    'html: the article body as an HTML fragment. Allowed tags ONLY: p, h2, h3, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, strong, em, br. Absolutely no h1, img, script, style, class or style attributes, and no markdown.',
    'seo_title: under 120 characters.',
    'seo_keywords: 4 to 8 comma-separated phrases a reader might actually type.',
    'image_queries: 3 to 5 short photo search phrases for a free stock library, describing real scenes (for example "woman reading message on phone winter"). No brand names, no celebrities.',
    'notes: every fact about Dates.care you deliberately left out, and anything the editor should check before publishing. Empty array only if there is genuinely nothing.',
  ].filter(Boolean).join('\n');
}

/** Strip anything the allow-list would not survive. The browser sanitises
 *  again with DOMPurify before this is shown or saved; this is the first of
 *  the two gates, not the only one. */
function scrubHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/```html|```/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|form|input|button)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\sstyle\s*=\s*"[^"]*"/gi, '')
    .replace(/\sstyle\s*=\s*'[^']*'/gi, '')
    .replace(/<\s*h1[^>]*>/gi, '<h2>')
    .replace(/<\s*\/\s*h1\s*>/gi, '</h2>')
    .trim();
}

function textFromJsonish(s: string): string {
  const t = String(s ?? '').trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : t).trim();
}

/** Gemini has two live request shapes: the newer unified /interactions
 *  endpoint and the older models/<id>:generateContent. Which one an account
 *  gets depends on the API version, so this tries the new one and falls back
 *  rather than failing on a shape it cannot control. */
async function askGemini(apiKey: string, prompt: string): Promise<{ text: string; via: string }> {
  const errors: string[] = [];

  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        response_format: { type: 'text', mime_type: 'application/json', schema: SCHEMA },
      }),
    });
    const body = await r.json().catch(() => null);
    if (r.ok) {
      const text = body?.output_text ?? body?.interaction?.output_text ?? '';
      if (text) return { text, via: 'interactions' };
      errors.push('interactions: empty output_text');
    } else {
      errors.push(`interactions ${r.status}: ${body?.error?.message ?? JSON.stringify(body ?? {}).slice(0, 300)}`);
    }
  } catch (e) {
    errors.push(`interactions: ${String(e)}`);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.85 },
      }),
    });
    const body = await r.json().catch(() => null);
    if (r.ok) {
      const parts = body?.candidates?.[0]?.content?.parts ?? [];
      const text = parts.map((p: { text?: string }) => p?.text ?? '').join('');
      if (text) return { text, via: 'generateContent' };
      errors.push('generateContent: empty response');
    } else {
      errors.push(`generateContent ${r.status}: ${body?.error?.message ?? JSON.stringify(body ?? {}).slice(0, 300)}`);
    }
  } catch (e) {
    errors.push(`generateContent: ${String(e)}`);
  }

  throw new Error(errors.join(' | '));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY');
  const apiKey = env('GEMINI_API_KEY');

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

  if (!apiKey) {
    return json({
      error: 'not_configured',
      message: 'GEMINI_API_KEY is not set on this project. Add it under Edge Functions, Secrets.',
    }, 503);
  }
  if (!MODEL_LOOKS_RIGHT) {
    return json({
      error: 'not_configured',
      message: 'GEMINI_MODEL does not look like a model name (it should read like "gemini-2.5-flash"). It may hold a key by mistake. Delete that secret, or set it to a model name, under Edge Functions, Secrets.',
    }, 503);
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('blog_draft_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return json({
      error: 'rate_limited',
      message: `That is ${DAILY_LIMIT} drafts in a day, which is the cap. It resets on a rolling 24 hours.`,
    }, 429);
  }

  const body = await req.json().catch(() => ({}));
  const topic = String(body?.topic ?? '').trim().slice(0, 300);
  const category = String(body?.category ?? '').trim();
  const audience = String(body?.audience ?? '').trim();
  const length = String(body?.length ?? 'medium').trim();
  const extra = String(body?.extra ?? '').trim().slice(0, 600);

  if (topic.length < 4) return json({ error: 'invalid', message: 'Give the topic in a few words at least.' }, 400);

  const log = async (ok: boolean, error: string | null, words: number | null) => {
    await admin.from('blog_draft_runs').insert({
      user_id: user.id, topic, category: category || null, model: MODEL, ok, error, words,
    });
  };

  let raw: { text: string; via: string };
  try {
    raw = await askGemini(apiKey, buildPrompt({ topic, category, audience, length, extra }));
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e).slice(0, 900);
    await log(false, message, null);
    return json({
      error: 'generation_failed',
      message,
      hint: `The model asked for was "${MODEL}". If that name is not available on your key, set GEMINI_MODEL in Edge Function secrets to one that is (for example gemini-2.5-flash).`,
    }, 502);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(textFromJsonish(raw.text));
  } catch {
    await log(false, 'unparseable JSON from the model', null);
    return json({ error: 'bad_output', message: 'The model did not return usable JSON. Please try again.' }, 502);
  }

  const html = scrubHtml(String(parsed.html ?? ''));
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plain ? plain.split(' ').length : 0;

  if (words < 120) {
    await log(false, `too short (${words} words)`, words);
    return json({ error: 'too_short', message: 'The draft came back too short to use. Please try again.' }, 502);
  }

  await log(true, null, words);

  const arr = (v: unknown, max: number) =>
    Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, max) : [];

  return json({
    ok: true,
    model: MODEL,
    via: raw.via,
    words,
    draft: {
      title: String(parsed.title ?? '').trim().slice(0, 140),
      excerpt: String(parsed.excerpt ?? '').trim().slice(0, 300),
      html,
      seo_title: String(parsed.seo_title ?? '').trim().slice(0, 120),
      seo_keywords: String(parsed.seo_keywords ?? '').trim().slice(0, 300),
      image_queries: arr(parsed.image_queries, 5),
      notes: arr(parsed.notes, 12),
    },
  });
});
