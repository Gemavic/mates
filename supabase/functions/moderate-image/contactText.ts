// Finds contact details written *inside* a picture - a phone number on a
// notepad, an email on a whiteboard - and says where each offending word sits
// so the caller can cover it.
//
// The patterns mirror src/lib/maskContacts.ts, with three concessions to OCR:
// digits often come back space-separated, "@" is frequently read as "at", and
// people write "dot" out loud when they are trying to dodge a filter.

export interface Box { x: number; y: number; w: number; h: number }
interface Word { text: string; box: Box }

const PATTERNS: RegExp[] = [
  // email, including at/dot spelled out or bracketed
  /\b[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\bat\b)\s*[A-Za-z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\bdot\b)\s*[A-Za-z]{2,}\b/gi,
  // links
  /\b(?:https?:\/\/|www\.)[^\s]+/gi,
  /\b(?:wa\.me|t\.me|telegram\.me|snapchat\.com|instagram\.com|facebook\.com|messenger\.com)\/[^\s]*/gi,
  // messaging apps named beside a handle or number
  /\b(?:whats\s?app|telegram|signal|snap(?:chat)?|insta(?:gram)?|viber|skype|imo)\b[^\n]{0,20}?[A-Za-z0-9._+]{4,}/gi,
  // @handle
  /(^|[^A-Za-z0-9._@])@[A-Za-z0-9._]{4,}/g,
  // phone numbers, tolerating the spacing OCR introduces
  /(^|[^A-Za-z0-9])(\+?\d[\d\s().-]{5,}\d)(?![A-Za-z0-9])/g,
];

function digitCount(s: string): number {
  return (s.match(/\d/g) || []).length;
}

/**
 * A single word that gives away contact details whatever surrounds it.
 *
 * The regexes above expect the text to survive OCR in one piece. It does not:
 * "histogm@gmail.com" came back joined and was covered, while
 * "Matto Canada1 @gmail.Com" arrived as three words with the @ floating, matched
 * nothing, and was delivered in full. Inside a photograph the cost of covering
 * one word too many is a black rectangle nobody minds, so the bar is low here.
 */
const TELLTALE =
  /(?:@|gmail|googlemail|yahoo|ymail|hotmail|outlook|icloud|proton|aol|zoho|\.com|\.net|\.org|\.co\b|whats\s?app|telegram|snapchat|snap|instagram|insta|viber|skype|wechat|signal)/i;

/** True when two words sit on roughly the same line of writing. */
function sameLine(a: Word, b: Word): boolean {
  const centre = (w: Word) => w.box.y + w.box.h / 2;
  return Math.abs(centre(a) - centre(b)) < Math.max(a.box.h, b.box.h) * 0.8;
}

/** Flattens Vision's page/block/paragraph/word tree into words with boxes. */
export function collectWords(fullText: any): Word[] {
  const out: Word[] = [];
  for (const page of fullText?.pages ?? []) {
    for (const block of page.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const word of para.words ?? []) {
          const text = (word.symbols ?? []).map((s: any) => s.text ?? '').join('');
          const vertices = word.boundingBox?.vertices ?? word.boundingBox?.normalizedVertices ?? [];
          if (!text.trim() || vertices.length === 0) continue;
          const xs = vertices.map((v: any) => v.x ?? 0);
          const ys = vertices.map((v: any) => v.y ?? 0);
          const x = Math.min(...xs);
          const y = Math.min(...ys);
          out.push({ text, box: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } });
        }
      }
    }
  }
  return out;
}

export function findContactText(fullText: any): {
  found: boolean; matches: string[]; boxes: Box[];
} {
  const words = collectWords(fullText);
  if (words.length === 0) return { found: false, matches: [], boxes: [] };

  // One string with an index back to the word each character came from, so a
  // match anywhere in the text can be turned into the exact words to cover.
  let joined = '';
  const spans: Array<{ start: number; end: number }> = [];
  for (const word of words) {
    const start = joined.length;
    joined += word.text;
    spans.push({ start, end: joined.length });
    joined += ' ';
  }

  const hit = new Set<number>();
  const matches: string[] = [];

  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(joined)) !== null) {
      if (m[0].length === 0) { pattern.lastIndex++; continue; }

      // A bare run of digits is only a phone number if there are enough of
      // them. Otherwise years, prices and house numbers get covered up.
      const isPhonePattern = pattern.source.startsWith('(^|[^A-Za-z0-9])(\\+?');
      if (isPhonePattern && digitCount(m[0]) < 7) continue;

      const start = m.index;
      const end = m.index + m[0].length;
      matches.push(m[0].trim());
      spans.forEach((span, i) => {
        if (span.start < end && span.end > start) hit.add(i);
      });
    }
  }

  // Then the word-by-word sweep, for everything OCR broke apart.
  words.forEach((word, i) => {
    const telltale = TELLTALE.test(word.text);
    // Five, not four: a year is four digits and blacking out "2026" on every
    // photo that happens to show a date would be its own kind of broken.
    const numeric = digitCount(word.text) >= 5;
    if (!telltale && !numeric) return;

    hit.add(i);
    matches.push(word.text.trim());

    // An address is written across several words once OCR has split it, and
    // the half that names the person sits beside the half that names the
    // provider. Take the neighbours on the same line as well.
    if (telltale) {
      if (i > 0 && sameLine(words[i - 1], word)) hit.add(i - 1);
      if (i + 1 < words.length && sameLine(words[i + 1], word)) hit.add(i + 1);
    }
  });

  // Pad each box a little - OCR boxes hug the glyphs, and a covering rectangle
  // that hugs them just as tightly leaves readable edges.
  const boxes = [...hit].map((i) => {
    const b = words[i].box;
    const padX = Math.max(3, Math.round(b.w * 0.06));
    const padY = Math.max(3, Math.round(b.h * 0.18));
    return {
      x: Math.max(0, b.x - padX),
      y: Math.max(0, b.y - padY),
      w: b.w + padX * 2,
      h: b.h + padY * 2,
    };
  });

  return { found: boxes.length > 0, matches: [...new Set(matches)].slice(0, 10), boxes };
}
