// /a/<slug> — the address to share an article by.
//
// dates.care is an app: every page is the same index.html, so a link
// pasted into WhatsApp, Facebook or an email showed the site's generic card
// no matter which article it pointed at. This route prints the article's
// own title, summary and thumbnail as Open Graph tags for the preview
// robots, and sends a person straight on to the article in the app. The
// hand-off is a script, not a meta refresh, so a preview robot that follows
// refreshes does not end up reading the generic homepage card instead.
//
// Reads through article_share_card(), which returns published pieces only.
// Required Vercel environment variables (already set): SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

const SLUG = /^[a-z0-9-]{1,90}$/;

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default async function handler(req, res) {
  const slug = typeof req.query?.slug === 'string' ? req.query.slug.trim() : '';
  const home = 'https://dates.care/#care-blog';
  if (!SLUG.test(slug)) {
    res.setHeader('Location', home);
    return res.status(302).end();
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  let card = null;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/article_share_card`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_slug: slug }),
      });
      card = r.ok ? await r.json() : null;
    } catch {
      card = null;
    }
  }

  const target = `https://dates.care/#care-blog?a=${encodeURIComponent(slug)}`;
  if (!card || !card.title) {
    res.setHeader('Location', home);
    return res.status(302).end();
  }

  const title = `${card.title} - Dates.care Care Blog`;
  const description = card.description || 'Practical writing on dating, relationships and looking after yourself.';
  const image = typeof card.image === 'string' && card.image.startsWith('https://') ? card.image : 'https://dates.care/brand/logo-1024.png';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(description)}">
${card.keywords ? `<meta name="keywords" content="${esc(card.keywords)}">` : ''}
<link rel="canonical" href="https://dates.care/a/${esc(slug)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Dates.care">
<meta property="og:url" content="https://dates.care/a/${esc(slug)}">
<meta property="og:title" content="${esc(card.title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
${card.published_at ? `<meta property="article:published_time" content="${esc(card.published_at)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(card.title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body style="font-family:system-ui,sans-serif;padding:2rem;color:#333">
<p>Opening <strong>${esc(card.title)}</strong> on Dates.care…</p>
<p><a href="${esc(target)}">Read the article</a></p>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
