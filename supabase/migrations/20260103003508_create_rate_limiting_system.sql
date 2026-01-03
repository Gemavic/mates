/*
  # Create Rate Limiting System

  This migration creates tables and functions for tracking and enforcing rate limits
  to prevent abuse and ensure fair usage of the platform.

  ## New Tables

  1. **user_rate_limits**
     - Tracks per-user rate limits for various actions
     - Automatically resets counters based on time windows
     - Supports minute, hour, and day windows

  ## Functions

  1. **check_rate_limit** - Check if user can perform action
  2. **increment_rate_limit** - Increment counter after action
  3. **reset_rate_limits** - Reset expired rate limit windows

  ## Rate Limits

  - Messages: 10/minute, 500/day
  - Likes: 30/minute, 1000/day
  - API calls: 100/minute, 10000/day
  - Gifts: 5/minute, 50/day
*/

-- Create rate limits table
CREATE TABLE IF NOT EXISTS public.user_rate_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Message limits
  messages_sent_minute INTEGER DEFAULT 0,
  messages_sent_day INTEGER DEFAULT 0,
  messages_last_reset_minute TIMESTAMPTZ DEFAULT NOW(),
  messages_last_reset_day TIMESTAMPTZ DEFAULT NOW(),
  
  -- Like limits
  likes_sent_minute INTEGER DEFAULT 0,
  likes_sent_day INTEGER DEFAULT 0,
  likes_last_reset_minute TIMESTAMPTZ DEFAULT NOW(),
  likes_last_reset_day TIMESTAMPTZ DEFAULT NOW(),
  
  -- Gift limits
  gifts_sent_minute INTEGER DEFAULT 0,
  gifts_sent_day INTEGER DEFAULT 0,
  gifts_last_reset_minute TIMESTAMPTZ DEFAULT NOW(),
  gifts_last_reset_day TIMESTAMPTZ DEFAULT NOW(),
  
  -- General API limits
  api_calls_minute INTEGER DEFAULT 0,
  api_calls_hour INTEGER DEFAULT 0,
  api_calls_day INTEGER DEFAULT 0,
  api_last_reset_minute TIMESTAMPTZ DEFAULT NOW(),
  api_last_reset_hour TIMESTAMPTZ DEFAULT NOW(),
  api_last_reset_day TIMESTAMPTZ DEFAULT NOW(),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rate limits
