// ⚠️⚠️⚠️ CRITICAL SECURITY WARNING ⚠️⚠️⚠️
//
// THIS CREDIT SYSTEM HAS SERIOUS SECURITY FLAWS
//
// VULNERABILITIES:
// 1. Credits stored in localStorage - EASILY MANIPULATED by users
// 2. Client-side only validation - NO SERVER ENFORCEMENT
// 3. No server-side verification before operations
// 4. Users can modify localStorage to give themselves unlimited credits
// 5. No transaction audit trail
// 6. No protection against tampering
//
// ATTACK EXAMPLE:
// 1. Open browser DevTools (F12)
// 2. Go to Application > Local Storage
// 3. Modify: localStorage.setItem('credits_user123', '{"purchasedCredits": 999999}')
// 4. Reload page
// 5. User now has unlimited credits for free
//
// REQUIRED FIX:
// - ALL credit operations MUST be server-side with database validation
// - Use Supabase RLS policies to protect user_credits table
// - Implement Edge Functions for all credit transactions
// - Never trust client-side credit data
// - Validate credits on server before EVERY operation
// - Implement proper transaction logging
//
// CURRENT STATUS: PARTIALLY FIXED
// - Database integration exists but NOT ENFORCED
// - Client-side cache still used as source of truth
// - Need to switch to database-first approach
//
import { supabaseClient } from '@/lib/supabase';
import { getUserCredits, addCredits as dbAddCredits, spendCredits as dbSpendCredits } from '@/lib/database';
import { staffManager } from '@/lib/staffManager';

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

export class CreditManager {
  // ⚠️ SECURITY WARNING: These caches can be manipulated by users
  // DO NOT use as source of truth for credit validation
  // Always verify with database before allowing operations
  private _cachedCredits: Map<string, any> = new Map();
  private _isInitialized: Set<string> = new Set();

  // Initialize user with default credits
  // ⚠️ SECURITY: This should be done server-side via database trigger
  initializeUser(userId: string): void {
    console.warn('⚠️ SECURITY: Credit initialization should be done server-side via database trigger');

    if (!this._isInitialized.has(userId)) {
      const defaultCredits = {
        complimentaryCredits: 20,
        purchasedCredits: 0,
        totalCredits: 20,
        kobos: 20,
        transactions: []
      };

      this._cachedCredits.set(userId, defaultCredits);
      this._isInitialized.add(userId);

      // ⚠️ SECURITY WARNING: localStorage can be edited by user
      // This is NOT secure storage for credits
      // TODO: Remove localStorage usage, use database only
      localStorage.setItem(`credits_${userId}`, JSON.stringify(defaultCredits));
    }
  }

  // Get user data synchronously from cache
  getUserData(userId: string): any {
    if (!this._cachedCredits.has(userId)) {
      this.initializeUser(userId);
    }
    return this._cachedCredits.get(userId) || {
      complimentaryCredits: 20,
      purchasedCredits: 0,
      totalCredits: 20,
      kobos: 20,
      transactions: []
    };
  }

  // Get total credits synchronously
  getTotalCredits(userId: string): number {
    const userData = this.getUserData(userId);
    return userData.totalCredits || 20;
  }

  // Get balance (alias for getTotalCredits)
  getBalance(userId: string): number {
    return this.getTotalCredits(userId);
  }

  // Get kobos synchronously
  getKobos(userId: string): number {
    const userData = this.getUserData(userId);
    return userData.kobos || 20;
  }

  // Check if user can afford a cost
  canAfford(userId: string, amount: number): boolean {
    const totalCredits = this.getTotalCredits(userId);
    const kobos = this.getKobos(userId);
    return totalCredits >= amount || kobos >= amount;
  }

  // Check if user is staff member
  isStaffMember(userId: string): boolean {
    // Simple check - in real app this would check database
    return userId === 'staff-user' || userId.includes('staff');
  }

  // Add credits and update cache
  addCredits(userId: string, amount: number, description: string, updatePurchased: boolean = true): boolean {
    try {
      const userData = this.getUserData(userId);
      
      if (updatePurchased) {
        userData.purchasedCredits += amount;
      } else {
        userData.complimentaryCredits += amount;
      }
      
      userData.totalCredits += amount;
      userData.kobos += amount;
      
      userData.transactions = userData.transactions || [];
      userData.transactions.push({
        type: 'earn',
        amount,
        description,
        timestamp: new Date().toISOString()
      });
      
      this._cachedCredits.set(userId, userData);
      localStorage.setItem(`credits_${userId}`, JSON.stringify(userData));
      
      return true;
    } catch (error) {
      console.error('Error adding credits:', error);
      return false;
    }
  }

