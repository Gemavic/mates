/*
  # Fix Signup Trigger - User Credits Column

  The trigger function was trying to insert into `user_credits.balance` which doesn't exist.
  The table actually has: complimentary_credits, purchased_credits, and total_kobos.

  ## Changes
  - Update trigger function to use correct column names
  - Set complimentary_credits to 50 for new users
  - Initialize other credit fields properly
*/

CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, full_name, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1), '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_credits (user_id, complimentary_credits, purchased_credits, total_kobos)
  VALUES (NEW.id, 50, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;