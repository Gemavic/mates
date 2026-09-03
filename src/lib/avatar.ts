/**
 * A person on this site is shown their own photograph or a drawn placeholder -
 * never a stock photograph of somebody else.
 *
 * Every member without a picture used to fall back to the same Pexels image: a
 * real person, photographed for a stock library, who never agreed to appear as
 * a member of a dating site. Anyone browsing saw a face and reasonably assumed
 * it belonged to the account. The same image stood in on eight screens, so the
 * same stranger was several different members at once.
 *
 * This draws an initial instead. It is an inline SVG data URI, so it needs no
 * network request, cannot fail to load, and looks the same every time for the
 * same person.
 */

const PALETTE = [
  ['#f472b6', '#be185d'],
  ['#c084fc', '#6d28d9'],
  ['#60a5fa', '#1d4ed8'],
  ['#34d399', '#047857'],
  ['#fbbf24', '#b45309'],
  ['#fb7185', '#9f1239'],
  ['#a78bfa', '#4c1d95'],
  ['#22d3ee', '#0e7490'],
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initialsFrom(name?: string | null): string {
  const cleaned = (name ?? '').trim();
  if (!cleaned) return '?';
  const words = cleaned.split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + second).toUpperCase().slice(0, 2) || '?';
}

/**
 * A drawn avatar for someone with no photograph of their own.
 *
 * @param name  Shown as one or two initials. Falls back to "?".
 * @param seed  Anything stable about the person - their id is ideal - so the
 *              colour does not change between screens or reloads.
 */
export function initialsAvatar(name?: string | null, seed?: string | null): string {
  const initials = initialsFrom(name);
  const [from, to] = PALETTE[hash(seed || name || 'anonymous') % PALETTE.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="${initials}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="128" height="128" fill="url(#g)"/>
<text x="64" y="64" fill="#ffffff" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="52" font-weight="600" text-anchor="middle" dominant-baseline="central">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** For the handful of places that need a photo-shaped blank with no name to hand. */
export const BLANK_AVATAR = initialsAvatar(null, 'blank');
