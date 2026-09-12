// /in/<country> and /in/<country>/<region> — "Dating in Ontario on Dates.care".
//
// One plain page per place: what the site is, which towns nearby members
// named, the other provinces or states, and a way in.
//
// It deliberately publishes no membership figures. A site that is still
// recruiting has a number that changes every day and reads as small on the
// day a stranger happens to look, and any figure printed here is a claim we
// would have to keep true. place_public() still returns counts, and they are
// still used here — but only to decide whether a page has enough behind it
// to be worth a search engine's time, and to order the towns. Nothing about
// how many people are in a place reaches the reader.

import { SITE, SITE_NAME, esc, rpc, page, countryName, regionName, placePath, REGIONS } from './_page.js';

const CODE = /^[a-z]{2}$/i;
const REGION = /^[a-z0-9]{1,3}$/i;

export default async function handler(req, res) {
  const country = typeof req.query?.country === 'string' ? req.query.country.trim().toUpperCase() : '';
  const region = typeof req.query?.region === 'string' && req.query.region.trim() ? req.query.region.trim().toUpperCase() : null;

  if (!CODE.test(country) || (region && !REGION.test(region)) || (region && !regionName(country, region))) {
    res.setHeader('Location', `${SITE}/`);
    return res.status(302).end();
  }

  const stats = await rpc('place_public', { p_country: country, p_region: region });
  if (!stats) {
    res.setHeader('Location', `${SITE}/`);
    return res.status(302).end();
  }

  const cName = countryName(country) || country;
  const rName = region ? regionName(country, region) : null;
  const placeName = rName ? `${rName}, ${cName}` : cName;
  const short = rName || cName;
  const towns = Array.isArray(stats.towns) ? stats.towns : [];
  const regions = Array.isArray(stats.regions) ? stats.regions : [];
  const canonical = `${SITE}${placePath(country, region)}`;

  // Used for the crawl decision only; never printed.
  const members = Number(stats.members || 0);

  // "Where do you live?" is a free-text box, so what comes back is "Canada",
  // "Scarborough Toronto Canada", "toronto". Trim the country or province off
  // the end, drop anything that was only the place this page already is, and
  // fold the duplicates together, so the list reads as towns rather than as
  // whatever people happened to type.
  const tail = [cName, rName, country].filter(Boolean);
  const townNames = [];
  const seen = new Set();
  for (const t of towns) {
    let name = String(t?.town ?? '').replace(/\s+/g, ' ').trim();
    for (const word of tail) {
      const re = new RegExp(`[\\s,]*${word.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i');
      name = name.replace(re, '').trim();
    }
    name = name.replace(/[,\s]+$/, '').trim();
    const key = name.toLowerCase();
    if (!name || name.length > 60 || seen.has(key)) continue;
    seen.add(key);
    townNames.push(name);
  }

  const title = `Dating in ${short} - meet singles on ${SITE_NAME}`;
  const description = `Meet single people in ${placeName} on ${SITE_NAME}. Every photo is screened before it is shown, and joining is free.`;

  const regionWord = country === 'CA' ? 'province' : country === 'US' || country === 'NG' ? 'state' : 'region';

  const body = `
<p class="note"><a href="${SITE}/">${SITE_NAME}</a>${rName ? ` · <a href="${SITE}${placePath(country)}">${esc(cName)}</a>` : ''}</p>
<h1>Meet singles in ${esc(short)}</h1>
<p>${SITE_NAME} is a dating site for people looking for something real, in ${esc(placeName)} and beyond. Every photo is screened by a person before anyone sees it, profiles can be verified, and contact details stay out of profiles until you choose to share them. Joining is free, and new members arrive every week.</p>
<p>Say who you are and who you are hoping to meet, add one photo, and you will be shown the people near you first.</p>
${townNames.length ? `<h2 style="font-size:1.2rem;margin:22px 0 10px">Towns and cities members have named</h2><ul class="list">${townNames.map((t) => `<li><span>${esc(t)}</span></li>`).join('')}</ul>` : ''}
${!region && regions.length ? `<h2 style="font-size:1.2rem;margin:22px 0 10px">By ${regionWord}</h2><ul class="list">${regions.map((r) => `<li><a href="${SITE}${placePath(country, r.region_code)}">${esc(regionName(country, r.region_code) || r.region_code)}</a></li>`).join('')}</ul>` : ''}
${!region && !regions.length && REGIONS[country] ? `<p class="note" style="margin-top:18px">Every ${regionWord} in ${esc(cName)} is welcome; they will be listed here as members name theirs.</p>` : ''}
<div class="cta">
  <h2>See who is in ${esc(short)}</h2>
  <p>Free to join. Every photo is screened before it is shown; profiles can be verified; contact details stay out of profiles.</p>
  <a class="btn" href="${SITE}/#signup">Join free</a><a class="btn alt" href="${SITE}/#care-blog">Read the Care Blog</a>
</div>
`;

  const html = page({
    title,
    description,
    canonical,
    // A place with nobody in it yet is a thin page, so it is kept out of the
    // index until it has something behind it. The reader is told nothing
    // either way.
    robots: members > 0 ? null : 'noindex, follow',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE },
    },
    body,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
