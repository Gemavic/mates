import { supabaseClient } from './supabase';
import type { Seeking } from './profileBasics';

/**
 * The member's saved search: who they want to see, from where, and how old.
 * Stored in user_preferences (one row per member) so it follows them between
 * devices; the filter sheet in Discovery reads and writes it.
 */
export interface DiscoveryFilters {
  seeking: Seeking | null;       // men | women | everyone (null = follow profile)
  country_code: string | null;   // ISO alpha-2, null = anywhere
  age_min: number;
  age_max: number;
}

export const AGE_FLOOR = 18;
export const AGE_CEILING = 99;

<<<<<<< ours
export const DEFAULT_FILTERS: DiscoveryFilters = { seeking: null, country_code: null, age_min: 20, age_max: 45 };
=======
// Defaults show everyone: any country, any adult age, and whoever the
// member's own profile says they are looking for. People come here for
// distance relationships and friendship too, so nobody is hidden until a
// member narrows the search themselves.
export const DEFAULT_FILTERS: DiscoveryFilters = { seeking: null, country_code: null, age_min: AGE_FLOOR, age_max: AGE_CEILING };
>>>>>>> theirs

export function clampAges(min: number, max: number): [number, number] {
  const a = Math.min(Math.max(AGE_FLOOR, Math.round(min || AGE_FLOOR)), AGE_CEILING);
  const b = Math.min(Math.max(AGE_FLOOR, Math.round(max || AGE_CEILING)), AGE_CEILING);
  return a <= b ? [a, b] : [b, a];
}

export function filtersAreDefault(f: DiscoveryFilters): boolean {
  return !f.country_code && f.age_min === DEFAULT_FILTERS.age_min && f.age_max === DEFAULT_FILTERS.age_max && !f.seeking;
}

export async function fetchDiscoveryFilters(userId: string): Promise<DiscoveryFilters> {
  const { data } = await supabaseClient
    .from('user_preferences')
    .select('preferred_gender, min_age, max_age, country_code')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return { ...DEFAULT_FILTERS };
  const [age_min, age_max] = clampAges(data.min_age ?? DEFAULT_FILTERS.age_min, data.max_age ?? DEFAULT_FILTERS.age_max);
  return {
    seeking: (data.preferred_gender as Seeking | null) ?? null,
    country_code: data.country_code ?? null,
    age_min,
    age_max,
  };
}

export async function saveDiscoveryFilters(userId: string, f: DiscoveryFilters): Promise<void> {
  const [age_min, age_max] = clampAges(f.age_min, f.age_max);
  const { error } = await supabaseClient
    .from('user_preferences')
    .upsert(
      { user_id: userId, preferred_gender: f.seeking, min_age: age_min, max_age: age_max, country_code: f.country_code, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}
