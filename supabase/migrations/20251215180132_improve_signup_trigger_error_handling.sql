/*
  # Improve Signup Trigger Error Handling

  The trigger now includes:
  - Better error handling with exception catching
  - Logging for debugging
  - Ensures user creation succeeds even if profile/credits fail
  - Uses ON CONFLICT to handle duplicate inserts gracefully

  ## Changes
  - Add exception handling to prevent signup failures
  - Improve robustness of profile and credit creation
  - Return NEW even if inserts fail (allows user creation to succeed)
*/

CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Create user profile (non-blocking)
  BEGIN
    INSERT INTO user_profiles (user_id, email, full_name, first_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(SPLIT_PART(NEW.raw_user_meta_data->>'full_name', ' ', 1), '')
    )
    ON CONFLICT (user_id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      first_name = EXCLUDED.first_name,
      updated_at = now();
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Create user credits (non-blocking)
  BEGIN
    INSERT INTO user_credits (user_id, complimentary_credits, purchased_credits, total_kobos)
    VALUES (NEW.id, 50, 0, 0)
    ON CONFLICT (user_id) DO UPDATE SET
      complimentary_credits = GREATEST(user_credits.complimentary_credits, 50);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user credits for user %: %', NEW.id, SQLERRM;
  END;

  -- Always return NEW to allow user creation to succeed
  RETURN NEW;
END;
$$;