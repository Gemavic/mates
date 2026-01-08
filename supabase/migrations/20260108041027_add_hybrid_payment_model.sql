/*
  # Add Hybrid Payment Model Support

  1. Updates
    - Add payment_model field to user_subscriptions
    - Support both 'subscription' and 'credits' payment models
    - Update feature access to check both payment types
    
  2. Changes
    - Users can be on subscription (monthly) OR credits (pay-as-you-go)
    - Credit users bypass subscription limits
    - Update check_feature_access function to handle both models
    
  3. Security
    - Maintain RLS policies
    - Ensure proper credit validation
*/

-- Add payment model field to user_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' AND column_name = 'payment_model'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN payment_model text DEFAULT 'subscription' CHECK (payment_model IN ('subscription', 'credits'));
  END IF;
END $$;

-- Update the check_feature_access function to support hybrid payment model
CREATE OR REPLACE FUNCTION check_feature_access(
  p_user_id uuid,
  p_feature_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription record;
  v_tier record;
  v_usage record;
  v_credits record;
  v_limit integer;
  v_current_usage integer;
  v_hours_since_reset numeric;
  v_days_since_reset numeric;
  v_grace_period_expired boolean := false;
  v_has_credits boolean := false;
  v_credit_balance integer := 0;
BEGIN
  -- Get user subscription and tier info
  SELECT 
    us.*,
    st.limits,
    st.tier_name as tier,
    st.tier_level
  INTO v_subscription
  FROM user_subscriptions us
  JOIN subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = p_user_id;
  
  -- If no subscription found, deny access
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'No subscription found',
      'requires_upgrade', true
    );
  END IF;

  -- Check if user is on credits payment model
  IF v_subscription.payment_model = 'credits' THEN
    -- Get user credits
    SELECT 
      complimentary_credits + purchased_credits as total_credits
    INTO v_credits
    FROM user_credits
    WHERE user_id = p_user_id;
    
    IF FOUND AND v_credits.total_credits > 0 THEN
      v_has_credits := true;
      v_credit_balance := v_credits.total_credits;
      
      -- Credit users have unlimited access as long as they have credits
      -- They'll use credits per action via the existing credit system
      RETURN jsonb_build_object(
        'allowed', true,
        'payment_model', 'credits',
        'credit_balance', v_credit_balance,
        'unlimited', true,
        'message', 'Using pay-as-you-go credits'
      );
    ELSE
      -- No credits left
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'No credits remaining',
        'requires_upgrade', true,
        'payment_model', 'credits',
        'credit_balance', 0,
        'message', 'Purchase more credits to continue'
      );
    END IF;
  END IF;
  
  -- For subscription model, continue with existing logic
  
  -- Check if grace period has expired for free tier
  IF v_subscription.tier = 'free' AND v_subscription.grace_period_ends_at IS NOT NULL THEN
    IF v_subscription.grace_period_ends_at < now() THEN
      v_grace_period_expired := true;
      
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Your 15-day trial has ended',
        'requires_upgrade', true,
        'grace_period_expired', true,
        'days_since_signup', EXTRACT(days FROM (now() - v_subscription.started_at)),
        'payment_model', 'subscription',
        'message', 'Upgrade to monthly subscription or switch to pay-as-you-go credits'
      );
    END IF;
  END IF;
  
  -- Get or create feature usage record
  INSERT INTO feature_usage_tracking (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO v_usage
  FROM feature_usage_tracking
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Calculate time since last reset
  v_hours_since_reset := EXTRACT(EPOCH FROM (now() - v_usage.daily_reset_at)) / 3600;
  v_days_since_reset := EXTRACT(EPOCH FROM (now() - v_usage.monthly_reset_at)) / 86400;
  
  -- Reset daily counters if needed (after 24 hours)
  IF v_hours_since_reset >= 24 THEN
    UPDATE feature_usage_tracking
    SET 
      daily_profile_views = 0,
      daily_likes = 0,
      daily_winks = 0,
      daily_messages = 0,
      daily_chats = 0,
      daily_blog_reads = 0,
      daily_blog_comments = 0,
      daily_reset_at = now()
    WHERE user_id = p_user_id;
    
    SELECT * INTO v_usage FROM feature_usage_tracking WHERE user_id = p_user_id;
  END IF;
  
  -- Reset monthly counters if needed
  IF v_days_since_reset >= 30 THEN
    UPDATE feature_usage_tracking
    SET 
      monthly_profile_views = 0,
      monthly_likes = 0,
      monthly_messages = 0,
      monthly_reset_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Check feature-specific limits
  CASE p_feature_type
    WHEN 'profile_view' THEN
      v_limit := COALESCE((v_subscription.limits->>'daily_profile_views')::integer, 999999);
      v_current_usage := v_usage.daily_profile_views;
      
    WHEN 'like' THEN
      v_limit := COALESCE((v_subscription.limits->>'likes_per_day')::integer, 999999);
      v_current_usage := v_usage.daily_likes;
      
    WHEN 'wink' THEN
      v_limit := COALESCE((v_subscription.limits->>'daily_winks')::integer, 999999);
      v_current_usage := v_usage.daily_winks;
      
    WHEN 'message' THEN
      v_limit := COALESCE((v_subscription.limits->>'messages_per_month')::integer, 999999);
      v_current_usage := v_usage.monthly_messages;
      
    WHEN 'chat' THEN
      v_limit := COALESCE((v_subscription.limits->>'daily_chats')::integer, 999999);
      v_current_usage := v_usage.daily_chats;
      
    WHEN 'blog_read' THEN
      v_limit := COALESCE((v_subscription.limits->>'daily_blog_reads')::integer, 999999);
      v_current_usage := v_usage.daily_blog_reads;
      
    WHEN 'blog_comment' THEN
      v_limit := COALESCE((v_subscription.limits->>'daily_blog_comments')::integer, 999999);
      v_current_usage := v_usage.daily_blog_comments;
      
    WHEN 'video_call' THEN
      IF NOT COALESCE((v_subscription.limits->>'video_chat')::boolean, false) THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Video calls require a premium subscription or credits',
          'requires_upgrade', true,
          'feature', 'video_calls',
          'current_tier', v_subscription.tier,
          'payment_model', 'subscription'
        );
      END IF;
      RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'payment_model', 'subscription');
      
    WHEN 'audio_call' THEN
      IF NOT COALESCE((v_subscription.limits->>'audio_calls')::boolean, false) THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Audio calls require a premium subscription or credits',
          'requires_upgrade', true,
          'feature', 'audio_calls',
          'current_tier', v_subscription.tier,
          'payment_model', 'subscription'
        );
      END IF;
      RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'payment_model', 'subscription');
      
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown feature type');
  END CASE;
  
  -- Check if unlimited (-1 means unlimited)
  IF v_limit = -1 OR v_limit >= 999999 THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true, 'payment_model', 'subscription');
  END IF;
  
  -- Check if limit exceeded
  IF v_current_usage >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Daily limit reached',
      'requires_upgrade', true,
      'current_usage', v_current_usage,
      'limit', v_limit,
      'feature', p_feature_type,
      'current_tier', v_subscription.tier,
      'payment_model', 'subscription',
      'message', 'Upgrade to subscription or switch to pay-as-you-go credits'
    );
  END IF;
  
  -- Allow access
  RETURN jsonb_build_object(
    'allowed', true,
    'current_usage', v_current_usage,
    'limit', v_limit,
    'remaining', v_limit - v_current_usage,
    'payment_model', 'subscription'
  );
END;
$$;

-- Function to switch user to credits payment model
CREATE OR REPLACE FUNCTION switch_to_credits_model(
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user subscription to use credits model
  UPDATE user_subscriptions
  SET 
    payment_model = 'credits',
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Ensure user has credits record
  INSERT INTO user_credits (user_id, complimentary_credits, purchased_credits, total_kobos)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN true;
END;
$$;

-- Function to switch user to subscription model
CREATE OR REPLACE FUNCTION switch_to_subscription_model(
  p_user_id uuid,
  p_tier_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user subscription to use subscription model
  UPDATE user_subscriptions
  SET 
    payment_model = 'subscription',
    tier_id = p_tier_id,
    status = 'active',
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

-- Update existing users to be on subscription model by default
UPDATE user_subscriptions
SET payment_model = 'subscription'
WHERE payment_model IS NULL;