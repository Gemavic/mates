/*
  # Add Grace Period and Feature Tracking for Free Users

  1. Changes to user_subscriptions
    - Add grace_period_ends_at column
    - Add upgrade_prompts_shown tracking
    - Update to track 15-day trial period

  2. New Tables
    - feature_usage_tracking - tracks daily usage of features
  
  3. New Functions
    - check_feature_access - verifies if user can access a feature
    - increment_feature_usage - tracks feature usage
    - get_user_tier_limits - retrieves user's current tier limits

  4. Security
    - Enable RLS on all tables
    - Add proper access policies
*/

-- Add grace period columns to user_subscriptions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' AND column_name = 'grace_period_ends_at'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN grace_period_ends_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' AND column_name = 'upgrade_prompts_shown'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN upgrade_prompts_shown integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_subscriptions' AND column_name = 'last_upgrade_prompt_at'
  ) THEN
    ALTER TABLE user_subscriptions ADD COLUMN last_upgrade_prompt_at timestamptz;
  END IF;
END $$;

-- Create feature usage tracking table
CREATE TABLE IF NOT EXISTS feature_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Daily counters
  daily_profile_views integer NOT NULL DEFAULT 0,
  daily_likes integer NOT NULL DEFAULT 0,
  daily_winks integer NOT NULL DEFAULT 0,
  daily_messages integer NOT NULL DEFAULT 0,
  daily_chats integer NOT NULL DEFAULT 0,
  daily_blog_reads integer NOT NULL DEFAULT 0,
  daily_blog_comments integer NOT NULL DEFAULT 0,
  
  -- Monthly counters
  monthly_profile_views integer NOT NULL DEFAULT 0,
  monthly_likes integer NOT NULL DEFAULT 0,
  monthly_messages integer NOT NULL DEFAULT 0,
  
  -- Last reset timestamps
  daily_reset_at timestamptz NOT NULL DEFAULT now(),
  monthly_reset_at timestamptz NOT NULL DEFAULT now(),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE feature_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_usage_tracking
CREATE POLICY "Users can view own feature usage"
  ON feature_usage_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feature usage"
  ON feature_usage_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feature usage"
  ON feature_usage_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_feature_usage_user_id ON feature_usage_tracking(user_id);

-- Update the default free tier to have explicit limits for the grace period
UPDATE subscription_tiers
SET limits = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              COALESCE(limits, '{}'::jsonb),
              '{daily_profile_views}', '10'
            ),
            '{daily_likes}', '5'
          ),
          '{daily_winks}', '5'
        ),
        '{daily_messages}', '10'
      ),
      '{daily_chats}', '3'
    ),
    '{daily_blog_reads}', '20'
  ),
  '{daily_blog_comments}', '5'
)
WHERE tier_name = 'free';

-- Function to initialize subscription with grace period
CREATE OR REPLACE FUNCTION initialize_free_trial()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_free_tier_id uuid;
  v_grace_period_end timestamptz;
