// Shared pieces for the server-rendered public pages (/a/<slug>, /in/<place>,
// /sitemap.xml). Not a route: the leading underscore keeps Vercel from
// exposing it.
//
// These pages exist so that a search engine, which never runs the app, has
// real HTML to read. Everything in them comes from the same tables the app
// reads, through functions granted to the anonymous role, so nothing here
// can say anything the app itself does not.

export const SITE = 'https://dates.care';
export const SITE_NAME = 'Dates.care';

export const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Call a Postgres function through PostgREST. Returns null on any failure. */
export async function rpc(name, args) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, VITE_SUPABASE_ANON_KEY } = process.env;
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || VITE_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !key) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args || {}),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export const CATEGORY_LABELS = {
  dating: 'Dating & Relationships',
  canada: 'Life in Canada',
  safety: 'Safety & Trust',
  community: 'Community',
  news: 'Dates Care News',
};

export function countryName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(String(code || '').toUpperCase()) || code;
  } catch {
    return code;
  }
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** The page frame: header, footer, the styles, and the metadata block. */
export function page({ title, description, canonical, image, robots, jsonLd, body, ogType = 'website', extraHead = '' }) {
  const img = typeof image === 'string' && image.startsWith('https://') ? image : `${SITE}/brand/logo-1024.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${robots ? `<meta name="robots" content="${esc(robots)}">` : ''}
<link rel="canonical" href="${esc(canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="${esc(ogType)}">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(img)}">
${extraHead}
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
<style>
  :root { --ink:#241C21; --ink2:#5E5058; --muted:#8B7B83; --line:#EADFE4; --rose:#E11D74; --rose2:#C8305A; --ground:#FFFBFC; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--ground); color:var(--ink); font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  a { color:var(--rose2); }
  header.site { background:linear-gradient(90deg,#ec4899,#f43f5e 50%,#9333ea); color:#fff; }
  header.site .in { max-width:760px; margin:0 auto; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
  header.site .brand { display:flex; align-items:center; gap:10px; color:#fff; text-decoration:none; font-weight:700; font-size:1.15rem; }
  header.site .brand img { width:32px; height:32px; border-radius:8px; background:#fff; }
  header.site nav a { color:#fff; text-decoration:none; margin-left:16px; font-weight:600; font-size:.95rem; }
  header.site nav a.join { background:#fff; color:#db2777; padding:8px 14px; border-radius:999px; }
  main { max-width:760px; margin:0 auto; padding:28px 20px 56px; }
  h1 { font-size:2rem; line-height:1.15; margin:0 0 10px; letter-spacing:-.01em; }
  .meta { color:var(--muted); font-size:.92rem; display:flex; flex-wrap:wrap; gap:6px 14px; margin-bottom:22px; }
  .cover { margin:0 0 22px; }
  .cover img { width:100%; height:auto; border-radius:14px; display:block; }
  .cover figcaption { font-size:.8rem; color:var(--muted); margin-top:6px; }
  .article { max-width:68ch; }
  .article p { margin:0 0 1.1em; }
  .article h2 { font-size:1.45rem; margin:1.6em 0 .5em; line-height:1.25; }
  .article h3 { font-size:1.15rem; margin:1.4em 0 .4em; }
  .article ul, .article ol { padding-left:1.4em; margin:0 0 1.1em; }
  .article li { margin:.3em 0; }
  .article blockquote { margin:1.2em 0; padding:.2em 0 .2em 1em; border-left:3px solid var(--rose); color:var(--ink2); }
  .article figure { margin:1.4em 0; }
  .article figure img { max-width:100%; height:auto; border-radius:12px; display:block; }
  .article figcaption { font-size:.85rem; color:var(--muted); margin-top:6px; }
  .article .table-wrap { overflow-x:auto; margin:1.2em 0; }
  .article table { border-collapse:collapse; width:100%; font-size:.95rem; }
  .article th, .article td { border:1px solid var(--line); padding:8px 10px; text-align:left; vertical-align:top; }
  .article th { background:#FBEEF3; }
  .article iframe { width:100%; aspect-ratio:16/9; border:0; border-radius:12px; }
  .article img { max-width:100%; height:auto; }
  .cta { margin:36px 0 0; padding:22px; border-radius:16px; background:linear-gradient(135deg,#fdf2f8,#fce7f3); border:1px solid #fbcfe8; }
  .cta h2 { margin:0 0 6px; font-size:1.25rem; }
  .cta p { margin:0 0 12px; color:var(--ink2); }
  .btn { display:inline-block; background:var(--rose); color:#fff; text-decoration:none; font-weight:700; padding:11px 18px; border-radius:12px; }
  .btn.alt { background:#fff; color:var(--rose2); border:1px solid #f9a8d4; margin-left:8px; }
  .more { margin-top:36px; }
  .more h2 { font-size:1.2rem; margin:0 0 12px; }
  .more ul { list-style:none; padding:0; margin:0; display:grid; gap:10px; }
  .more li a { display:flex; gap:12px; align-items:center; text-decoration:none; color:var(--ink); padding:10px; border:1px solid var(--line); border-radius:12px; background:#fff; }
  .more li img { width:64px; height:48px; object-fit:cover; border-radius:8px; flex:none; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin:20px 0 26px; }
  .stat { background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px; }
  .stat b { display:block; font-size:1.7rem; line-height:1; font-variant-numeric:tabular-nums; }
  .stat span { color:var(--muted); font-size:.85rem; }
  .list { list-style:none; padding:0; margin:0; display:grid; gap:8px; }
  .list li { display:flex; justify-content:space-between; background:#fff; border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
  .list li a { text-decoration:none; color:var(--ink); font-weight:600; }
  .note { color:var(--muted); font-size:.9rem; }
  footer.site { border-top:1px solid var(--line); color:var(--muted); font-size:.85rem; }
  footer.site .in { max-width:760px; margin:0 auto; padding:18px 20px; display:flex; flex-wrap:wrap; gap:8px 18px; }
  footer.site a { color:var(--muted); }
  @media (max-width:520px) { h1 { font-size:1.6rem; } header.site nav a { margin-left:10px; font-size:.88rem; } }
</style>
</head>
<body>
<header class="site"><div class="in">
  <a class="brand" href="${SITE}/"><img src="${SITE}/brand/logo-1024.png" alt="" width="32" height="32"> ${SITE_NAME}</a>
  <nav><a href="${SITE}/#care-blog">Care Blog</a><a class="join" href="${SITE}/#signup">Join free</a></nav>
</div></header>
<main>
${body}
</main>
<footer class="site"><div class="in">
  <span>© ${new Date().getFullYear()} DATES CARE, Scarborough, Ontario</span>
  <a href="${SITE}/terms">Terms</a>
  <a href="${SITE}/privacy">Privacy</a>
  <a href="${SITE}/#help">Help</a>
</div></footer>
</body>
</html>`;
}

