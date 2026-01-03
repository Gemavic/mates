/*
  # Fix add_credits_atomic Function
  
  1. Problem
    - Function tries to insert `category` column into credit_transactions
    - But `category` column doesn't exist in the table
    - This causes all credit awards to fail
  
  2. Solution
    - Update the function to remove the category parameter from INSERT
    - Keep the category parameter in function signature for backwards compatibility
    - Just don't use it in the INSERT statement
*/

CREATE OR REPLACE FUNCTION public.add_credits_atomic(
  p_user_id uuid,
  p_amount integer,
  p_credit_type text,
  p_description text,
  p_category text DEFAULT 'purchase'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  PERFORM 1
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

  -- Log the transaction (without category column)
  INSERT INTO credit_transactions (
    user_id,
    transaction_type,
    amount,
    description,
    created_at
  )
  VALUES (
    p_user_id,
    'earn',
    p_amount,
    p_description || CASE WHEN p_category IS NOT NULL THEN ' (' || p_category || ')' ELSE '' END,
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
$function$;
