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
      // NEW MODEL (no trials, no legacy paywalls):
      // The core loop — browsing, liking, matching, opening chats — is FREE
      // for every signed-in user. Monetization happens at the moment of
      // spending (messages, calls, gifts, reveals) through the server-side
      // credit ledger and subscription entitlements, never by locking the
      // app behind a trial wall.
      void featureType;
      if (!user?.id) {
        return {
          allowed: false,
          reason: 'Please sign in to continue',
          requires_upgrade: false,
        };
      }
      return { allowed: true, requires_upgrade: false } as FeatureAccessResult;
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
  // Trial-expiry upsell modals are retired; upgrades are offered contextually
  // at the moment of spending instead of interrupting the experience.
  const shouldShowUpgradePrompt = false;

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
