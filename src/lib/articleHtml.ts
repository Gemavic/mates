import DOMPurify from 'dompurify';

/**
 * Article HTML: what may appear in a Care Blog piece, and nothing else.
 *
 * The editor is contentEditable, so what it produces is whatever the
 * browser felt like writing. Everything is passed through here before it
 * is saved and again before it is rendered - the same list both times, so
 * what the admin previews is what members see.
 *
 * Allowed: paragraphs, headings (h2/h3), bold/italic/underline/strike,
 * lists, quotes, links (http/https only, opened in a new tab), tables,
 * pictures, and one kind of embed: a YouTube player from
 * youtube-nocookie.com. Anything else - scripts, styles, forms, inline
 * event handlers, other iframes - is dropped.
 */

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li',
  'a', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
  'figure', 'figcaption', 'iframe', 'hr', 'div',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'target', 'rel', 'allowfullscreen', 'loading', 'class', 'colspan', 'rowspan'];

const YT_EMBED = /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{6,20}$/;

let hooked = false;
function ensureHooks() {
  if (hooked) return;
  hooked = true;
  DOMPurify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const src = (node as Element).getAttribute('src') ?? '';
      if (!YT_EMBED.test(src)) node.parentNode?.removeChild(node);
    }
  });
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const el = node as Element;
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') ?? '';
      if (!/^https?:\/\//i.test(href) && !href.startsWith('#') && !href.startsWith('mailto:')) {
        el.removeAttribute('href');
      } else {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }
    if (el.tagName === 'IMG') {
      const src = el.getAttribute('src') ?? '';
      if (!/^https:\/\//i.test(src)) el.removeAttribute('src');
      el.setAttribute('loading', 'lazy');
    }
    if (el.tagName === 'IFRAME') {
      el.setAttribute('loading', 'lazy');
      el.setAttribute('allowfullscreen', '');
    }
    // Only the classes the editor writes; nothing that could hook site CSS.
    if (el.hasAttribute('class')) {
      const keep = (el.getAttribute('class') ?? '').split(/\s+/).filter((c) => ['video', 'table-wrap'].includes(c));
      if (keep.length) el.setAttribute('class', keep.join(' ')); else el.removeAttribute('class');
    }
  });
}

export function sanitizeArticleHtml(html: string): string {
  ensureHooks();
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['style', 'script', 'form', 'input', 'button'],
  }) as string;
}

/** The words alone, for search, reading time and the notification. */
export function htmlToText(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const box = document.createElement('div');
  box.innerHTML = sanitizeArticleHtml(html);
  box.querySelectorAll('figure.video, iframe').forEach((n) => n.remove());
  // Block ends become line breaks so paragraphs do not run together.
  box.querySelectorAll('p, h2, h3, li, tr, blockquote, figcaption').forEach((n) => n.appendChild(document.createTextNode('\n')));
  return (box.textContent ?? '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** The older plain-text pieces, as paragraphs, for the editor and the page. */
export function textToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** The eleven-character id from any of the ways a YouTube link is written. */
export function youtubeId(url: string): string | null {
  const s = (url ?? '').trim();
  const m =
    s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    s.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    s.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function youtubeEmbedHtml(id: string): string {
  return `<figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" loading="lazy" allowfullscreen title="YouTube video"></iframe></figure>`;
}

export function tableHtml(rows: number, cols: number): string {
  const r = Math.min(Math.max(rows, 2), 12);
  const c = Math.min(Math.max(cols, 1), 4);
  const head = '<tr>' + Array.from({ length: c }, (_, i) => `<th>Heading ${i + 1}</th>`).join('') + '</tr>';
  const body = Array.from({ length: r - 1 }, () => '<tr>' + Array.from({ length: c }, () => '<td>&nbsp;</td>').join('') + '</tr>').join('');
  return `<div class="table-wrap"><table><thead>${head}</thead><tbody>${body}</tbody></table></div><p><br></p>`;
}

export function imageHtml(src: string, caption: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const cap = caption.trim();
  return `<figure><img src="${esc(src)}" alt="${esc(cap)}">${cap ? `<figcaption>${esc(cap)}</figcaption>` : ''}</figure><p><br></p>`;
}
