/**
 * Dates for people, never "Invalid Date".
 *
 * `new Date(x).toLocaleString()` prints the literal words "Invalid Date"
 * when x is undefined, null, or not a date - which is what the staff
 * header showed for weeks, because the object it read never carried a
 * login time. Every screen that shows a time now goes through here, and
 * anything unparseable becomes the fallback the caller chose.
 */

export function parseWhen(value: unknown): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "10 Sept 2026, 9:14 a.m." in the viewer's locale, or the fallback. */
export function formatWhen(value: unknown, fallback = '—'): string {
  const d = parseWhen(value);
  if (!d) return fallback;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "10 Sept 2026", or the fallback. */
export function formatDay(value: unknown, fallback = '—'): string {
  const d = parseWhen(value);
  if (!d) return fallback;
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** "just now", "12 minutes ago", "3 hours ago", "yesterday", "5 days ago". */
export function timeAgo(value: unknown, fallback = ''): string {
  const d = parseWhen(value);
  if (!d) return fallback;
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.round(h / 24);
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDay(d);
}
