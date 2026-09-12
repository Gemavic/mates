// /a/<slug> — a Care Blog article as a real page.
//
// This used to print the article's card as Open Graph tags and then hand
// the reader to the app with a script, so link previews worked but the
// article text was never on a page a search engine could read. It is now
// the article itself: title, cover, author, date, the body, and a link into
// the app. Previews keep working because the same tags are still here.
//
// The body is sanitised again on the way out with the same allow-list the
// editor uses (headings, lists, links, tables, pictures, one kind of
// YouTube embed), so nothing reaches a reader that the editor would not
// have shown an admin.
//
// Reads through article_public(), which returns published pieces only.

import sanitizeHtml from 'sanitize-html';
import { SITE, SITE_NAME, esc, rpc, page, CATEGORY_LABELS, formatDate } from './_page.js';

const SLUG = /^[a-z0-9-]{1,90}$/;
const YT = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{6,20}$/;

function clean(html) {
  return sanitizeHtml(html || '', {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'figure', 'figcaption', 'iframe', 'hr', 'div'],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'loading'],
      iframe: ['src', 'title', 'allowfullscreen', 'loading'],
      div: ['class'], figure: ['class'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
    },
    allowedClasses: { div: ['table-wrap'], figure: ['video'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https'], iframe: ['https'] },
    allowedIframeHostnames: ['www.youtube-nocookie.com'],
    transformTags: {
      a: (tag, attribs) => ({ tagName: 'a', attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' } }),
      img: (tag, attribs) => ({ tagName: 'img', attribs: { ...attribs, loading: 'lazy' } }),
    },
    exclusiveFilter: (frame) => frame.tag === 'iframe' && !YT.test(frame.attribs.src || ''),
  });
}

function textToHtml(text) {
  return String(text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
}

export default async function handler(req, res) {
  const slug = typeof req.query?.slug === 'string' ? req.query.slug.trim() : '';
  const home = `${SITE}/#care-blog`;
  if (!SLUG.test(slug)) {
    res.setHeader('Location', home);
    return res.status(302).end();
  }

  const a = await rpc('article_public', { p_slug: slug });
  if (!a || !a.title) {
    res.setHeader('Location', home);
    return res.status(302).end();
  }

  const canonical = `${SITE}/a/${slug}`;
  const appLink = `${SITE}/#care-blog?a=${encodeURIComponent(slug)}`;
  const description = a.excerpt || String(a.content || '').slice(0, 200);
  const bodyHtml = a.content_html ? clean(a.content_html) : textToHtml(a.content);
  const category = CATEGORY_LABELS[a.category] || null;
  const image = typeof a.cover_image === 'string' && a.cover_image.startsWith('https://') ? a.cover_image : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description,
    image: image ? [image] : undefined,
    datePublished: a.published_at || undefined,
    dateModified: a.updated_at || a.published_at || undefined,
    author: { '@type': 'Organization', name: a.author_name || SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: `${SITE}/brand/logo-1024.png` } },
    mainEntityOfPage: canonical,
    articleSection: category || 'Care Blog',
  };

  const more = Array.isArray(a.more) ? a.more : [];

  const body = `
<p class="note"><a href="${SITE}/#care-blog">Care Blog</a>${category ? ` · ${esc(category)}` : ''}</p>
<h1>${esc(a.title)}</h1>
<div class="meta">
  ${a.author_name ? `<span>By ${esc(a.author_name)}</span>` : ''}
  ${a.published_at ? `<span>${esc(formatDate(a.published_at))}</span>` : ''}
  <span>${esc(String(a.read_minutes || 1))} min read</span>
</div>
${image ? `<figure class="cover"><img src="${esc(image)}" alt="${esc(a.title)}">${a.cover_credit ? `<figcaption>${a.cover_credit_url ? `<a href="${esc(a.cover_credit_url)}" rel="noopener noreferrer" target="_blank">${esc(a.cover_credit)}</a>` : esc(a.cover_credit)}</figcaption>` : ''}</figure>` : ''}
<div class="article">${bodyHtml}</div>
<div class="cta">
  <h2>Meet people who read this too</h2>
  <p>Dates.care is a dating site where every photo is screened before it is shown. Joining is free.</p>
  <a class="btn" href="${SITE}/#signup">Join free</a><a class="btn alt" href="${esc(appLink)}">Open in the app</a>
</div>
${more.length ? `<section class="more"><h2>More to read</h2><ul>${more.map((m) => `<li><a href="${SITE}/a/${esc(m.slug)}">${m.cover_image && String(m.cover_image).startsWith('https://') ? `<img src="${esc(m.cover_image)}" alt="" loading="lazy">` : ''}<span>${esc(m.title)}</span></a></li>`).join('')}</ul></section>` : ''}
`;

  const html = page({
    title: `${a.seo_title || a.title} - ${SITE_NAME} Care Blog`,
    description,
    canonical,
    image,
    ogType: 'article',
    jsonLd,
    body,
    extraHead: `${a.seo_keywords ? `<meta name="keywords" content="${esc(a.seo_keywords)}">` : ''}${a.published_at ? `<meta property="article:published_time" content="${esc(a.published_at)}">` : ''}`,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}
