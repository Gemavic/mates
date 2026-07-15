// ============================================================================
// CREDIT SYSTEM — SERVER-BACKED (secure rewrite)
//
// The database is the ONLY source of truth for balances. This module keeps a
// small in-memory cache purely so the UI can render balances synchronously.
// The cache can never be used to spend credits: every spend goes through a
// SECURITY DEFINER Postgres function that validates, deducts, and logs
// atomically (see supabase/migrations/20260714000000_secure_credit_ledger.sql).
//
// Editing localStorage or React state no longer changes anything real.
// ============================================================================

import { supabaseClient } from '@/lib/supabase';

export interface CreditPackage {
  id: string;
  package_name: string;
  credits: number;
  bonus_credits: number;
  price_usd: number;
  package_type: string;
  is_popular: boolean;
  features: string[];
}

export interface SpendingOption {
  id: string;
  name: string;
  cost: number;
  description: string;
  category: string;
}

interface CachedAccount {
  complimentaryCredits: number;
  purchasedCredits: number;
  totalCredits: number;
  kobos: number; // legacy alias for totalCredits, kept for UI compatibility
  isStaff: boolean;
  tier: 'silver' | 'gold' | 'platinum' | 'elite' | null;
  tierExpires: string | null;
  fetchedAt: number;
}

const CACHE_TTL_MS = 30_000; // refresh balance from server every 30s max

export class CreditManager {
  // Display cache ONLY. Never trusted for spending decisions.
  private _cache: Map<string, CachedAccount> = new Map();
  private _pendingFetch: Map<string, Promise<CachedAccount | null>> = new Map();

  // --------------------------------------------------------------------
  // Server sync
  // --------------------------------------------------------------------

