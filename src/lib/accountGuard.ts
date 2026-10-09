import { supabaseClient } from '@/lib/supabase';

/**
 * One person, one account.
 *
 * A member once ended up with three accounts on three different email
 * addresses, because nothing told him he already had one. The server now
 * decides "this person already has an account" in one place
 * (existing_account_for: the same email, or the same full name and birth
 * date) and these helpers turn its answer into words and next steps: sign in,
 * or reset the password - never a second account.
 */

export type SignInMethod = 'google' | 'password' | 'google_or_password';

export interface ExistingAccount {
  /** 'email': that exact address is registered. 'duplicate': same name and birth date. */
  kind: 'email' | 'duplicate';
  /** Masked address of the existing account, e.g. re•••@gmail.com. */
  hint?: string | null;
  method?: SignInMethod | null;
  /** The address typed on this form, when kind is 'email'. */
  email?: string | null;
}

export type RegistrationCheck =
  | { status: 'ok' }
  | { status: 'under_18' }
  | { status: 'implausible_birth_date' }
  | { status: 'birth_date_required' }
  | { status: 'email_exists'; method?: SignInMethod | null }
  | { status: 'possible_duplicate'; hint?: string | null; method?: SignInMethod | null };

/**
 * Asked before an account is created. If the check itself cannot be made
 * (offline, or the server function is not there yet) it answers 'ok' and
 * Supabase's own same-email rule still applies.
 */
export async function checkRegistration(email: string, fullName: string, dateOfBirth: string): Promise<RegistrationCheck> {
  try {
    const { data, error } = await supabaseClient.rpc('registration_check', {
      p_email: email.trim(),
      p_full_name: fullName.trim(),
      p_dob: dateOfBirth,
    });
    if (error || !data || typeof (data as any).status !== 'string') return { status: 'ok' };
    return data as RegistrationCheck;
  } catch {
    return { status: 'ok' };
  }
}

export function methodInWords(method?: SignInMethod | null): string {
  switch (method) {
    case 'google': return 'with Google';
    case 'google_or_password': return 'with Google or a password';
    case 'password': return 'with an email and password';
    default: return '';
  }
}

export function describeExisting(acc: ExistingAccount): string {
  const how = methodInWords(acc.method);
  if (acc.kind === 'email') {
    return `${acc.email ? acc.email : 'This email address'} already has a Dates.care account${how ? `, which signs in ${how}` : ''}. Sign in to it, or reset the password if you have lost it.`;
  }
  return `You already have a Dates.care account${acc.hint ? ` (${acc.hint})` : ''}${how ? ` that signs in ${how}` : ''}. Please use that one - each person has one account. If you have lost the password, reset it.`;
}

/** Turns a set_my_birth_date() refusal into a sentence. */
export function birthDateRefusal(data: any): { text: string; existing: ExistingAccount | null } {
  if (data?.error === 'duplicate_account') {
    const existing: ExistingAccount = { kind: 'duplicate', hint: data.hint ?? null, method: data.method ?? null };
    return { text: describeExisting(existing), existing };
  }
  if (data?.error === 'under_18') return { text: 'Dates.care is strictly for adults aged 18 and over.', existing: null };
  if (data?.error === 'implausible') return { text: 'Please enter your real date of birth.', existing: null };
  if (data?.error === 'already_set') return { text: 'Your date of birth is already on file. Contact admin@dates.care if it is wrong.', existing: null };
  return { text: data?.message || 'Please enter a valid date of birth.', existing: null };
}

// ------------------------------------------------ sign-in hand-over

const PREFILL_KEY = 'dc:signin-prefill';

/** Lets the sign-up screen open the sign-in screen with the email filled in, or the reset form open. */
export function setSignInPrefill(p: { email?: string | null; forgot?: boolean }): void {
  try { sessionStorage.setItem(PREFILL_KEY, JSON.stringify(p)); } catch { /* private mode */ }
}

export function takeSignInPrefill(): { email?: string | null; forgot?: boolean } | null {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREFILL_KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ------------------------------------------------ this device

const DEVICE_KEY = 'dc:last-account';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '';
  return `${local.slice(0, 2)}•••@${domain}`;
}

/** Remembered after a real sign-in, masked, so the sign-up form can say "you have been here before". */
export function rememberAccountOnDevice(email: string | null | undefined, provider: string | null | undefined): void {
  if (!email) return;
  try {
    localStorage.setItem(DEVICE_KEY, JSON.stringify({
      hint: maskEmail(email),
      method: provider === 'google' ? 'google' : 'password',
    }));
  } catch { /* storage blocked */ }
}

export function lastAccountOnDevice(): { hint: string; method: SignInMethod } | null {
  try {
    const raw = localStorage.getItem(DEVICE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return v && typeof v.hint === 'string' && v.hint ? v : null;
  } catch {
    return null;
  }
}
