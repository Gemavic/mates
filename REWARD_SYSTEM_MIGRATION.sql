/*
  # Create Comprehensive Reward System for Staff Portal

  This SQL should be applied to your Supabase database via the Supabase Dashboard SQL Editor.

  1. New Tables
    - `reward_rules` - Automated reward rules
    - `reward_history` - Track all rewards awarded
    - `user_achievements` - Track user achievements

  2. Enhanced Functions
    - `award_bonus_credits` - Award complimentary credits with reason
    - `award_purchased_credits` - Award purchased credits
    - `award_kobos` - Award kobos (platform currency)
    - `award_combo_reward` - Award credits + kobos together
    - `check_and_award_automated_rewards` - Process automated rewards

  3. Security
    - RLS policies for staff access only
    - Audit trail for all rewards
    - Prevent duplicate automated rewards
*/

-- Create reward history table
CREATE TABLE IF NOT EXISTS reward_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reward_type text NOT NULL CHECK (reward_type IN ('bonus_credits', 'purchased_credits', 'kobos', 'combo')),
  credits_awarded integer DEFAULT 0,
  kobos_awarded integer DEFAULT 0,
  reason text NOT NULL,
  awarded_by text NOT NULL CHECK (awarded_by IN ('staff', 'system', 'achievement', 'promotion')),
  staff_id uuid REFERENCES staff_accounts(id) ON DELETE SET NULL,
  rule_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create automated reward rules table
CREATE TABLE IF NOT EXISTS reward_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('signup_bonus', 'daily_login', 'profile_completion', 'referral', 'milestone', 'promotion', 'custom')),
  is_active boolean DEFAULT true,
  trigger_condition jsonb NOT NULL,
  reward_config jsonb NOT NULL,
  max_awards_per_user integer DEFAULT 1,
  valid_from timestamptz DEFAULT now(),
  valid_until timestamptz,
  created_by uuid REFERENCES staff_accounts(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type text NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  rule_id uuid REFERENCES reward_rules(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_type, rule_id)
);

-- Enable RLS
ALTER TABLE reward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reward_history
CREATE POLICY "Users can view own reward history"
  ON reward_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all reward history"
  ON reward_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

-- RLS Policies for reward_rules
CREATE POLICY "Anyone can view active rules"
  ON reward_rules FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Staff can manage rules"
  ON reward_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE id = auth.uid()
      AND is_active = true
      AND 'manage_rewards' = ANY(permissions)
    )
  );

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff can view all achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_accounts
      WHERE id = auth.uid()
      AND is_active = true
    )
  );

-- Function to award bonus (complimentary) credits
CREATE OR REPLACE FUNCTION award_bonus_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_staff_id uuid DEFAULT NULL,
  p_awarded_by text DEFAULT 'staff'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
  v_reward_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount must be greater than 0'
    );
  END IF;

  UPDATE user_credits
  SET
    complimentary_credits = complimentary_credits + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING (complimentary_credits + purchased_credits) INTO v_new_balance;

  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, complimentary_credits, purchased_credits, total_kobos)
    VALUES (p_user_id, p_amount, 0, 0)
    RETURNING (complimentary_credits + purchased_credits) INTO v_new_balance;
  END IF;

  INSERT INTO reward_history (
    user_id,
    reward_type,
    credits_awarded,
    reason,
    awarded_by,
    staff_id
  )
  VALUES (
    p_user_id,
    'bonus_credits',
    p_amount,
    p_reason,
    p_awarded_by,
    p_staff_id
  )
  RETURNING id INTO v_reward_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'credits_awarded', p_amount,
    'reward_id', v_reward_id
  );
END;
$$;

