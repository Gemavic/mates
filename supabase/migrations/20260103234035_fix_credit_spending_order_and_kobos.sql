/*
  # Fix Credit Spending Order and Add Kobos Support
  
  1. Problem
    - Current order: purchased credits first, then complimentary
    - Missing: kobos not included in spending logic
    - User requirement: complimentary → kobos → purchased
  
  2. Solution
    - Update spend_credits_atomic to follow correct order
    - Include total_kobos in spending calculation
    - Spend in order: complimentary_credits → total_kobos → purchased_credits
*/

CREATE OR REPLACE FUNCTION public.spend_credits_atomic(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_category text DEFAULT 'general'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_complimentary INTEGER;
  v_purchased INTEGER;
  v_kobos INTEGER;
  v_total INTEGER;
  v_new_complimentary INTEGER;
  v_new_kobos INTEGER;
  v_new_purchased INTEGER;
  v_transaction_id UUID;
  v_remaining INTEGER;
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
  SELECT complimentary_credits, purchased_credits, total_kobos
  INTO v_complimentary, v_purchased, v_kobos
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

  -- Calculate total available credits
  v_total := v_complimentary + v_kobos + v_purchased;

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

  -- Calculate new balances following order: complimentary → kobos → purchased
  v_remaining := p_amount;
  
  -- First, spend complimentary credits
  IF v_complimentary >= v_remaining THEN
    v_new_complimentary := v_complimentary - v_remaining;
    v_new_kobos := v_kobos;
    v_new_purchased := v_purchased;
    v_remaining := 0;
  ELSE
    v_remaining := v_remaining - v_complimentary;
    v_new_complimentary := 0;
    
    -- Second, spend kobos
    IF v_kobos >= v_remaining THEN
      v_new_kobos := v_kobos - v_remaining;
      v_new_purchased := v_purchased;
      v_remaining := 0;
    ELSE
      v_remaining := v_remaining - v_kobos;
      v_new_kobos := 0;
      
      -- Finally, spend purchased credits
      v_new_purchased := v_purchased - v_remaining;
      v_remaining := 0;
    END IF;
  END IF;

  -- Update credit balance
  UPDATE user_credits
  SET
    complimentary_credits = v_new_complimentary,
    total_kobos = v_new_kobos,
    purchased_credits = v_new_purchased,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log the transaction (without category column that doesn't exist)
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    created_at
  )
  VALUES (
    p_user_id,
    'spend',
    p_amount,
    p_description || CASE WHEN p_category IS NOT NULL AND p_category != 'general' THEN ' (' || p_category || ')' ELSE '' END,
    NOW()
  )
  RETURNING id INTO v_transaction_id;

  -- Return success with transaction details
  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'amount_spent', p_amount,
    'previous_balance', v_total,
    'new_balance', v_new_complimentary + v_new_kobos + v_new_purchased,
    'complimentary_credits', v_new_complimentary,
    'kobos', v_new_kobos,
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
$function$;
