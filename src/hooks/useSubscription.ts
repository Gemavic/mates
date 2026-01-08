import { useState, useEffect, useCallback } from 'react';
import { subscriptionManager, FeatureAccessResult, UserSubscription, SubscriptionTier, FeatureUsage } from '@/lib/subscriptionManager';
import { useAuth } from './useAuth';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [usage, setUsage] = useState<FeatureUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSubscriptionData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const [subscriptionData, tierData, usageData] = await Promise.all([
        subscriptionManager.getUserSubscription(user.id),
        subscriptionManager.getUserTier(user.id),
        subscriptionManager.getFeatureUsage(user.id),
      ]);

      setSubscription(subscriptionData);
      setTier(tierData);
      setUsage(usageData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const checkAccess = useCallback(
    async (featureType: 'profile_view' | 'like' | 'wink' | 'message' | 'chat' | 'blog_read' | 'blog_comment' | 'video_call' | 'audio_call'): Promise<FeatureAccessResult> => {
      if (!user?.id) {
        return {
          allowed: false,
          reason: 'Please sign in to continue',
          requires_upgrade: false,
        };
      }

      return await subscriptionManager.checkFeatureAccess(user.id, featureType);
    },
    [user?.id]
  );

  const trackUsage = useCallback(
    async (featureType: 'profile_view' | 'like' | 'wink' | 'message' | 'chat' | 'blog_read' | 'blog_comment'): Promise<boolean> => {
      if (!user?.id) return false;
      const success = await subscriptionManager.incrementFeatureUsage(user.id, featureType);
      if (success) {
        await loadSubscriptionData();
      }
      return success;
    },
    [user?.id, loadSubscriptionData]
  );

  const recordUpgradePrompt = useCallback(async () => {
    if (!user?.id) return;
    await subscriptionManager.recordUpgradePrompt(user.id);
    await loadSubscriptionData();
  }, [user?.id, loadSubscriptionData]);

  const isFreeTier = subscription?.tier_name === 'free';
  const isCreditsModel = subscriptionManager.isCreditsModel(subscription);
  const isSubscriptionModel = subscriptionManager.isSubscriptionModel(subscription);
  const isGracePeriodActive = subscription?.grace_period_ends_at
    ? new Date(subscription.grace_period_ends_at) > new Date()
    : false;
  const daysRemaining = subscriptionManager.getDaysUntilGracePeriodEnds(subscription);
  const shouldShowUpgradePrompt = subscriptionManager.shouldShowUpgradePrompt(subscription);

  const switchToCredits = useCallback(async () => {
    if (!user?.id) return false;
    return await subscriptionManager.switchToCreditsModel(user.id);
  }, [user?.id]);

  const switchToSubscription = useCallback(async (tierId: string) => {
    if (!user?.id) return false;
    return await subscriptionManager.switchToSubscriptionModel(user.id, tierId);
  }, [user?.id]);

  return {
    subscription,
    tier,
    usage,
    loading,
    isFreeTier,
    isCreditsModel,
    isSubscriptionModel,
    isGracePeriodActive,
    daysRemaining,
    shouldShowUpgradePrompt,
    checkAccess,
    trackUsage,
    recordUpgradePrompt,
    switchToCredits,
    switchToSubscription,
    refreshSubscription: loadSubscriptionData,
  };
}
