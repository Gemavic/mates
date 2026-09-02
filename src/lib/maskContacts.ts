/**
 * Hides contact details in member-to-member text.
 *
 * Every romance-scam playbook has the same first move: get the target off the
 * platform, where there is no moderation, no reporting and no record. A member
 * had posted "Hello here is my contact number: 6138615799 please send me yours
 * for further discussion outside here" and it rendered in full.
 *
 * So phone numbers, email addresses, links and social handles are masked on
 * the way to the screen. This is display-side only - the original text is still
 * stored, because moderators need to see what was actually sent when a report
 * comes in, and because a rule that silently rewrote people's messages would be
 * worse than one that hides them.
 *
 * Deliberately conservative: it would rather leave something visible than mask
 * an ordinary sentence. "I turn 30 in 2026" and "$18.99" stay as they are.
 */

import { containsSpelledNumber, maskSpelledNumbers } from './spelledNumbers';

const MASK_CHAR = '*';

/** Six or more asterisks, so a long number does not leak its own length. */
function mask(match: string): string {
  const visible = match.replace(/\s/g, '').length;
  return MASK_CHAR.repeat(Math.min(Math.max(visible, 6), 12));
}

const PATTERNS: RegExp[] = [
  // Email addresses.
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,

  // Links, with or without a scheme.
  /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi,

  // Bare domains for the handful of places people jump to.
  /\b(?:wa\.me|t\.me|telegram\.me|snapchat\.com|instagram\.com|facebook\.com|messenger\.com)\/[^\s<>"']*/gi,

  // Social handles: @ followed by at least four handle characters.
  /(^|[^A-Za-z0-9._@])@[A-Za-z0-9._]{4,}/g,

  // Phone numbers. Seven or more digits, allowing the usual separators, and
  // not sitting inside a longer word. Ten digits is a North American number;
  // seven is a local one.
  /(^|[^A-Za-z0-9])(\+?\d[\d\s().-]{5,}\d)(?![A-Za-z0-9])/g,
];

/** True when the text appears to contain a phone number, email, link or handle. */
export function containsContactInfo(text: string): boolean {
  if (!text) return false;
  if (containsSpelledNumber(text)) return true;
  return PATTERNS.some((p) => {
    p.lastIndex = 0;
    return p.test(text);
  });
}

/**
 * Returns the text with any contact details replaced by asterisks.
 *
 * Safe to call on every render - it is a handful of regex passes over a short
 * string, and it returns the input unchanged when there is nothing to hide.
 */
export function maskContactInfo(text: string): string {
  if (!text) return text;

  let out = text;

  // Email, links and bare domains: replace the whole match.
  for (const pattern of PATTERNS.slice(0, 3)) {
    out = out.replace(pattern, (m) => mask(m));
  }

  // Handles and phone numbers carry a leading boundary character that has to
  // survive, so those are replaced group by group.
  out = out.replace(PATTERNS[3], (_m, lead: string) => `${lead}${MASK_CHAR.repeat(6)}`);
  out = out.replace(PATTERNS[4], (_m, lead: string, number: string) => {
    const digits = number.replace(/\D/g, '').length;
    if (digits < 7) return _m; // years, prices, ages - leave them alone
    return `${lead}${mask(number)}`;
  });

  // Finally, numbers spelled out in words - in any language we hold the digits
  // for. Left until last so it works on whatever the patterns above did not
  // already take.
  out = maskSpelledNumbers(out);

  return out;
}

/** The one-line warning shown to a sender whose message is being masked. */
export const CONTACT_MASK_NOTICE =
  'Phone numbers, emails and links are hidden for everyone’s safety. Keep the conversation on Dates.care — it is the only place we can help if something goes wrong.';
