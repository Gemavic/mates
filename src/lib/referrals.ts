import { supabaseClient } from './supabase';

/**
 * Referral programme - the browser side.
 *
 * A member's link is https://dates.care/?ref=CODE. Opening it stores the
 * code on this device; the invitation banner shows the friend's first name;
 * and once the person has actually created an account the code is attached
 * to it on the server, which decides everything else (who is paid, when,
 * and whether). Nothing here moves credits.
 *
 * The site never sends the invitation. The member shares the link from
 * their own phone, to people they know, under their own name.
 */

const STORAGE_KEY = 'dc_ref';
const CODE_RE = /^[A-Z2-9]{8}$/;

export interface ReferralTerms {
  reward_credits: number;
  /** To each side the moment the invited friend completes their profile. */
  completion_credits: number;
  days_required: number;
  active_within_days: number;
  monthly_cap: number;
  attach_window_hours: number;
  expires_after_days: number;
}

export interface ReferralInvite {
  id: string;
  status: 'pending' | 'rewarded' | 'void';
  created_at: string;
  qualifies_at: string;
  rewarded_at: string | null;
  credits: number | null;
  void_reason: string | null;
  completed_at: string | null;
  completion_credits: number | null;
  first_name: string;
  is_verified: boolean;
}

export interface ReferralSummary {
  code: string | null;
  terms: ReferralTerms;
  rewarded_this_month: number;
  total_credits_earned: number;
  invites: ReferralInvite[];
}

export function referralLink(code: string): string {
  return `https://dates.care/?ref=${code}`;
}

/** Read ?ref=CODE from the address bar, remember it, and tidy the URL. */
export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('ref') ?? '').trim().toUpperCase();
    if (!raw) return;
    if (CODE_RE.test(raw)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: raw, at: Date.now() }));
    }
    params.delete('ref');
    const rest = params.toString();
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash,
    );
  } catch {
    // Storage can be unavailable (private mode); the link still opens the site.
  }
}

/** The code this device arrived with, if any and if recent. */
export function pendingReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw) as { code?: string; at?: number };
    if (!code || !CODE_RE.test(code)) return null;
    // A month is generous; the server only pays for accounts made within
    // its own window anyway.
    if (!at || Date.now() - at > 30 * 24 * 60 * 60 * 1000) return null;
    return code;
  } catch {
    return null;
  }
}

export function clearPendingReferral(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

/** First name of the person behind a code, for "X invited you". */
export async function fetchInviterName(code: string): Promise<string | null> {
  const { data, error } = await supabaseClient.rpc('referral_preview', { p_code: code });
  if (error || !data) return null;
  const name = (data as { first_name?: string }).first_name;
  return name && name.trim() ? name.trim() : null;
}

/**
 * Tell the server who invited this account. Safe to call on every sign-in:
 * it does nothing without a stored code, and the server refuses anything
 * that is not a brand-new account. The code is forgotten afterwards either
 * way, so a friend's link never follows someone around.
 */
export async function attachPendingReferral(): Promise<void> {
  const code = pendingReferralCode();
  if (!code) return;
  try {
    const { error } = await supabaseClient.rpc('attach_referral', { p_code: code });
    if (error) console.warn('Could not attach referral:', error.message);
  } finally {
    clearPendingReferral();
  }
}

export async function fetchMyReferralCode(): Promise<string | null> {
  const { data, error } = await supabaseClient.rpc('my_referral_code');
  if (error) {
    console.error('Could not load referral code:', error.message);
    return null;
  }
  return typeof data === 'string' ? data : null;
}

export async function fetchMyReferrals(): Promise<ReferralSummary | null> {
  const { data, error } = await supabaseClient.rpc('my_referrals');
  if (error || !data) {
    if (error) console.error('Could not load referrals:', error.message);
    return null;
  }
  return data as ReferralSummary;
}

/**
 * Asks the server to pay the profile-completion thank-you for the referral
 * that brought this member in, if there is one and it has not been paid.
 * Safe to call any number of times; the server pays once.
 */
export async function claimReferralCompletion(): Promise<{ paid: boolean; credits?: number; reason?: string }> {
  const { data, error } = await supabaseClient.rpc('claim_referral_completion');
  if (error) return { paid: false, reason: error.message };
  return (data ?? { paid: false }) as { paid: boolean; credits?: number; reason?: string };
}

/** The pre-written invitation, in the member's own voice, for WhatsApp or SMS. */
export function inviteMessage(link: string, credits: number): string {
  return `I'm on Dates.care, a dating site where every photo is checked before it's shown. Join with my link and we both get ${credits} free credits once your profile is set up: ${link}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function smsShareUrl(text: string): string {
  // iOS wants "&body", Android wants "?body"; this form works on both.
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  return `sms:${ios ? '&' : '?'}body=${encodeURIComponent(text)}`;
}
