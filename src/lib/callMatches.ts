import { supabaseClient } from './supabase';
import { isOnlineFrom } from './presence';
// One implementation, in one place. There were two - this file's and the one
// the profile screens used - which is exactly how a fix lands in the copy
// nobody opens.
export { initialsAvatar } from './avatar';
import { initialsAvatar } from './avatar';

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

export async function loadCallableMatches(
  currentUserId: string,
  limit = 5
): Promise<CallableMatch[]> {
  // Order by last_active, not is_online: the flag is not maintained reliably,
  // so presence is derived from recency instead (see ./presence).
  const { data: profiles, error } = await supabaseClient
    .from('user_profiles')
    .select('user_id, first_name, full_name, is_online, last_active')
    .neq('user_id', currentUserId)
    .eq('profile_visibility', 'public')
    .order('last_active', { ascending: false, nullsFirst: false })
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
      const online = isOnlineFrom(profile.last_active);
      return {
        id: profile.user_id,
        name,
        image: photo ?? initialsAvatar(name),
        status: online ? ('online' as const) : ('offline' as const),
        hasRealPhoto: !!photo,
        _rank: (online ? 4 : 0) + (photo ? 2 : 0) + (isReal ? 1 : 0),
      };
    })
    .sort((a: any, b: any) => b._rank - a._rank)
    .slice(0, limit)
    .map(({ _rank, ...match }: any) => match as CallableMatch);
}
