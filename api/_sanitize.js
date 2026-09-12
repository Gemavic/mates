// A strict, dependency-free sanitiser for the article HTML that the public
// pages render.
//
// WHY BY HAND. The obvious choice, sanitize-html, is CommonJS and requires
// htmlparser2, which is now ESM-only: on Vercel's Node runtime that throws
// ERR_REQUIRE_ESM and every article page returned 500. Pinning a transitive
// dependency would fix today and break again later, and a server-rendered
// public page is the last place to carry a dependency tree it does not need.
//
// HOW IT IS SAFE. This does not strip dangerous things out of the input
// (a blocklist, which is how sanitisers get bypassed). It reads the input
// and writes a new document from nothing, emitting only:
//   - tags on ALLOWED, closed in the order they were opened;
//   - attributes on that tag's own list, whose values pass a validator;
//   - text, escaped.
// Anything it does not recognise is dropped or escaped, so what it cannot
// understand it cannot pass on. URL values are entity-decoded before they
// are checked, because a browser decodes them too - that is the bypass a
// naive "does it start with javascript:" test misses.
//
// This is the second pass, not the only one: the editor sanitises with
// DOMPurify before anything is saved. This one guards the case the first
// cannot - a row written before that existed, or by any other route.

const ALLOWED = {
  p: [], br: [], strong: [], b: [], em: [], i: [], u: [], s: [],
  h2: [], h3: [], ul: [], ol: [], li: [], blockquote: [], hr: [],
  figure: ['class'], figcaption: [],
  div: ['class'],
  table: [], thead: [], tbody: [], tr: [],
  th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'],
  a: ['href'], img: ['src', 'alt'], iframe: ['src'],
};

// Emitted without a closing tag.
const VOID = new Set(['br', 'hr', 'img']);

// Elements whose *contents* are not text to be shown. Dropped whole.
const SKIP_CONTENT = new Set(['script', 'style', 'noscript', 'template', 'textarea', 'title', 'xmp', 'svg', 'math']);

// The only classes the editor writes, and the only ones any CSS here uses.
const CLASSES = new Set(['video', 'table-wrap']);

// The single embed the Care Blog allows, matched whole.
const YOUTUBE = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{6,20}$/;

const NAMED = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  colon: ':', tab: '\t', newline: '\n', sol: '/', lpar: '(', rpar: ')',
};

/** Decode the entities a browser would decode before it reads a URL. */
function decodeEntities(s) {
  return String(s).replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);?/g, (whole, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
      try { return String.fromCodePoint(code); } catch { return ''; }
    }
    const hit = NAMED[body.toLowerCase()];
    return hit === undefined ? whole : hit;
  });
}

/** What a browser is left with after it ignores control characters. */
function urlForChecking(value) {
  return decodeEntities(value)
    .replace(/[\u0000-\u0020\u007f-\u00a0\u2000-\u200f\u2028-\u202f\ufeff]/g, '')
    .toLowerCase();
}

function safeHref(value) {
  const probe = urlForChecking(value);
  if (probe.startsWith('https://') || probe.startsWith('http://') || probe.startsWith('mailto:')) return true;
  // A bare fragment or in-page anchor, but never a protocol of any kind.
  return probe.startsWith('#') && !probe.includes(':');
}

const safeImg = (value) => urlForChecking(value).startsWith('https://');
const safeFrame = (value) => YOUTUBE.test(decodeEntities(value).trim());