  // Send message with credit deduction
  async sendMessage(userId: string, threadId: string, message: string): Promise<{ success: boolean; cost: number; isFree: boolean }> {
    try {
      // Check if this is the first message in thread (simplified logic)
      const isFirstMessage = !localStorage.getItem(`thread_${threadId}_messages`);
      const cost = isFirstMessage ? 0 : 10;
      
      if (cost > 0 && !this.canAfford(userId, cost) && !this.isStaffMember(userId)) {
        return { success: false, cost, isFree: false };
      }
      
      if (cost > 0 && !this.isStaffMember(userId)) {
        const success = await this.deductCredits(userId, cost);
        if (!success) {
          return { success: false, cost, isFree: false };
        }
      }
      
      // Store message count for thread
      const messageCount = parseInt(localStorage.getItem(`thread_${threadId}_messages`) || '0') + 1;
      localStorage.setItem(`thread_${threadId}_messages`, messageCount.toString());
      
      return { success: true, cost, isFree: isFirstMessage };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, cost: 10, isFree: false };
    }
  }

  // Get user's current credit balance
  async getUserCredits(userId: string): Promise<{ complimentary: number; purchased: number; total: number; kobos: number }> {
    try {
      // Try database first
      const credits = await getUserCredits(userId);
      if (credits) {
        return {
          complimentary: credits.complimentary_credits || 0,
          purchased: credits.purchased_credits || 0,
          total: credits.total_kobos || 0,
          kobos: credits.total_kobos || 0
        };
      }
    } catch (error) {
      console.warn('Database unavailable, using localStorage:', error);
    }

    // Fallback to localStorage for demo
    const stored = localStorage.getItem(`credits_${userId}`);
    if (stored) {
      return JSON.parse(stored);
    }

    // Default credits for new users
    const defaultCredits = {
      complimentary: 20,
      purchased: 0,
      total: 20,
      kobos: 20
    };
    
    localStorage.setItem(`credits_${userId}`, JSON.stringify(defaultCredits));
    return defaultCredits;
  }

  // Add credits to user account
  async addCreditsAsync(userId: string, amount: number, type: 'complimentary' | 'purchased' = 'purchased'): Promise<void> {
    try {
      await dbAddCredits(userId, amount, type);
    } catch (error) {
      console.warn('Database unavailable, using localStorage:', error);
      
      // Fallback to localStorage
      const current = await this.getUserCredits(userId);
      const updated = {
        ...current,
        [type]: current[type as keyof typeof current] + amount,
        total: current.total + amount,
        kobos: current.kobos + amount
      };
      
      localStorage.setItem(`credits_${userId}`, JSON.stringify(updated));
    }
  }

  // Deduct credits from user account
  async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      const userData = this.getUserData(userId);
      
      if (userData.totalCredits < amount && userData.kobos < amount) {
        return false; // Insufficient credits and kobos
      }
      
      // Deduct from kobos first if available, then credits
      if (userData.kobos >= amount) {
        userData.kobos -= amount;
      } else {
        userData.totalCredits -= amount;
        
        // Deduct from complimentary first, then purchased
        if (userData.complimentaryCredits >= amount) {
          userData.complimentaryCredits -= amount;
        } else {
          const remaining = amount - userData.complimentaryCredits;
          userData.complimentaryCredits = 0;
          userData.purchasedCredits -= remaining;
        }
      }
      
      userData.transactions = userData.transactions || [];
      userData.transactions.push({
        type: 'spend',
        amount,
        description: `Spent ${amount} credits`,
        timestamp: new Date().toISOString()
      });
      
      this._cachedCredits.set(userId, userData);
      localStorage.setItem(`credits_${userId}`, JSON.stringify(userData));
      
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return false;
    }
  }

  // Legacy method for compatibility
  async deductCreditsLegacy(userId: string, amount: number): Promise<boolean> {
    const current = await this.getUserCredits(userId);
    
    if (current.total < amount) {
      return false; // Insufficient credits
    }

    try {
      await dbSpendCredits(userId, amount, 'Feature usage');
    } catch (error) {
      console.warn('Database unavailable, using localStorage:', error);
      
      // Fallback to localStorage
      const updated = {
        ...current,
        total: current.total - amount,
        kobos: current.kobos - amount
      };
      
      // Deduct from complimentary first, then purchased
      if (current.complimentary >= amount) {
        updated.complimentary = current.complimentary - amount;
      } else {
        const remaining = amount - current.complimentary;
        updated.complimentary = 0;
        updated.purchased = current.purchased - remaining;
      }
      
      localStorage.setItem(`credits_${userId}`, JSON.stringify(updated));
    }

    return true;
  }

  // Check if user has sufficient credits
  async hasCredits(userId: string, amount: number): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    return credits.total >= amount;
  }

  // Get available credit packages for purchase
  getCreditPackages(): CreditPackage[] {
    return [
      // Credits Packages
      {
        id: 'starter',
        package_name: 'Starter Credits',
        credits: 50,
        bonus_credits: 10,
        price_usd: 14.99,
        package_type: 'credits',
        is_popular: false,
        features: ['50 Credits', '10 Bonus Credits', 'Chat & Messaging', 'Profile Features']
      },
      {
        id: 'popular',
        package_name: 'Popular Credits',
        credits: 100,
        bonus_credits: 25,
        price_usd: 29.99,
        package_type: 'credits',
        is_popular: true,
        features: ['100 Credits', '25 Bonus Credits', 'Premium Features', 'Priority Support']
      },
      {
        id: 'premium',
        package_name: 'Premium Credits',
        credits: 450,
        bonus_credits: 0,
        price_usd: 79.99,
        package_type: 'credits',
        is_popular: false,
        features: ['450 Credits', 'Premium Features', 'VIP Features', 'Unlimited Access']
      },
      
      // Kobos Packages
      {
        id: 'kobos-small',
        package_name: 'Kobos Pack',
        credits: 0,
        bonus_credits: 0,
        price_usd: 9.99,
        package_type: 'kobos',
        is_popular: false,
        features: ['20 Kobos', 'Chat Only Currency', 'Special Rate', '1 Kobo = 1 Minute Chat']
      },
      {
        id: 'kobos-large',
        package_name: 'Mega Kobos',
        credits: 0,
        bonus_credits: 0,
        price_usd: 89.99,
        package_type: 'kobos',
        is_popular: true,
        features: ['200 Kobos', 'Best Value', 'Chat Premium', 'Extended Chat Time']
      },
      
      // Combo Packages
      {
        id: 'ultimate',
        package_name: 'Ultimate Combo',
        credits: 750,
        bonus_credits: 100,
        price_usd: 159.99,
        package_type: 'combo',
        is_popular: false,
        features: ['750 Credits', '100 Bonus Credits', 'Everything Included', 'VIP Status']
      },
      {
        id: 'combo-mega',
        package_name: 'Mega Combo',
        credits: 1000,
        bonus_credits: 200,
        price_usd: 199.99,
        package_type: 'combo',
        is_popular: false,
        features: ['1000 Credits', '200 Bonus Credits', 'Premium Everything', 'Lifetime Support']
      }
    ];
  }

  // Get pricing structure for various features
  getPricingStructure(): SpendingOption[] {
    return [
      {
        id: 'message',
        name: 'Send Message',
        cost: 10,
        description: 'Send a message to someone you like',
        category: 'communication'
      },
      {
        id: 'super_like',
        name: 'Super Like',
        cost: 25,
        description: 'Stand out with a super like',
        category: 'discovery'
      },
      {
        id: 'boost',
        name: 'Profile Boost',
        cost: 50,
        description: 'Boost your profile visibility for 30 minutes',
        category: 'visibility'
      },
      {
        id: 'video_call',
        name: 'Video Call',
        cost: 100,
        description: 'Start a video call with your match',
        category: 'communication'
      },
      {
        id: 'gift',
        name: 'Virtual Gift',
        cost: 15,
        description: 'Send a virtual gift',
        category: 'gifts'
      }
    ];
  }

  // Staff functions
  async isStaff(userId: string): Promise<boolean> {
    try {
      return await staffManager.isStaff(userId);
    } catch (error) {
      return false;
    }
  }

  async canManageCredits(userId: string): Promise<boolean> {
    try {
      return await staffManager.canManageCredits(userId);
    } catch (error) {
      return false;
    }
  }

  // Admin function to add credits to any user
  async addCreditsAsStaff(staffUserId: string, targetUserId: string, amount: number, reason: string): Promise<boolean> {
    try {
      const canManage = await this.canManageCredits(staffUserId);
      if (!canManage) {
        return false;
      }

      await this.addCredits(targetUserId, amount, 'complimentary');
      return true;
    } catch (error) {
      console.error('Failed to add credits as staff:', error);
      return false;
    }
  }
}

// Create singleton instance
export const creditManager = new CreditManager();

// Utility functions
export const formatCredits = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
};

export const formatKobos = (amount: number): string => {
  return formatCredits(amount);
};

export const formatPrice = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Credit costs for different actions
export const CREDIT_COSTS = {
  PHOTO: 15,   // Sending photos costs 15 credits (first per thread FREE)
  MESSAGE: 10, // First message per thread is FREE, subsequent messages 10 credits
  VIDEO: 50,   // Video messages cost 50 credits (immediate deduction)
  AUDIO: 30,   // Opening audio messages costs 30 credits
  FILE: 10,    // File attachments cost 10 credits (first per thread FREE)
  SUPER_LIKE: 25, // Super likes cost 25 credits
  BOOST: 50,   // Profile boost costs 50 credits
  GIFT: 15,    // Virtual gifts start at 15 credits
  VIDEO_CALL: 100, // Video calls cost 100 credits per session
  AUDIO_CALL: 50,  // Audio calls cost 50 credits per session
  MAIL_PHOTO: 10, // Sending photos in mail costs 10 credits (first FREE per thread)
};