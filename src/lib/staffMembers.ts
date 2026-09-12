import { supabaseClient } from '@/lib/supabase';

/**
 * Member lookup for the Staff panel.
 *
 * Both calls go to security-definer functions that refuse anyone who is not
 * active staff or an admin, so the browser never reads user_profiles
 * directly for this. What comes back is what the panel shows - no invented
 * people, no invented totals.
 */

export interface MemberRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  verification_status: string | null;
  credits: number;
  is_staff: boolean;
  is_admin: boolean;
  joined_at: string | null;
  last_active: string | null;
  deletion_pending: boolean;
}

export interface OverviewCounts {
  members: number;
  verified: number;
  joined_7d: number;
  active_7d: number;
  pending_deletions: number;
  paid_usd: number;
  paid_count: number;
  paid_30d_usd: number;
  completed_profiles: number;
  completed_pct: number;
  women: number;
  men: number;
  signups_30d: number;
  referred_7d: number;
  referred_30d: number;
  referred_pct_30d: number;
  referrals_rewarded: number;
}

/** Members whose name, email or id contains the words typed; the most
 *  recently active members when nothing is typed. At most 50. */
export async function searchMembers(query: string, limit = 25): Promise<MemberRow[]> {
  const { data, error } = await supabaseClient.rpc('staff_search_members', {
    p_query: (query ?? '').trim(),
    p_limit: limit,
  });
  if (error) throw new Error(friendly(error.message));
  return (data ?? []) as MemberRow[];
}

export async function staffOverview(): Promise<OverviewCounts> {
  const { data, error } = await supabaseClient.rpc('staff_overview_counts');
  if (error) throw new Error(friendly(error.message));
  const o = (data ?? {}) as Partial<OverviewCounts>;
  return {
    members: Number(o.members ?? 0),
    verified: Number(o.verified ?? 0),
    joined_7d: Number(o.joined_7d ?? 0),
    active_7d: Number(o.active_7d ?? 0),
    pending_deletions: Number(o.pending_deletions ?? 0),
    paid_usd: Number(o.paid_usd ?? 0),
    paid_count: Number(o.paid_count ?? 0),
    paid_30d_usd: Number(o.paid_30d_usd ?? 0),
    completed_profiles: Number(o.completed_profiles ?? 0),
    completed_pct: Number(o.completed_pct ?? 0),
    women: Number(o.women ?? 0),
    men: Number(o.men ?? 0),
    signups_30d: Number(o.signups_30d ?? 0),
    referred_7d: Number(o.referred_7d ?? 0),
    referred_30d: Number(o.referred_30d ?? 0),
    referred_pct_30d: Number(o.referred_pct_30d ?? 0),
    referrals_rewarded: Number(o.referrals_rewarded ?? 0),
  };
}

export function memberDisplayName(m: Pick<MemberRow, 'full_name' | 'email'>): string {
  const name = (m.full_name ?? '').trim();
  if (name) return name;
  const email = (m.email ?? '').trim();
  return email ? email.split('@')[0] : 'No name on profile';
}

export function verificationLabel(status: string | null | undefined): string {
  switch (status) {
    case 'verified': return 'Verified';
    case 'pending': return 'Verification pending';
    case 'unverified': return 'Not verified';
    default: return 'Verification not started';
  }
}

function friendly(message: string): string {
  if (/not authorized|permission denied|42501/i.test(message)) {
    return 'Your account is not on the staff list, so member search is closed to it.';
  }
  return message;
}
