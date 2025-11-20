import { supabase } from './supabase';

export type SubscriptionTier = 'free' | 'basic' | 'premium' | 'elite';

export interface SubscriptionFeatures {
  tier: SubscriptionTier;
  price: number;
  features: {
    messaging: {
      allowed: boolean;
      dailyLimit?: number;
      characterLimit?: number;
    };
    videoChat: {
      allowed: boolean;
      durationMaxMinutes?: number;
    };
    voiceCall: {
      allowed: boolean;
      durationMaxMinutes?: number;
    };
    profileViewing: {
      dailyLimit?: number;
      seeWhoLikedYou: boolean;
      seeWhoViewedProfile: boolean;
    };
    matching: {
      algorithmicMatches: boolean;
      advancedFilters: boolean;
      unlimitedLikes: boolean;
      superLikes: number;
    };
    verification: {
      required: boolean;
      priorityReview: boolean;
    };
    gifts: {
      canSend: boolean;
      canReceive: boolean;
    };
    support: {
      priority: boolean;
      dedicatedManager: boolean;
    };
  };
}

export interface SubscriptionStatus {
  userId: string;
  tier: SubscriptionTier;
  active: boolean;
  startDate?: Date;
  endDate?: Date;
  autoRenew: boolean;
  canUpgrade: boolean;
}

class SubscriptionPaywallManager {
  private readonly subscriptionTiers: Record<SubscriptionTier, SubscriptionFeatures> = {
    free: {
      tier: 'free',
      price: 0,
      features: {
        messaging: {
          allowed: false,
          dailyLimit: 0,
        },
        videoChat: {
          allowed: false,
        },
        voiceCall: {
          allowed: false,
        },
        profileViewing: {
          dailyLimit: 10,
          seeWhoLikedYou: false,
          seeWhoViewedProfile: false,
        },
        matching: {
          algorithmicMatches: false,
          advancedFilters: false,
          unlimitedLikes: false,
          superLikes: 0,
        },
        verification: {
          required: false,
          priorityReview: false,
        },
        gifts: {
          canSend: false,
          canReceive: true,
        },
        support: {
          priority: false,
          dedicatedManager: false,
        },
      },
    },
    basic: {
      tier: 'basic',
      price: 29.99,
      features: {
        messaging: {
          allowed: true,
          dailyLimit: 50,
          characterLimit: 500,
        },
        videoChat: {
          allowed: true,
          durationMaxMinutes: 30,
        },
        voiceCall: {
          allowed: true,
          durationMaxMinutes: 60,
        },
        profileViewing: {
          dailyLimit: 100,
          seeWhoLikedYou: true,
          seeWhoViewedProfile: false,
        },
        matching: {
          algorithmicMatches: true,
          advancedFilters: true,
          unlimitedLikes: false,
          superLikes: 5,
        },
        verification: {
          required: true,
          priorityReview: false,
        },
        gifts: {
          canSend: true,
          canReceive: true,
        },
        support: {
          priority: false,
          dedicatedManager: false,
        },
      },
    },
    premium: {
      tier: 'premium',
      price: 49.99,
      features: {
        messaging: {
          allowed: true,
          dailyLimit: 200,
          characterLimit: 2000,
        },
        videoChat: {
          allowed: true,
          durationMaxMinutes: 120,
        },
        voiceCall: {
          allowed: true,
          durationMaxMinutes: 180,
        },
        profileViewing: {
          seeWhoLikedYou: true,
          seeWhoViewedProfile: true,
        },
        matching: {
          algorithmicMatches: true,
          advancedFilters: true,
          unlimitedLikes: true,
          superLikes: 20,
        },
        verification: {
          required: true,
          priorityReview: true,
        },
        gifts: {
          canSend: true,
          canReceive: true,
        },
        support: {
          priority: true,
          dedicatedManager: false,
        },
      },
    },
    elite: {
      tier: 'elite',
      price: 99.99,
      features: {
        messaging: {
          allowed: true,
        },
        videoChat: {
          allowed: true,
        },
        voiceCall: {
          allowed: true,
        },
        profileViewing: {
          seeWhoLikedYou: true,
          seeWhoViewedProfile: true,
        },
        matching: {
          algorithmicMatches: true,
          advancedFilters: true,
          unlimitedLikes: true,
          superLikes: 100,
        },
        verification: {
          required: true,
          priorityReview: true,
        },
        gifts: {
          canSend: true,
          canReceive: true,
        },
        support: {
          priority: true,
          dedicatedManager: true,
        },
      },
    },
  };