-- Function to award purchased credits
CREATE OR REPLACE FUNCTION award_purchased_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
  v_reward_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount must be greater than 0'
    );
  END IF;

  UPDATE user_credits
  SET
    purchased_credits = purchased_credits + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING (complimentary_credits + purchased_credits) INTO v_new_balance;

  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, complimentary_credits, purchased_credits, total_kobos)
    VALUES (p_user_id, 0, p_amount, 0)
    RETURNING (complimentary_credits + purchased_credits) INTO v_new_balance;
  END IF;

  INSERT INTO reward_history (
    user_id,
    reward_type,
    credits_awarded,
    reason,
    awarded_by,
    staff_id
  )
  VALUES (
    p_user_id,
    'purchased_credits',
    p_amount,
    p_reason,
    'staff',
    p_staff_id
  )
  RETURNING id INTO v_reward_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'credits_awarded', p_amount,
    'reward_id', v_reward_id
  );
END;
$$;

-- Function to award kobos
CREATE OR REPLACE FUNCTION award_kobos(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_staff_id uuid DEFAULT NULL,
  p_awarded_by text DEFAULT 'staff'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
  v_reward_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amount must be greater than 0'
    );
  END IF;

  UPDATE user_credits
  SET
    total_kobos = total_kobos + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING total_kobos INTO v_new_balance;

  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, complimentary_credits, purchased_credits, total_kobos)
    VALUES (p_user_id, 0, 0, p_amount)
    RETURNING total_kobos INTO v_new_balance;
  END IF;

  INSERT INTO reward_history (
    user_id,
    reward_type,
    kobos_awarded,
    reason,
    awarded_by,
    staff_id
  )
  VALUES (
    p_user_id,
    'kobos',
    p_amount,
    p_reason,
    p_awarded_by,
    p_staff_id
  )
  RETURNING id INTO v_reward_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'kobos_awarded', p_amount,
    'reward_id', v_reward_id
  );
END;
$$;

-- Function to award combo reward
CREATE OR REPLACE FUNCTION award_combo_reward(
  p_user_id uuid,
  p_credits integer,
  p_kobos integer,
  p_credit_type text,
  p_reason text,
  p_staff_id uuid DEFAULT NULL,
  p_awarded_by text DEFAULT 'staff'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_credit_balance integer;
  v_new_kobo_balance integer;
  v_reward_id uuid;
BEGIN
  IF p_credits < 0 OR p_kobos < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Amounts cannot be negative'
    );
  END IF;

  IF p_credits = 0 AND p_kobos = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Must award at least credits or kobos'
    );
  END IF;

  IF p_credit_type = 'complimentary' THEN
    UPDATE user_credits
    SET
      complimentary_credits = complimentary_credits + p_credits,
      total_kobos = total_kobos + p_kobos,
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING (complimentary_credits + purchased_credits), total_kobos
    INTO v_new_credit_balance, v_new_kobo_balance;
  ELSE
    UPDATE user_credits
    SET
      purchased_credits = purchased_credits + p_credits,
      total_kobos = total_kobos + p_kobos,
      updated_at = now()
    WHERE user_id = p_user_id
    RETURNING (complimentary_credits + purchased_credits), total_kobos
    INTO v_new_credit_balance, v_new_kobo_balance;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO user_credits (user_id, complimentary_credits, purchased_credits, total_kobos)
    VALUES (
      p_user_id,
      CASE WHEN p_credit_type = 'complimentary' THEN p_credits ELSE 0 END,
      CASE WHEN p_credit_type = 'purchased' THEN p_credits ELSE 0 END,
      p_kobos
    )
    RETURNING (complimentary_credits + purchased_credits), total_kobos
    INTO v_new_credit_balance, v_new_kobo_balance;
  END IF;

  INSERT INTO reward_history (
    user_id,
    reward_type,
    credits_awarded,
    kobos_awarded,
    reason,
    awarded_by,
    staff_id,
    metadata
  )
  VALUES (
    p_user_id,
    'combo',
    p_credits,
    p_kobos,
    p_reason,
    p_awarded_by,
    p_staff_id,
    jsonb_build_object('credit_type', p_credit_type)
  )
  RETURNING id INTO v_reward_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_credit_balance', v_new_credit_balance,
    'new_kobo_balance', v_new_kobo_balance,
    'credits_awarded', p_credits,
    'kobos_awarded', p_kobos,
    'reward_id', v_reward_id
  );