BEGIN
  -- Get the free tier ID
  SELECT id INTO v_free_tier_id
  FROM subscription_tiers
  WHERE tier_name = 'free'
  LIMIT 1;
  
  -- Calculate grace period end (15 days from now)
  v_grace_period_end := now() + interval '15 days';
  
  -- Create subscription record with grace period
  INSERT INTO user_subscriptions (
    user_id,
    tier_id,
    tier_name,
    billing_cycle,
    status,
    started_at,
    current_period_start,
    current_period_end,
    grace_period_ends_at,
    auto_renew
  ) VALUES (
    NEW.id,
    v_free_tier_id,
    'free',
    'monthly',
    'active',
    now(),
    now(),
    v_grace_period_end,
    v_grace_period_end,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create feature usage tracking record
  INSERT INTO feature_usage_tracking (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_free_trial ON auth.users;
CREATE TRIGGER on_auth_user_free_trial
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_free_trial();

-- Function to check feature access based on tier and usage
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
  v_limit integer;
  v_current_usage integer;
  v_hours_since_reset numeric;
  v_days_since_reset numeric;
  v_grace_period_expired boolean := false;
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
  
  -- Check if grace period has expired for free tier
  IF v_subscription.tier = 'free' AND v_subscription.grace_period_ends_at IS NOT NULL THEN
    IF v_subscription.grace_period_ends_at < now() THEN
      v_grace_period_expired := true;
      
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'Your 15-day trial has ended',
        'requires_upgrade', true,
        'grace_period_expired', true,
        'days_since_signup', EXTRACT(days FROM (now() - v_subscription.started_at))
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
          'reason', 'Video calls require a premium subscription',
          'requires_upgrade', true,
          'feature', 'video_calls',
          'current_tier', v_subscription.tier
        );
      END IF;
      RETURN jsonb_build_object('allowed', true, 'unlimited', true);
      
    WHEN 'audio_call' THEN
      IF NOT COALESCE((v_subscription.limits->>'audio_calls')::boolean, false) THEN
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'Audio calls require a premium subscription',
          'requires_upgrade', true,
          'feature', 'audio_calls',
          'current_tier', v_subscription.tier
        );
      END IF;
      RETURN jsonb_build_object('allowed', true, 'unlimited', true);
      
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown feature type');
  END CASE;
  
  -- Check if unlimited (-1 means unlimited)
  IF v_limit = -1 OR v_limit >= 999999 THEN
    RETURN jsonb_build_object('allowed', true, 'unlimited', true);
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
      'current_tier', v_subscription.tier
    );
  END IF;
  
  -- Allow access
  RETURN jsonb_build_object(
    'allowed', true,
    'current_usage', v_current_usage,
    'limit', v_limit,
    'remaining', v_limit - v_current_usage
  );
END;
$$;

-- Function to increment feature usage
CREATE OR REPLACE FUNCTION increment_feature_usage(
  p_user_id uuid,
  p_feature_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment the appropriate counter
  CASE p_feature_type
    WHEN 'profile_view' THEN
      UPDATE feature_usage_tracking
      SET 
        daily_profile_views = daily_profile_views + 1,
        monthly_profile_views = monthly_profile_views + 1,
        updated_at = now()
      WHERE user_id = p_user_id;
      
    WHEN 'like' THEN
      UPDATE feature_usage_tracking
      SET 
        daily_likes = daily_likes + 1,
        monthly_likes = monthly_likes + 1,
        updated_at = now()
      WHERE user_id = p_user_id;
      
    WHEN 'wink' THEN
      UPDATE feature_usage_tracking
      SET 
        daily_winks = daily_winks + 1,
        updated_at = now()
      WHERE user_id = p_user_id;
      
    WHEN 'message' THEN
      UPDATE feature_usage_tracking
      SET 
        daily_messages = daily_messages + 1,
        monthly_messages = monthly_messages + 1,
        updated_at = now()
      WHERE user_id = p_user_id;
      
    WHEN 'chat' THEN
      UPDATE feature_usage_tracking
      SET 
        daily_chats = daily_chats + 1,
        updated_at = now()
      WHERE user_id = p_user_id;
      
    WHEN 'blog_read' THEN
      UPDATE feature_usage_tracking
      SET 
        daily_blog_reads = daily_blog_reads + 1,
        updated_at = now()
      WHERE user_id = p_user_id;
      
    WHEN 'blog_comment' THEN
      UPDATE feature_usage_tracking
      SET 
        daily_blog_comments = daily_blog_comments + 1,
        updated_at = now()
      WHERE user_id = p_user_id;
      
    ELSE
      RETURN false;
  END CASE;
  
  RETURN true;
END;
$$;

-- Function to record upgrade prompt shown
CREATE OR REPLACE FUNCTION record_upgrade_prompt(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_subscriptions
  SET 
    upgrade_prompts_shown = upgrade_prompts_shown + 1,
    last_upgrade_prompt_at = now(),
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;