CREATE POLICY "Users can view own rate limits"
  ON public.user_rate_limits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_id ON public.user_rate_limits(user_id);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_and_update_rate_limit(
  p_user_id UUID,
  p_action_type TEXT, -- 'message', 'like', 'gift', 'api'
  p_increment BOOLEAN DEFAULT TRUE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit_minute INTEGER;
  v_limit_day INTEGER;
  v_current_minute INTEGER;
  v_current_day INTEGER;
  v_last_reset_minute TIMESTAMPTZ;
  v_last_reset_day TIMESTAMPTZ;
  v_minutes_since_reset INTEGER;
  v_days_since_reset INTEGER;
BEGIN
  -- Define rate limits
  CASE p_action_type
    WHEN 'message' THEN
      v_limit_minute := 10;
      v_limit_day := 500;
    WHEN 'like' THEN
      v_limit_minute := 30;
      v_limit_day := 1000;
    WHEN 'gift' THEN
      v_limit_minute := 5;
      v_limit_day := 50;
    WHEN 'api' THEN
      v_limit_minute := 100;
      v_limit_day := 10000;
    ELSE
      RETURN json_build_object(
        'allowed', false,
        'error', 'Invalid action type',
        'error_code', 'INVALID_ACTION'
      );
  END CASE;
  
  -- Create rate limit record if doesn't exist
  INSERT INTO user_rate_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Lock row for update
  SELECT
    CASE p_action_type
      WHEN 'message' THEN messages_sent_minute
      WHEN 'like' THEN likes_sent_minute
      WHEN 'gift' THEN gifts_sent_minute
      WHEN 'api' THEN api_calls_minute
    END,
    CASE p_action_type
      WHEN 'message' THEN messages_sent_day
      WHEN 'like' THEN likes_sent_day
      WHEN 'gift' THEN gifts_sent_day
      WHEN 'api' THEN api_calls_day
    END,
    CASE p_action_type
      WHEN 'message' THEN messages_last_reset_minute
      WHEN 'like' THEN likes_last_reset_minute
      WHEN 'gift' THEN gifts_last_reset_minute
      WHEN 'api' THEN api_last_reset_minute
    END,
    CASE p_action_type
      WHEN 'message' THEN messages_last_reset_day
      WHEN 'like' THEN likes_last_reset_day
      WHEN 'gift' THEN gifts_last_reset_day
      WHEN 'api' THEN api_last_reset_day
    END
  INTO v_current_minute, v_current_day, v_last_reset_minute, v_last_reset_day
  FROM user_rate_limits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Calculate time since last reset
  v_minutes_since_reset := EXTRACT(EPOCH FROM (NOW() - v_last_reset_minute)) / 60;
  v_days_since_reset := EXTRACT(EPOCH FROM (NOW() - v_last_reset_day)) / 86400;
  
  -- Reset counters if time window has passed
  IF v_minutes_since_reset >= 1 THEN
    v_current_minute := 0;
    v_last_reset_minute := NOW();
  END IF;
  
  IF v_days_since_reset >= 1 THEN
    v_current_day := 0;
    v_last_reset_day := NOW();
  END IF;
  
  -- Check limits
  IF v_current_minute >= v_limit_minute THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Rate limit exceeded for minute window',
      'error_code', 'RATE_LIMIT_MINUTE',
      'limit', v_limit_minute,
      'reset_in_seconds', 60 - (v_minutes_since_reset * 60)
    );
  END IF;
  
  IF v_current_day >= v_limit_day THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Rate limit exceeded for day window',
      'error_code', 'RATE_LIMIT_DAY',
      'limit', v_limit_day,
      'reset_in_seconds', (86400 - (v_days_since_reset * 86400))
    );
  END IF;
  
  -- Increment counters if requested
  IF p_increment THEN
    v_current_minute := v_current_minute + 1;
    v_current_day := v_current_day + 1;
    
    -- Update the counters
    UPDATE user_rate_limits
    SET
      messages_sent_minute = CASE WHEN p_action_type = 'message' THEN v_current_minute ELSE messages_sent_minute END,
      messages_sent_day = CASE WHEN p_action_type = 'message' THEN v_current_day ELSE messages_sent_day END,
      messages_last_reset_minute = CASE WHEN p_action_type = 'message' THEN v_last_reset_minute ELSE messages_last_reset_minute END,
      messages_last_reset_day = CASE WHEN p_action_type = 'message' THEN v_last_reset_day ELSE messages_last_reset_day END,
      
      likes_sent_minute = CASE WHEN p_action_type = 'like' THEN v_current_minute ELSE likes_sent_minute END,
      likes_sent_day = CASE WHEN p_action_type = 'like' THEN v_current_day ELSE likes_sent_day END,
      likes_last_reset_minute = CASE WHEN p_action_type = 'like' THEN v_last_reset_minute ELSE likes_last_reset_minute END,
      likes_last_reset_day = CASE WHEN p_action_type = 'like' THEN v_last_reset_day ELSE likes_last_reset_day END,
      
      gifts_sent_minute = CASE WHEN p_action_type = 'gift' THEN v_current_minute ELSE gifts_sent_minute END,
      gifts_sent_day = CASE WHEN p_action_type = 'gift' THEN v_current_day ELSE gifts_sent_day END,
      gifts_last_reset_minute = CASE WHEN p_action_type = 'gift' THEN v_last_reset_minute ELSE gifts_last_reset_minute END,
      gifts_last_reset_day = CASE WHEN p_action_type = 'gift' THEN v_last_reset_day ELSE gifts_last_reset_day END,
      
      api_calls_minute = CASE WHEN p_action_type = 'api' THEN v_current_minute ELSE api_calls_minute END,
      api_calls_day = CASE WHEN p_action_type = 'api' THEN v_current_day ELSE api_calls_day END,
      api_last_reset_minute = CASE WHEN p_action_type = 'api' THEN v_last_reset_minute ELSE api_last_reset_minute END,
      api_last_reset_day = CASE WHEN p_action_type = 'api' THEN v_last_reset_day ELSE api_last_reset_day END,
      
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  -- Return success
  RETURN json_build_object(
    'allowed', true,
    'current_minute', v_current_minute,
    'current_day', v_current_day,
    'limit_minute', v_limit_minute,
    'limit_day', v_limit_day,
    'remaining_minute', v_limit_minute - v_current_minute,
    'remaining_day', v_limit_day - v_current_day
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_and_update_rate_limit(UUID, TEXT, BOOLEAN) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.check_and_update_rate_limit IS 'Check if user is within rate limits and optionally increment counter';
