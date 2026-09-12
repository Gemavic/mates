// /sitemap.xml — built from the database on request, so a new article or a
// new province with members is in the sitemap the moment it exists.
//
// Only real, crawlable URLs: the homepage, the two legal pages, every
// published Care Blog article at /a/<slug>, and every country or region
// page with at least one complete profile. Fragment addresses (/#signin)
// are never listed; a crawler discards the fragment and sees the homepage.

import { SITE, esc, rpc, placePath } from './_page.js';

function iso(d) {
  const t = d ? new Date(d) : null;
  return t && !Number.isNaN(t.getTime()) ? t.toISOString().slice(0, 10) : null;
}

export default async function handler(req, res) {
  const data = (await rpc('sitemap_entries')) || {};
  const articles = Array.isArray(data.articles) ? data.articles : [];
  const places = (Array.isArray(data.places) ? data.places : []).filter((p) => Number(p.members) > 0 && p.country_code);

  const urls = [
    { loc: `${SITE}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${SITE}/terms`, changefreq: 'monthly', priority: '0.3' },
    { loc: `${SITE}/privacy`, changefreq: 'monthly', priority: '0.3' },
    ...articles.map((a) => ({ loc: `${SITE}/a/${a.slug}`, lastmod: iso(a.lastmod), changefreq: 'monthly', priority: '0.7' })),
    ...places.map((p) => ({ loc: `${SITE}${placePath(p.country_code, p.region_code)}`, changefreq: 'weekly', priority: p.region_code ? '0.6' : '0.5' })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${esc(u.loc)}</loc>${u.lastmod ? `
    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