  async getUserSubscription(userId: string): Promise<SubscriptionStatus> {
    try {
      if (!supabase) {
        return {
          userId,
          tier: 'free',
          active: false,
          autoRenew: false,
          canUpgrade: true,
        };
      }

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !data) {
        return {
          userId,
          tier: 'free',
          active: false,
          autoRenew: false,
          canUpgrade: true,
        };
      }

      return {
        userId: data.user_id,
        tier: data.tier_name as SubscriptionTier,
        active: data.status === 'active',
        startDate: new Date(data.start_date),
        endDate: new Date(data.end_date),
        autoRenew: data.auto_renew,
        canUpgrade: data.tier_name !== 'elite',
      };
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return {
        userId,
        tier: 'free',
        active: false,
        autoRenew: false,
        canUpgrade: true,
      };
    }
  }

  async canAccessFeature(
    userId: string,
    feature: 'messaging' | 'videoChat' | 'voiceCall' | 'algorithmicMatching'
  ): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: SubscriptionTier }> {
    const subscription = await this.getUserSubscription(userId);
    const tierFeatures = this.subscriptionTiers[subscription.tier];

    switch (feature) {
      case 'messaging':
        if (!tierFeatures.features.messaging.allowed) {
          return {
            allowed: false,
            reason: 'Messaging requires at least Basic subscription',
            upgradeRequired: 'basic',
          };
        }
        return { allowed: true };

      case 'videoChat':
        if (!tierFeatures.features.videoChat.allowed) {
          return {
            allowed: false,
            reason: 'Video chat requires at least Basic subscription',
            upgradeRequired: 'basic',
          };
        }
        return { allowed: true };

      case 'voiceCall':
        if (!tierFeatures.features.voiceCall.allowed) {
          return {
            allowed: false,
            reason: 'Voice calls require at least Basic subscription',
            upgradeRequired: 'basic',
          };
        }
        return { allowed: true };

      case 'algorithmicMatching':
        if (!tierFeatures.features.matching.algorithmicMatches) {
          return {
            allowed: false,
            reason: 'Advanced matching requires at least Basic subscription',
            upgradeRequired: 'basic',
          };
        }
        return { allowed: true };

      default:
        return { allowed: false, reason: 'Unknown feature' };
    }
  }

  async checkMessageLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
  }> {
    const subscription = await this.getUserSubscription(userId);
    const tierFeatures = this.subscriptionTiers[subscription.tier];

    if (!tierFeatures.features.messaging.allowed) {
      return { allowed: false, remaining: 0, limit: 0 };
    }

    const dailyLimit = tierFeatures.features.messaging.dailyLimit;

    if (!dailyLimit) {
      return { allowed: true, remaining: -1, limit: -1 };
    }

    if (!supabase) {
      return { allowed: true, remaining: dailyLimit, limit: dailyLimit };
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .gte('created_at', today.toISOString());

      const used = count || 0;
      const remaining = Math.max(0, dailyLimit - used);

      return {
        allowed: remaining > 0,
        remaining,
        limit: dailyLimit,
      };
    } catch (error) {
      return { allowed: true, remaining: dailyLimit, limit: dailyLimit };
    }
  }

  getTierFeatures(tier: SubscriptionTier): SubscriptionFeatures {
    return this.subscriptionTiers[tier];
  }

  getAllTiers(): SubscriptionFeatures[] {
    return Object.values(this.subscriptionTiers);
  }

  async upgradeSubscription(
    userId: string,
    newTier: SubscriptionTier
  ): Promise<{ success: boolean; message: string }> {
    if (newTier === 'free') {
      return { success: false, message: 'Cannot upgrade to free tier' };
    }

    const currentSub = await this.getUserSubscription(userId);

    const tierOrder: SubscriptionTier[] = ['free', 'basic', 'premium', 'elite'];
    const currentIndex = tierOrder.indexOf(currentSub.tier);
    const newIndex = tierOrder.indexOf(newTier);

    if (newIndex <= currentIndex) {
      return { success: false, message: 'Can only upgrade to higher tier' };
    }

    if (!supabase) {
      return {
        success: true,
        message: `Successfully upgraded to ${newTier} tier`,
      };
    }

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      const { error } = await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        tier_name: newTier,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        auto_renew: true,
        created_at: startDate.toISOString(),
        updated_at: startDate.toISOString(),
      });

      if (error) throw error;

      return {
        success: true,
        message: `Successfully upgraded to ${newTier} tier`,
      };
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      return {
        success: false,
        message: 'Failed to upgrade subscription',
      };
    }
  }

  getFeatureComparisonTable(): Array<{
    feature: string;
    free: string;
    basic: string;
    premium: string;
    elite: string;
  }> {
    return [
      {
        feature: 'Messaging',
        free: '❌ Not Available',
        basic: '✅ 50/day (500 chars)',
        premium: '✅ 200/day (2000 chars)',
        elite: '✅ Unlimited',
      },
      {
        feature: 'Video Chat',
        free: '❌ Not Available',
        basic: '✅ 30 min/call',
        premium: '✅ 2 hours/call',
        elite: '✅ Unlimited',
      },
      {
        feature: 'Voice Calls',
        free: '❌ Not Available',
        basic: '✅ 60 min/call',
        premium: '✅ 3 hours/call',
        elite: '✅ Unlimited',
      },
      {
        feature: 'Advanced Matching',
        free: '❌ Not Available',
        basic: '✅ Enabled',
        premium: '✅ Enabled',
        elite: '✅ Enabled',
      },
      {
        feature: 'See Who Liked You',
        free: '❌ Not Available',
        basic: '✅ Enabled',
        premium: '✅ Enabled',
        elite: '✅ Enabled',
      },
      {
        feature: 'Profile Views',
        free: '10/day',
        basic: '100/day',
        premium: 'Unlimited',
        elite: 'Unlimited',
      },
      {
        feature: 'Super Likes',
        free: '0',
        basic: '5/month',
        premium: '20/month',
        elite: '100/month',
      },
      {
        feature: 'Verification',
        free: 'Optional',
        basic: 'Required',
        premium: 'Required + Priority',
        elite: 'Required + Priority',
      },
      {
        feature: 'Support',
        free: 'Standard',
        basic: 'Standard',
        premium: 'Priority',
        elite: 'Dedicated Manager',
      },
    ];
  }
}

export const subscriptionPaywall = new SubscriptionPaywallManager();

export const getUserSubscription = (userId: string) =>
  subscriptionPaywall.getUserSubscription(userId);

export const canAccessFeature = (
  userId: string,
  feature: 'messaging' | 'videoChat' | 'voiceCall' | 'algorithmicMatching'
) => subscriptionPaywall.canAccessFeature(userId, feature);

export const checkMessageLimit = (userId: string) =>
  subscriptionPaywall.checkMessageLimit(userId);

export const getTierFeatures = (tier: SubscriptionTier) =>
  subscriptionPaywall.getTierFeatures(tier);

export const getAllTiers = () => subscriptionPaywall.getAllTiers();

export const upgradeSubscription = (userId: string, tier: SubscriptionTier) =>
  subscriptionPaywall.upgradeSubscription(userId, tier);

export const getFeatureComparison = () =>
  subscriptionPaywall.getFeatureComparisonTable();