  private async fetchAccount(userId: string): Promise<CachedAccount | null> {
    // De-duplicate concurrent fetches for the same user
    const pending = this._pendingFetch.get(userId);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const { data, error } = await supabaseClient.rpc('get_my_credits');
        if (error || !data || data.length === 0) {
          if (error) console.error('Failed to load credits:', error.message);
          return null;
        }
        const row = Array.isArray(data) ? data[0] : data;
        const account: CachedAccount = {
          complimentaryCredits: row.complimentary_credits ?? 0,
          purchasedCredits: row.purchased_credits ?? 0,
          totalCredits: row.total_credits ?? 0,
          kobos: row.total_credits ?? 0,
          isStaff: !!row.is_staff,
          tier: row.tier ?? null,
          tierExpires: row.tier_expires ?? null,
          fetchedAt: Date.now(),
        };
        this._cache.set(userId, account);
        return account;
      } catch (err) {
        console.error('Credit fetch error:', err);
        return null;
      } finally {
        this._pendingFetch.delete(userId);
      }
    })();

    this._pendingFetch.set(userId, promise);
    return promise;
  }

  private updateCacheTotal(userId: string, newTotal: number) {
    const cached = this._cache.get(userId);
    if (cached) {
      const spentFromComp = Math.min(
        cached.complimentaryCredits,
        Math.max(0, cached.totalCredits - newTotal)
      );
      cached.complimentaryCredits -= spentFromComp;
      cached.purchasedCredits = newTotal - cached.complimentaryCredits;
      cached.totalCredits = newTotal;
      cached.kobos = newTotal;
      cached.fetchedAt = Date.now();
    }
  }

  /** Force-refresh the balance from the server (e.g. after purchase). */
  async refresh(userId: string): Promise<number> {
    const account = await this.fetchAccount(userId);
    return account?.totalCredits ?? 0;
  }

  // --------------------------------------------------------------------
  // Public API (kept compatible with existing call sites)
  // --------------------------------------------------------------------

  /** Load the user's real balance from the server into the display cache. */
  initializeUser(userId: string): void {
    if (!userId) return;
    void this.fetchAccount(userId);
  }

  /** Synchronous read of the cached account (display purposes only). */
  getUserData(userId: string): any {
    const cached = this._cache.get(userId);
    if (!cached) {
      // Trigger a background refresh; render 0 until real data arrives.
      void this.fetchAccount(userId);
      return {
        complimentaryCredits: 0,
        purchasedCredits: 0,
        totalCredits: 0,
        kobos: 0,
        tier: null,
        tierExpires: null,
        transactions: [],
      };
    }
    if (Date.now() - cached.fetchedAt > CACHE_TTL_MS) {
      void this.fetchAccount(userId); // stale — refresh in background
    }
    return { ...cached, transactions: [] };
  }

  getTotalCredits(userId: string): number {
    return this.getUserData(userId).totalCredits || 0;
  }

  getBalance(userId: string): number {
    return this.getTotalCredits(userId);
  }

  getKobos(userId: string): number {
    return this.getUserData(userId).kobos || 0;
  }

  /**
   * UI-level affordability check (enables/disables buttons).
   * The server independently re-validates every spend, so a stale or
   * manipulated cache cannot grant anything.
   */
  canAfford(userId: string, amount: number): boolean {
    return this.getTotalCredits(userId) >= amount;
  }

  /** Staff status comes from the server account row, not the user id string. */
  isStaffMember(userId: string): boolean {
    return this._cache.get(userId)?.isStaff ?? false;
  }

  /** Active subscription tier ('silver'|'gold'|'platinum'|'elite') or null. */
  getTier(userId: string): 'silver' | 'gold' | 'platinum' | 'elite' | null {
    return this._cache.get(userId)?.tier ?? null;
  }

  /** True if the user's subscription includes unlimited messaging. */
  hasUnlimitedMessages(userId: string): boolean {
    const tier = this.getTier(userId);
    return tier === 'gold' || tier === 'platinum' || tier === 'elite';
  }

  /** True if video/audio features are included in the user's subscription. */
  hasIncludedCalls(userId: string): boolean {
    const tier = this.getTier(userId);
    return tier === 'platinum' || tier === 'elite';
  }

  /**
   * Spend credits atomically on the server. Returns false if the server
   * rejects (insufficient balance, no account, etc.).
   */
  async deductCredits(userId: string, amount: number, reason = 'Feature usage'): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient.rpc('spend_credits', {
        p_amount: amount,
        p_reason: reason,
      });
      if (error || !data?.success) {
        if (data?.error === 'insufficient_credits') {
          this.updateCacheTotal(userId, data.total_credits ?? 0);
        }
        return false;
      }
      this.updateCacheTotal(userId, data.total_credits);
      return true;
    } catch (err) {
      console.error('Spend failed:', err);
      return false;
    }
  }

  /** Alias kept for existing call sites. */
  async spendCredits(userId: string, amount: number, reason = 'Feature usage'): Promise<boolean> {
    return this.deductCredits(userId, amount, reason);
  }

  /**
   * Send-message charge: first message in a thread is free, then 10 credits.
   * Enforced server-side in spend_message().
   */
  async sendMessage(
    userId: string,
    threadId: string,
    _message: string
  ): Promise<{ success: boolean; cost: number; isFree: boolean }> {
    try {
      const { data, error } = await supabaseClient.rpc('spend_message', {
        p_thread_id: threadId,
      });
      if (error || !data?.success) {
        if (data?.total_credits !== undefined) {
          this.updateCacheTotal(userId, data.total_credits);
        }
        return { success: false, cost: CREDIT_COSTS.MESSAGE, isFree: false };
      }
      if (data.total_credits !== undefined) {
        this.updateCacheTotal(userId, data.total_credits);
      }
      return { success: true, cost: data.charged ?? 0, isFree: !!data.is_free };
    } catch (err) {
      console.error('Message charge failed:', err);
      return { success: false, cost: CREDIT_COSTS.MESSAGE, isFree: false };
    }
  }

  /**
   * Grant small complimentary reward credits (quizzes, profile completion).
   * Server caps this at 25 per claim / 50 per rolling 24h.
   *
   * NOTE: Purchased credits can ONLY be added by your payment webhook via
   * the service-role `credit_purchase()` function — never from the browser.
   */
  async addCredits(
    userId: string,
    amount: number,
    description = 'Reward',
    _updatePurchased = false
  ): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient.rpc('claim_reward_credits', {
        p_amount: amount,
        p_reason: description,
      });
      if (error || !data?.success) return false;
      this.updateCacheTotal(userId, data.total_credits);
      return true;
    } catch (err) {
      console.error('Reward grant failed:', err);
      return false;
    }
  }

  async hasCredits(userId: string, amount: number): Promise<boolean> {
    const account = await this.fetchAccount(userId);
    return (account?.totalCredits ?? 0) >= amount;
  }

  async getUserCredits(userId: string): Promise<{
    complimentary: number;
    purchased: number;
    total: number;
    kobos: number;
  }> {
    const account = await this.fetchAccount(userId);
    return {
      complimentary: account?.complimentaryCredits ?? 0,
      purchased: account?.purchasedCredits ?? 0,
      total: account?.totalCredits ?? 0,
      kobos: account?.totalCredits ?? 0,
    };
  }

  // --------------------------------------------------------------------
  // Catalog data (static)
  // --------------------------------------------------------------------

  getCreditPackages(): CreditPackage[] {
    return [
      {
        id: 'starter',
        package_name: 'Starter',
        credits: 50,
        bonus_credits: 10,
        price_usd: 14.99,
        package_type: 'credits',
        is_popular: false,
        features: ['50 Credits', '10 Bonus Credits', 'Messaging & Gifts', 'All Core Features'],
      },
      {
        id: 'popular',
        package_name: 'Popular',
        credits: 100,
        bonus_credits: 25,
        price_usd: 29.99,
        package_type: 'credits',
        is_popular: true,
        features: ['100 Credits', '25 Bonus Credits', 'Best For Regular Use', 'Priority Support'],
      },
      {
        id: 'premium',
        package_name: 'Premium',
        credits: 450,
        bonus_credits: 50,
        price_usd: 79.99,
        package_type: 'credits',
        is_popular: false,
        features: ['450 Credits', '50 Bonus Credits', 'Best Value Per Credit', 'VIP Support'],
      },
    ];
  }

  getPricingStructure(): SpendingOption[] {
    return [
      {
        id: 'message',
        name: 'Send Message',
        cost: CREDIT_COSTS.MESSAGE,
        description: 'First message to each connection is free',
        category: 'communication',
      },
      {
        id: 'super_like',
        name: 'Super Like',
        cost: CREDIT_COSTS.SUPER_LIKE,
        description: 'Stand out with a super like',
        category: 'discovery',
      },
      {
        id: 'boost',
        name: 'Profile Boost',
        cost: CREDIT_COSTS.BOOST,
        description: 'Boost your profile visibility for 30 minutes',
        category: 'visibility',
      },
      {
        id: 'video_call',
        name: 'Video Call',
        cost: CREDIT_COSTS.VIDEO_CALL,
        description: 'Start a video call with your match',
        category: 'communication',
      },
      {
        id: 'gift',
        name: 'Virtual Gift',
        cost: CREDIT_COSTS.GIFT,
        description: 'Send a virtual gift',
        category: 'gifts',
      },
    ];
  }

  // --------------------------------------------------------------------
  // Staff helpers (server-verified)
  // --------------------------------------------------------------------

  async isStaff(userId: string): Promise<boolean> {
    const account = await this.fetchAccount(userId);
    return account?.isStaff ?? false;
  }

  async canManageCredits(userId: string): Promise<boolean> {
    return this.isStaff(userId);
  }

  /**
   * Staff credit grants must run through a server endpoint using the
   * service-role key (credit_purchase / a dedicated admin function).
   * Doing it from the browser would let anyone with dev tools call it.
   */
  async addCreditsAsStaff(): Promise<boolean> {
    console.error(
      'addCreditsAsStaff is disabled client-side. Use a server endpoint with the service-role key.'
    );
    return false;
  }
}

// Singleton
export const creditManager = new CreditManager();

// ----------------------------------------------------------------------
// Utility functions (unchanged API)
// ----------------------------------------------------------------------

export const formatCredits = (amount: number): string => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  return amount.toString();
};

export const formatKobos = (amount: number): string => formatCredits(amount);

export const formatPrice = (amount: number): string => `$${amount.toFixed(2)}`;

// Credit costs for different actions (display values; server enforces real costs)
export const CREDIT_COSTS = {
  PHOTO: 15,
  MESSAGE: 10, // first message per thread is FREE (enforced server-side)
  VIDEO: 50,
  AUDIO: 30,
  FILE: 10,
  SUPER_LIKE: 25,
  BOOST: 50,
  GIFT: 15,
  VIDEO_CALL: 100,
  AUDIO_CALL: 50,
  MAIL_PHOTO: 10,
};
