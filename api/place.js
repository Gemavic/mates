// /in/<country> and /in/<country>/<region> — "Dating in Ontario on Dates.care".
//
// One plain page per place, with the live number of members there who have
// a complete profile (photo, gender, who they seek, country, city), the
// towns they named, and a way in. The numbers come from place_public() at
// request time, so a page never claims more people than the site has; when
// there is nobody yet, it says so and asks search engines not to index it.

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
  const members = Number(stats.members || 0);
  const women = Number(stats.women || 0);
  const men = Number(stats.men || 0);
  const joined = Number(stats.joined_30d || 0);
  const towns = Array.isArray(stats.towns) ? stats.towns : [];
  const regions = Array.isArray(stats.regions) ? stats.regions : [];
  const canonical = `${SITE}${placePath(country, region)}`;

  const title = `Dating in ${short} - meet singles on ${SITE_NAME}`;
  const description = members > 0
    ? `${members} ${members === 1 ? 'member' : 'members'} with complete profiles in ${placeName} right now, every photo screened before it is shown. Join free.`
    : `Be among the first singles in ${placeName} on ${SITE_NAME}, a dating site where every photo is screened before it is shown. Join free.`;

  const body = `
<p class="note"><a href="${SITE}/">${SITE_NAME}</a>${rName ? ` · <a href="${SITE}${placePath(country)}">${esc(cName)}</a>` : ''}</p>
<h1>Meet singles in ${esc(short)}</h1>
<p>${members > 0
    ? `These are live counts of members in ${esc(placeName)} whose profiles are complete: a screened photo, who they are, who they are looking for, and the town they live in. Not estimates.`
    : `Nobody in ${esc(placeName)} has a complete profile yet, so this page says so rather than guess. Members join every week; be the first here, or bring a friend.`}</p>
<div class="stats">
  <div class="stat"><b>${members.toLocaleString('en-CA')}</b><span>members with complete profiles</span></div>
  <div class="stat"><b>${women.toLocaleString('en-CA')}</b><span>women</span></div>
  <div class="stat"><b>${men.toLocaleString('en-CA')}</b><span>men</span></div>
  <div class="stat"><b>${joined.toLocaleString('en-CA')}</b><span>joined in the last 30 days</span></div>
</div>
${towns.length ? `<h2 style="font-size:1.2rem;margin:0 0 10px">Where they are</h2><ul class="list">${towns.map((t) => `<li><span>${esc(t.town)}</span><span>${Number(t.members).toLocaleString('en-CA')}</span></li>`).join('')}</ul>` : ''}
${!region && regions.length ? `<h2 style="font-size:1.2rem;margin:22px 0 10px">By ${country === 'CA' ? 'province' : country === 'US' || country === 'NG' ? 'state' : 'region'}</h2><ul class="list">${regions.map((r) => `<li><a href="${SITE}${placePath(country, r.region_code)}">${esc(regionName(country, r.region_code) || r.region_code)}</a><span>${Number(r.members).toLocaleString('en-CA')}</span></li>`).join('')}</ul>` : ''}
${!region && !regions.length && REGIONS[country] ? `<p class="note" style="margin-top:18px">Members will be listed by ${country === 'CA' ? 'province' : 'state'} here as they set one.</p>` : ''}
<div class="cta">
  <h2>${members > 0 ? `See who's in ${esc(short)}` : `Be the first in ${esc(short)}`}</h2>
  <p>Free to join. Every photo is screened before it is shown; profiles can be verified; contact details stay out of profiles.</p>
  <a class="btn" href="${SITE}/#signup">Join free</a><a class="btn alt" href="${SITE}/#care-blog">Read the Care Blog</a>
</div>
`;

  const html = page({
    title,
    description,
    canonical,
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