/** Escape text, leaving entities that are already well formed alone. */
function escapeText(s) {
  return String(s)
    .replace(/&(?![a-zA-Z][a-zA-Z0-9]{0,31};|#\d{1,7};|#[xX][0-9a-fA-F]{1,6};)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const escapeAttr = (s) => decodeEntities(String(s))
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Where the tag really ends: a ">" inside quotes is part of a value. */
function endOfTag(input, from) {
  let quote = null;
  for (let k = from; k < input.length; k++) {
    const ch = input[k];
    if (quote) { if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '>') return k;
  }
  return -1;
}

/** Read the attributes out of the inside of a tag. */
function readAttributes(source) {
  const found = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;
  let m;
  while ((m = re.exec(source))) {
    const name = m[1].toLowerCase();
    const value = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : '';
    if (!(name in found)) found[name] = value;
  }
  return found;
}

function keepAttributes(tag, attrs) {
  const allowed = ALLOWED[tag];
  const out = [];
  for (const name of allowed) {
    if (!(name in attrs)) continue;
    const raw = attrs[name];
    if (name === 'href') {
      if (!safeHref(raw)) continue;
      out.push(`href="${escapeAttr(raw)}"`, 'target="_blank"', 'rel="noopener noreferrer nofollow"');
    } else if (name === 'src' && tag === 'img') {
      if (!safeImg(raw)) continue;
      out.push(`src="${escapeAttr(raw)}"`, 'loading="lazy"');
    } else if (name === 'src' && tag === 'iframe') {
      if (!safeFrame(raw)) continue;
      out.push(`src="${escapeAttr(raw)}"`, 'loading="lazy"', 'allowfullscreen', 'title="Video"');
    } else if (name === 'class') {
      const keep = String(raw).split(/\s+/).filter((c) => CLASSES.has(c));
      if (keep.length) out.push(`class="${escapeAttr(keep.join(' '))}"`);
    } else if (name === 'colspan' || name === 'rowspan') {
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n > 1 && n <= 20) out.push(`${name}="${n}"`);
    } else if (name === 'alt') {
      out.push(`alt="${escapeAttr(raw)}"`);
    }
  }
  // An iframe that is not the one embed we allow is not an iframe at all.
  if (tag === 'iframe' && !out.some((a) => a.startsWith('src='))) return null;
  if (tag === 'img' && !out.some((a) => a.startsWith('src='))) return null;
  return out;
}

/**
 * Rebuild `html` from the allow-list above. Returns a string that contains
 * no tag, attribute or URL scheme that is not named in this file.
 */
export function sanitizeArticleHtml(html) {
  const input = String(html ?? '');
  const out = [];
  const open = [];
  let i = 0;

  while (i < input.length) {
    const lt = input.indexOf('<', i);
    if (lt === -1) {
      out.push(escapeText(input.slice(i)));
      break;
    }
    if (lt > i) out.push(escapeText(input.slice(i, lt)));

    // Comments, doctypes and processing instructions: dropped entirely.
    if (input.startsWith('<!--', lt)) {
      const end = input.indexOf('-->', lt + 4);
      i = end === -1 ? input.length : end + 3;
      continue;
    }
    if (input.startsWith('<!', lt) || input.startsWith('<?', lt)) {
      const end = input.indexOf('>', lt + 2);
      i = end === -1 ? input.length : end + 1;
      continue;
    }

    const closing = input[lt + 1] === '/';
    const nameStart = lt + (closing ? 2 : 1);
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9]*/.exec(input.slice(nameStart, nameStart + 32));
    if (!nameMatch) {
      // A "<" that begins no tag is a literal less-than sign.
      out.push('&lt;');
      i = lt + 1;
      continue;
    }
    const tag = nameMatch[0].toLowerCase();
    const gt = endOfTag(input, nameStart + tag.length);
    if (gt === -1) break; // Unterminated tag: nothing after it can be trusted.
    const inside = input.slice(nameStart + tag.length, gt);
    i = gt + 1;

    if (closing) {
      const at = open.lastIndexOf(tag);
      if (at !== -1) {
        for (let k = open.length - 1; k >= at; k--) out.push(`</${open[k]}>`);
        open.length = at;
      }
      continue;
    }

    // Elements whose content is not prose: skip past the whole thing.
    if (SKIP_CONTENT.has(tag)) {
      const close = input.toLowerCase().indexOf(`</${tag}`, i);
      i = close === -1 ? input.length : close;
      continue;
    }

    if (!(tag in ALLOWED)) continue; // Unknown tag: drop the tag, keep the words.

    const selfClosed = /\/\s*$/.test(inside);
    const attrs = keepAttributes(tag, readAttributes(inside));
    if (attrs === null) {
      // A picture with no usable address, or an embed we do not allow: the
      // element is dropped, and so is whatever it wrapped.
      if (!VOID.has(tag) && !selfClosed) {
        const close = input.toLowerCase().indexOf(`</${tag}`, i);
        i = close === -1 ? input.length : close;
      }
      continue;
    }

    out.push(`<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`);
    if (VOID.has(tag)) continue;
    if (tag === 'iframe') {
      // A player has no contents worth keeping; skip to its closing tag.
      out.push('</iframe>');
      const close = input.toLowerCase().indexOf('</iframe', i);
      if (close !== -1) i = close;
      continue;
    }
    if (selfClosed) { out.push(`</${tag}>`); continue; }
    open.push(tag);
    if (open.length > 60) return out.join('') + open.reverse().map((t) => `</${t}>`).join('');
  }

  for (let k = open.length - 1; k >= 0; k--) out.push(`</${open[k]}>`);
  return out.join('');
}

/** Plain-text articles, which predate the rich editor, as paragraphs. */
export function textToHtml(text) {
  return String(text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeText(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
