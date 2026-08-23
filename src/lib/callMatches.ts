import { supabaseClient } from './supabase';

export interface CallableMatch {
  id: string;
  name: string;
  image: string;
  status: 'online' | 'offline';
  hasRealPhoto: boolean;
}

const PLACEHOLDER_NAMES = new Set(['user', 'new user', 'unknown']);

/**
 * Seeded profiles arrive with blank or placeholder names. Treat those as
 * unnamed so they sort below real people rather than filling the list.
 */
function displayName(profile: { first_name?: string | null; full_name?: string | null }): {
  name: string;
  isReal: boolean;
} {
  const candidate = (profile.first_name ?? '').trim() || (profile.full_name ?? '').trim();
  if (!candidate) return { name: 'Member', isReal: false };
  if (PLACEHOLDER_NAMES.has(candidate.toLowerCase())) return { name: candidate, isReal: false };
  return { name: candidate, isReal: true };
}

/**
 * Neutral initials avatar for members with no photo. Replaces a hardcoded stock
 * photo of one particular man that was previously shown for *everybody* without
 * a picture - wrong for most of them, and misleading on a dating app.
 */
export function initialsAvatar(name: string): string {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?';

  // Deterministic hue per name so a given member keeps the same colour.
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
<rect width="200" height="200" fill="hsl(${hash} 55% 42%)"/>
<text x="100" y="100" dy="0.35em" text-anchor="middle" fill="#ffffff"
 font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="86" font-weight="600">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * People this user can call, best first.
 *
 * The previous version selected `.limit(5)` with no ORDER BY, so Postgres
 * returned an arbitrary five profiles - in practice the blank seeded accounts,
 * while real members with photos never appeared. It also issued one photo query
 * per profile (N+1). This orders deliberately and fetches photos in one round
 * trip.
 */
export async function loadCallableMatches(
  currentUserId: string,
  limit = 5
): Promise<CallableMatch[]> {
  const { data: profiles, error } = await supabaseClient
    .from('user_profiles')
    .select('user_id, first_name, full_name, is_online')
    .neq('user_id', currentUserId)
    .eq('profile_visibility', 'public')
    .order('is_online', { ascending: false })
    .limit(60);

  if (error || !profiles?.length) {
    if (error) console.error('Failed to load callable matches:', error);
    return [];
  }

  const { data: photos } = await supabaseClient
    .from('user_photos')
    .select('user_id, photo_url')
    .in(
      'user_id',
      profiles.map((p: any) => p.user_id)
    )
    .eq('is_primary', true);

  const photoFor = new Map<string, string>();
  for (const row of photos ?? []) {
    if (row.photo_url) photoFor.set(row.user_id, row.photo_url);
  }

  return profiles
    .map((profile: any) => {
      const { name, isReal } = displayName(profile);
      const photo = photoFor.get(profile.user_id);
      return {
        id: profile.user_id,
        name,
        image: photo ?? initialsAvatar(name),
        status: profile.is_online ? ('online' as const) : ('offline' as const),
        hasRealPhoto: !!photo,
        _rank:
          (profile.is_online ? 4 : 0) + (photo ? 2 : 0) + (isReal ? 1 : 0),
      };
    })
    .sort((a: any, b: any) => b._rank - a._rank)
    .slice(0, limit)
    .map(({ _rank, ...match }: any) => match as CallableMatch);
}
