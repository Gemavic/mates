// /blog — every published Care Blog article as a plain list of links.
//
// Search Console (8 Oct 2026) showed 15 pages as "Discovered - currently not
// indexed". The articles were reachable only from the sitemap and from each
// other's "More to read" boxes: the homepage and every page header linked to
// the Care Blog through /#care-blog, a fragment a crawler never follows. This
// page puts each article one ordinary link from the homepage, and links the
// place pages too.
//
// Reads through blog_index_public(), which returns published pieces only and
// place codes without member counts.

import { SITE, SITE_NAME, esc, rpc, page, CATEGORY_LABELS, formatDate, countryName, regionName, placePath } from './_page.js';

export default async function handler(req, res) {
  const data = await rpc('blog_index_public');
  if (!data) {
    // Database unreachable. Say so, rather than serving an empty list that a
    // crawler would record as the page's real content.
    res.setHeader('Retry-After', '300');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).send('The Care Blog is briefly unavailable. Please try again in a few minutes.');
  }
  const articles = Array.isArray(data.articles) ? data.articles.filter((a) => a && a.slug && a.title) : [];
  const places = Array.isArray(data.places) ? data.places.filter((p) => p && p.country_code) : [];

  const canonical = `${SITE}/blog`;
  const title = `Care Blog - dating advice and real talk from ${SITE_NAME}`;
  const description = 'Plain, practical writing about dating, first messages, meeting safely, long distance, faith, family and starting again. Free to read.';

  const item = (a) => {
    const img = typeof a.cover_image === 'string' && a.cover_image.startsWith('https://') ? a.cover_image : null;
    const cat = CATEGORY_LABELS[a.category] || null;
    const meta = [cat, a.published_at ? formatDate(a.published_at) : null, `${a.read_minutes || 1} min read`].filter(Boolean).map(esc).join(' · ');
    return `<li><a href="${SITE}/a/${esc(a.slug)}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}<span><strong>${esc(a.title)}</strong>${a.excerpt ? `<em>${esc(a.excerpt)}</em>` : ''}<small>${meta}</small></span></a></li>`;
  };

  const placeLink = (p) => {
    const name = p.region_code ? (regionName(p.country_code, p.region_code) || p.region_code) : (countryName(p.country_code) || p.country_code);
    return `<li><a href="${SITE}${placePath(p.country_code, p.region_code)}">Dating in ${esc(name)}</a></li>`;
  };

  const body = `
<style>
  .posts { list-style:none; padding:0; margin:0; display:grid; gap:12px; }
  .posts li a { display:flex; gap:14px; align-items:flex-start; text-decoration:none; color:var(--ink); padding:14px; border:1px solid var(--line); border-radius:14px; background:#fff; }
  .posts li img { width:96px; height:72px; object-fit:cover; border-radius:10px; flex:none; }
  .posts strong { display:block; font-size:1.08rem; line-height:1.3; }
  .posts em { display:block; font-style:normal; color:var(--ink2); font-size:.95rem; margin-top:4px; }
  .posts small { display:block; color:var(--muted); font-size:.82rem; margin-top:6px; }
  .places { list-style:none; padding:0; margin:0; display:flex; flex-wrap:wrap; gap:8px; }
  .places a { display:inline-block; padding:7px 12px; border:1px solid var(--line); border-radius:999px; background:#fff; text-decoration:none; color:var(--ink); font-size:.92rem; }
</style>
<p class="note"><a href="${SITE}/">${SITE_NAME}</a> · Care Blog</p>
<h1>Care Blog</h1>
<p>Plain writing about meeting someone and keeping it going: first messages, first coffees, long distance, faith and family, starting again after a divorce, and knowing when to take a break. Free to read, no account needed.</p>
${articles.length ? `<ul class="posts">${articles.map(item).join('')}</ul>` : '<p class="note">New articles are on their way.</p>'}
${places.length ? `<h2 style="font-size:1.2rem;margin:32px 0 10px">Meet people near you</h2><ul class="places">${places.map(placeLink).join('')}</ul>` : ''}
<div class="cta">
  <h2>Reading is free. So is joining.</h2>
  <p>Browsing and chatting cost nothing, with no limit on messages and no subscription. Every photo is screened before it is shown.</p>
  <a class="btn" href="${SITE}/#signup">Join free</a><a class="btn alt" href="${SITE}/#care-blog">Open in the app</a>
</div>
`;

  const html = page({
    trackPath: '/blog',
    title,
    description,
    canonical,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `${SITE_NAME} Care Blog`,
      description,
      url: canonical,
      publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE}/brand/logo-1024.png` } },
      blogPost: articles.slice(0, 50).map((a) => ({
        '@type': 'BlogPosting',
        headline: a.title,
        url: `${SITE}/a/${a.slug}`,
        datePublished: a.published_at || undefined,
      })),
    },
    body,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
