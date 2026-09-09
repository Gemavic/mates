import { supabaseClient } from './supabase';

/**
 * The three answers Discovery needs to filter: who you are, who you are
 * looking for, and which country you are in. Asked at sign-up, editable in
 * Edit Profile, and asked once of members who joined before the questions
 * existed.
 */
export type Gender = 'man' | 'woman';
export type Seeking = 'men' | 'women' | 'everyone';

export interface ProfileBasics {
  gender: Gender | null;
  seeking: Seeking | null;
  country_code: string | null;
}

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'man', label: 'I am a man' },
  { value: 'woman', label: 'I am a woman' },
];

export const SEEKING_OPTIONS: { value: Seeking; label: string }[] = [
  { value: 'women', label: 'looking for women' },
  { value: 'men', label: 'looking for men' },
  { value: 'everyone', label: 'open to everyone' },
];

/** "I am a man looking for women" - the sentence the filter sheet shows. */
export function seekingSentence(gender: Gender | null, seeking: Seeking | null): string {
  const who = gender === 'man' ? 'I am a man' : gender === 'woman' ? 'I am a woman' : 'I am';
  const whom = seeking === 'women' ? 'looking for women' : seeking === 'men' ? 'looking for men' : 'open to everyone';
  return `${who} ${whom}`;
}

export function basicsComplete(b: Partial<ProfileBasics> | null | undefined): boolean {
  return !!(b && b.gender && b.seeking && b.country_code);
}

export async function fetchMyBasics(userId: string): Promise<ProfileBasics | null> {
  const { data, error } = await supabaseClient
    .from('user_profiles')
    .select('gender, seeking, country_code')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileBasics;
}

export async function saveMyBasics(userId: string, b: ProfileBasics): Promise<void> {
  const { error } = await supabaseClient
    .from('user_profiles')
    .update({ gender: b.gender, seeking: b.seeking, country_code: b.country_code, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) throw error;
}

/** Gender value(s) a "seeking" answer maps to; null means no gender filter. */
export function genderFilterFor(seeking: Seeking | null | undefined): Gender | null {
  if (seeking === 'women') return 'woman';
  if (seeking === 'men') return 'man';
  return null;
}