// Province, state and territory names for the countries the app subdivides.
// Mirrors src/lib/regions.ts; kept in plain JS because Vercel functions do
// not import the app's TypeScript.
export const REGIONS = {
  CA: { AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick', NL: 'Newfoundland and Labrador', NS: 'Nova Scotia', NT: 'Northwest Territories', NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan', YT: 'Yukon' },
  US: { AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming' },
  NG: { AB: 'Abia', AD: 'Adamawa', AK: 'Akwa Ibom', AN: 'Anambra', BA: 'Bauchi', BY: 'Bayelsa', BE: 'Benue', BO: 'Borno', CR: 'Cross River', DE: 'Delta', EB: 'Ebonyi', ED: 'Edo', EK: 'Ekiti', EN: 'Enugu', FC: 'Abuja (FCT)', GO: 'Gombe', IM: 'Imo', JI: 'Jigawa', KD: 'Kaduna', KN: 'Kano', KT: 'Katsina', KE: 'Kebbi', KO: 'Kogi', KW: 'Kwara', LA: 'Lagos', NA: 'Nasarawa', NI: 'Niger', OG: 'Ogun', ON: 'Ondo', OS: 'Osun', OY: 'Oyo', PL: 'Plateau', RI: 'Rivers', SO: 'Sokoto', TA: 'Taraba', YO: 'Yobe', ZA: 'Zamfara' },
};

export function regionName(country, region) {
  const c = String(country || '').toUpperCase();
  const r = String(region || '').toUpperCase();
  return (REGIONS[c] && REGIONS[c][r]) || null;
}

export function placePath(country, region) {
  const c = String(country || '').toLowerCase();
  return region ? `/in/${c}/${String(region).toLowerCase()}` : `/in/${c}`;
}
