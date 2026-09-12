import { supabaseClient } from '@/lib/supabase';

/**
 * Whether a member's profile is complete enough to be shown to anyone -
 * and to be shown anyone. The server decides (my_profile_completion); the
 * app only asks. Anything else that changes the profile fires
 * `dc:profile-updated` so the answer is refreshed.
 */
export interface ProfileCompletion {
  photo: boolean;
  gender: boolean;
  seeking: boolean;
  country: boolean;
  city: boolean;
  complete: boolean;
}

export const PROFILE_UPDATED_EVENT = 'dc:profile-updated';

export function announceProfileUpdated(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT));
}

export async function fetchMyCompletion(): Promise<ProfileCompletion | null> {
  const { data, error } = await supabaseClient.rpc('my_profile_completion');
  if (error) {
    console.warn('Could not read profile completion:', error.message);
    return null;
  }
  if (!data) return null;
  const d = data as Partial<ProfileCompletion>;
  return {
    photo: !!d.photo, gender: !!d.gender, seeking: !!d.seeking,
    country: !!d.country, city: !!d.city, complete: !!d.complete,
  };
}

export interface NearMember {
  user_id: string;
  first_name: string | null;
  age: number | null;
  location: string | null;
  region_code: string | null;
  country_code: string | null;
  is_online: boolean | null;
  last_active: string | null;
  is_verified: boolean | null;
  in_region: boolean;
  photo_url: string | null;
}

export interface NearMe {
  scope: 'region' | 'country';
  region_code: string | null;
  country_code: string | null;
  region_count: number;
  country_count: number;
  members: NearMember[];
}

export async function fetchNearMe(limit = 12): Promise<NearMe | null> {
  const { data, error } = await supabaseClient.rpc('members_near_me', { p_limit: limit });
  if (error) {
    console.warn('Could not load people near you:', error.message);
    return null;
  }
  const d = (data ?? {}) as Partial<NearMe>;
  return {
    scope: d.scope === 'region' ? 'region' : 'country',
    region_code: d.region_code ?? null,
    country_code: d.country_code ?? null,
    region_count: Number(d.region_count ?? 0),
    country_count: Number(d.country_count ?? 0),
    members: Array.isArray(d.members) ? (d.members as NearMember[]) : [],
  };
}
