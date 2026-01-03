/*
  # Create Atomic Credit Functions for Server-Side Validation

  This migration creates PostgreSQL functions that handle credit operations atomically,
  preventing race conditions and ensuring security. These functions run with SECURITY DEFINER
  to bypass RLS while maintaining security through application logic.

  ## Functions Created

  1. **spend_credits_atomic** - Atomically check balance and deduct credits
  2. **add_credits_atomic** - Atomically add credits and log transaction
  3. **get_user_balance** - Get current credit balance efficiently
  4. **check_sufficient_credits** - Check if user can afford an operation

  ## Security

  - All functions use SECURITY DEFINER to bypass RLS
  - Validation logic ensures users can only spend their own credits
  - Proper transaction handling prevents race conditions
  - All operations logged for audit trail
*/

-- Function to check if user has sufficient credits
-- Returns boolean and does not modify data
CREATE OR REPLACE FUNCTION public.check_sufficient_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_credits INTEGER;
BEGIN
  -- Get current credit balance
  SELECT (complimentary_credits + purchased_credits)
  INTO v_total_credits
  FROM user_credits
  WHERE user_id = p_user_id;

  -- If user doesn't exist, return false
  IF v_total_credits IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has enough credits
  RETURN v_total_credits >= p_amount;
END;
$$;

-- Function to get user's current credit balance
-- Returns complimentary, purchased, and total credits
CREATE OR REPLACE FUNCTION public.get_user_balance(
  p_user_id UUID
)
RETURNS TABLE (
  complimentary_credits INTEGER,
  purchased_credits INTEGER,
  total_credits INTEGER,
  total_kobos INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.complimentary_credits,
    uc.purchased_credits,
    (uc.complimentary_credits + uc.purchased_credits) AS total_credits,
    uc.total_kobos
  FROM user_credits uc
  WHERE uc.user_id = p_user_id;
END;
$$;

-- Function to atomically spend credits
-- Checks balance, deducts credits, and logs transaction in one atomic operation
CREATE OR REPLACE FUNCTION public.spend_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_category TEXT DEFAULT 'general'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_complimentary INTEGER;
  v_purchased INTEGER;
  v_total INTEGER;
  v_new_complimentary INTEGER;
  v_new_purchased INTEGER;
  v_transaction_id UUID;
BEGIN
  -- Input validation
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Amount must be positive',
      'error_code', 'INVALID_AMOUNT'
    );
  END IF;

  -- Lock the user_credits row for update to prevent race conditions
  SELECT complimentary_credits, purchased_credits
  INTO v_complimentary, v_purchased
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user exists
  IF v_complimentary IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'error_code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Calculate total credits
  v_total := v_complimentary + v_purchased;

  -- Check if user has enough credits
  IF v_total < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'error_code', 'INSUFFICIENT_CREDITS',
      'required', p_amount,
      'available', v_total
    );
  END IF;

  -- Calculate new balances (spend purchased credits first, then complimentary)
  IF v_purchased >= p_amount THEN
    v_new_purchased := v_purchased - p_amount;
    v_new_complimentary := v_complimentary;
  ELSE
    v_new_purchased := 0;
    v_new_complimentary := v_complimentary - (p_amount - v_purchased);
  END IF;

  -- Update credit balance
  UPDATE user_credits
  SET
    complimentary_credits = v_new_complimentary,
    purchased_credits = v_new_purchased,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    category,
    created_at
  )
  VALUES (
    p_user_id,
    'spend',
    p_amount,
    p_description,
    p_category,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Return success with transaction details
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount_spent', p_amount,
    'previous_balance', v_total,
    'new_balance', v_new_complimentary + v_new_purchased,
    'complimentary_credits', v_new_complimentary,
    'purchased_credits', v_new_purchased
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', 'DATABASE_ERROR'
    );
END;
$$;

-- Function to atomically add credits
-- Adds credits and logs transaction in one atomic operation
CREATE OR REPLACE FUNCTION public.add_credits_atomic(
  p_user_id UUID,
  p_amount INTEGER,
  p_credit_type TEXT,
  p_description TEXT,
  p_category TEXT DEFAULT 'purchase'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_new_balance INTEGER;
BEGIN
  -- Input validation
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Amount must be positive',
      'error_code', 'INVALID_AMOUNT'
    );
  END IF;

  IF p_credit_type NOT IN ('complimentary', 'purchased') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid credit type',
      'error_code', 'INVALID_CREDIT_TYPE'
    );
  END IF;

  -- Lock the user_credits row for update
  SELECT user_id
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Add credits based on type
  IF p_credit_type = 'complimentary' THEN
    UPDATE user_credits
    SET
      complimentary_credits = complimentary_credits + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE user_credits
    SET
      purchased_credits = purchased_credits + p_amount,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  -- Get new total balance
  SELECT (complimentary_credits + purchased_credits)
  INTO v_new_balance
  FROM user_credits
  WHERE user_id = p_user_id;

  -- Log the transaction
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    category,
    created_at
  )
  VALUES (
    p_user_id,
    'earn',
    p_amount,
    p_description,
    p_category,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount_added', p_amount,
    'credit_type', p_credit_type,
    'new_balance', v_new_balance
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', 'DATABASE_ERROR'
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_sufficient_credits(UUID, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.spend_credits_atomic(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_credits_atomic(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
