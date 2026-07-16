import { supabaseClient } from './supabase';

export interface SubscriptionTier {
  id: string;
  tier_name: string;
  tier_level: number;
  display_name: string;
  monthly_price_usd: number;
  annual_price_usd: number;
  features: string[];
  limits: {
    daily_profile_views?: number;
    likes_per_day?: number;
    daily_winks?: number;
    messages_per_month?: number;
    daily_chats?: number;
    daily_blog_reads?: number;
    daily_blog_comments?: number;
    video_chat?: boolean;
    audio_calls?: boolean;
    see_who_liked?: boolean;
  };
  description: string;
  is_active: boolean;
  is_featured: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier_id: string;
  tier_name: string;
  status: string;
  started_at: string;
  current_period_end: string;
  grace_period_ends_at?: string;
  upgrade_prompts_shown: number;
  last_upgrade_prompt_at?: string;
  payment_model: 'subscription' | 'credits';
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  requires_upgrade?: boolean;
  current_usage?: number;
  limit?: number;
  remaining?: number;
  unlimited?: boolean;
  grace_period_expired?: boolean;
  days_since_signup?: number;
  feature?: string;
  current_tier?: string;
  payment_model?: 'subscription' | 'credits';
  credit_balance?: number;
  message?: string;
}

export interface FeatureUsage {
  daily_profile_views: number;
  daily_likes: number;
  daily_winks: number;
  daily_messages: number;
  daily_chats: number;
  daily_blog_reads: number;
  daily_blog_comments: number;
  monthly_profile_views: number;
  monthly_likes: number;
  monthly_messages: number;
  daily_reset_at: string;
  monthly_reset_at: string;
}

class SubscriptionManager {

  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const { data, error } = await supabaseClient
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching user subscription:', error);
      return null;
    }
  }

  async getUserTier(userId: string): Promise<SubscriptionTier | null> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) return null;

      const { data, error } = await supabaseClient
        .from('subscription_tiers')
        .select('*')
        .eq('id', subscription.tier_id)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching user tier:', error);
      return null;
    }
  }

  async getAllTiers(): Promise<SubscriptionTier[]> {
    try {
      const { data, error } = await supabaseClient
        .from('subscription_tiers')
        .select('*')
        .eq('is_active', true)
        .order('tier_level');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subscription tiers:', error);
      return [];
    }
  }

  async getFeatureUsage(userId: string): Promise<FeatureUsage | null> {
    try {
      const { data, error } = await supabaseClient
        .from('feature_usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching feature usage:', error);
      return null;
    }
  }

  async checkFeatureAccess(
    userId: string,
    featureType: 'profile_view' | 'like' | 'wink' | 'message' | 'chat' | 'blog_read' | 'blog_comment' | 'video_call' | 'audio_call'
  ): Promise<FeatureAccessResult> {
    try {
      const { data, error } = await supabaseClient.rpc('check_feature_access', {
        p_user_id: userId,
        p_feature_type: featureType,
      });

      if (error) throw error;
      return data as FeatureAccessResult;
    } catch (error) {
      console.error('Error checking feature access:', error);
      return {
        allowed: false,
        reason: 'Error checking access',
        requires_upgrade: false,
      };
    }
  }

  async incrementFeatureUsage(
    userId: string,
    featureType: 'profile_view' | 'like' | 'wink' | 'message' | 'chat' | 'blog_read' | 'blog_comment'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient.rpc('increment_feature_usage', {
        p_user_id: userId,
        p_feature_type: featureType,
      });

      if (error) throw error;
      return data === true;
    } catch (error) {
      console.error('Error incrementing feature usage:', error);
      return false;
    }
  }

  async recordUpgradePrompt(userId: string): Promise<void> {
    try {
      await supabaseClient.rpc('record_upgrade_prompt', {
        p_user_id: userId,
      });
    } catch (error) {
      console.error('Error recording upgrade prompt:', error);
    }
  }

  async upgradeSubscription(userId: string, newTierId: string): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('user_subscriptions')
        .update({
          tier_id: newTierId,
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;


      return true;
    } catch (error) {
      console.error('Error upgrading subscription:', error);
      return false;
    }
  }

  isFreeTier(subscription: UserSubscription | null): boolean {
    return subscription?.tier_name === 'free';
  }

  isCreditsModel(subscription: UserSubscription | null): boolean {
    return subscription?.payment_model === 'credits';
  }

  isSubscriptionModel(subscription: UserSubscription | null): boolean {
    return subscription?.payment_model === 'subscription';
  }

  async switchToCreditsModel(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient.rpc('switch_to_credits_model', {
        p_user_id: userId,
      });

      if (error) throw error;

      this.clearCache();
      return data === true;
    } catch (error) {
      console.error('Error switching to credits model:', error);
      return false;
    }
  }

  async switchToSubscriptionModel(userId: string, tierId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseClient.rpc('switch_to_subscription_model', {
        p_user_id: userId,
        p_tier_id: tierId,
      });

      if (error) throw error;

      this.clearCache();
      return data === true;
    } catch (error) {
      console.error('Error switching to subscription model:', error);
      return false;
    }
  }

  isGracePeriodActive(subscription: UserSubscription | null): boolean {
    if (!subscription?.grace_period_ends_at) return false;
    return new Date(subscription.grace_period_ends_at) > new Date();
  }

  getDaysUntilGracePeriodEnds(subscription: UserSubscription | null): number {
    if (!subscription?.grace_period_ends_at) return 0;

    const now = new Date();
    const endDate = new Date(subscription.grace_period_ends_at);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  shouldShowUpgradePrompt(subscription: UserSubscription | null): boolean {
    if (!subscription || !this.isFreeTier(subscription)) return false;

    const daysSinceLastPrompt = subscription.last_upgrade_prompt_at
      ? (Date.now() - new Date(subscription.last_upgrade_prompt_at).getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    return daysSinceLastPrompt > 1;
  }

  clearCache(): void {
  }
}

export const subscriptionManager = new SubscriptionManager();