END;
$$;

-- Function to check and award automated rewards
CREATE OR REPLACE FUNCTION check_and_award_automated_rewards(
  p_user_id uuid,
  p_trigger_type text,
  p_trigger_data jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule record;
  v_rewards_awarded jsonb[] := '{}';
  v_result jsonb;
  v_award_count integer;
  v_credits integer;
  v_kobos integer;
BEGIN
  FOR v_rule IN
    SELECT * FROM reward_rules
    WHERE is_active = true
    AND rule_type = p_trigger_type
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
  LOOP
    SELECT COUNT(*) INTO v_award_count
    FROM reward_history
    WHERE user_id = p_user_id
    AND rule_id = v_rule.id;

    IF v_award_count >= v_rule.max_awards_per_user THEN
      CONTINUE;
    END IF;

    v_credits := COALESCE((v_rule.reward_config->>'credits')::integer, 0);
    v_kobos := COALESCE((v_rule.reward_config->>'kobos')::integer, 0);

    IF v_credits > 0 AND v_kobos > 0 THEN
      SELECT award_combo_reward(
        p_user_id,
        v_credits,
        v_kobos,
        COALESCE(v_rule.reward_config->>'credit_type', 'complimentary'),
        v_rule.rule_name,
        NULL,
        'system'
      ) INTO v_result;
    ELSIF v_credits > 0 THEN
      SELECT award_bonus_credits(
        p_user_id,
        v_credits,
        v_rule.rule_name,
        NULL,
        'system'
      ) INTO v_result;
    ELSIF v_kobos > 0 THEN
      SELECT award_kobos(
        p_user_id,
        v_kobos,
        v_rule.rule_name,
        NULL,
        'system'
      ) INTO v_result;
    END IF;

    UPDATE reward_history
    SET rule_id = v_rule.id
    WHERE id = (v_result->>'reward_id')::uuid;

    INSERT INTO user_achievements (user_id, achievement_type, rule_id, metadata)
    VALUES (p_user_id, p_trigger_type, v_rule.id, p_trigger_data)
    ON CONFLICT (user_id, achievement_type, rule_id) DO NOTHING;

    v_rewards_awarded := v_rewards_awarded || v_result;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'rewards_awarded', v_rewards_awarded,
    'total_rules_processed', array_length(v_rewards_awarded, 1)
  );
END;
$$;

-- Create default automated reward rules
INSERT INTO reward_rules (
  rule_name,
  rule_type,
  trigger_condition,
  reward_config,
  max_awards_per_user,
  is_active
) VALUES
(
  'Welcome Bonus',
  'signup_bonus',
  '{"event": "user_signup"}'::jsonb,
  '{"credits": 20, "kobos": 20, "credit_type": "complimentary"}'::jsonb,
  1,
  true
),
(
  'Profile Completion Bonus',
  'profile_completion',
  '{"profile_complete_percentage": 100}'::jsonb,
  '{"credits": 50, "kobos": 50, "credit_type": "complimentary"}'::jsonb,
  1,
  true
),
(
  'Daily Login Streak (7 days)',
  'daily_login',
  '{"consecutive_days": 7}'::jsonb,
  '{"credits": 30, "kobos": 30, "credit_type": "complimentary"}'::jsonb,
  999,
  true
),
(
  'First Verification',
  'milestone',
  '{"event": "first_verification"}'::jsonb,
  '{"credits": 100, "kobos": 100, "credit_type": "complimentary"}'::jsonb,
  1,
  true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reward_history_user_id ON reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_created_at ON reward_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_rules_type_active ON reward_rules(rule_type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_type ON user_achievements(user_id, achievement_type);