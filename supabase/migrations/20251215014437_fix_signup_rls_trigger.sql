/*
  # Fix RLS and Trigger for Signup

  ## Problem
  RLS policies are blocking the database trigger from creating user profiles during signup.
  The trigger runs with the security context of the trigger, but RLS policies only allow
  authenticated users to insert their own profiles - creating a chicken-and-egg problem.

  ## Solution
  1. Drop existing trigger and function
  2. Add default values to all columns in user_profiles table
  3. Create RLS policies that allow service_role to bypass restrictions
  4. Create new trigger function with SECURITY DEFINER and proper error handling
  5. Recreate the trigger

  ## Changes Made
  - Added defaults for: verification_status, profile_visibility, is_verified, is_online, show_online_status
  - Added service_role bypass policies for INSERT, UPDATE, SELECT, DELETE
  - Recreated handle_new_user() function with SECURITY DEFINER
  - Added error handling to trigger function
  - Added ON CONFLICT DO NOTHING for safe inserts
*/

-- Step 1: Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 2: Add default values to user_profiles columns (if not already present)
DO $$
BEGIN
  -- Ensure verification_status has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN verification_status SET DEFAULT 'not_started';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'verification_status default already set or column does not exist';
  END;

  -- Ensure profile_visibility has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN profile_visibility SET DEFAULT 'public';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'profile_visibility default already set or column does not exist';
  END;

  -- Ensure is_verified has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN is_verified SET DEFAULT false;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'is_verified default already set or column does not exist';
  END;

  -- Ensure is_online has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN is_online SET DEFAULT false;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'is_online default already set or column does not exist';
  END;

  -- Ensure show_online_status has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN show_online_status SET DEFAULT true;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'show_online_status default already set or column does not exist';
  END;

  -- Ensure bio has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN bio SET DEFAULT '';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'bio default already set or column does not exist';
  END;

  -- Ensure interests has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN interests SET DEFAULT '{}';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'interests default already set or column does not exist';
  END;

  -- Ensure looking_for has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN looking_for SET DEFAULT 'serious';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'looking_for default already set or column does not exist';
  END;

  -- Ensure distance_preference has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN distance_preference SET DEFAULT 50;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'distance_preference default already set or column does not exist';
  END;

  -- Ensure age_range_min has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN age_range_min SET DEFAULT 18;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'age_range_min default already set or column does not exist';
  END;

  -- Ensure age_range_max has a default
  BEGIN
    ALTER TABLE public.user_profiles
    ALTER COLUMN age_range_max SET DEFAULT 99;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'age_range_max default already set or column does not exist';
  END;
END $$;

-- Step 3: Create RLS policies that allow service_role to bypass restrictions
DROP POLICY IF EXISTS "Service role has full access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can insert user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can update user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can delete user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can select user_profiles" ON public.user_profiles;

-- Create service_role bypass policies for user_profiles
CREATE POLICY "Service role can insert user_profiles"
  ON public.user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select user_profiles"
  ON public.user_profiles
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update user_profiles"
  ON public.user_profiles
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete user_profiles"
  ON public.user_profiles
  FOR DELETE
  TO service_role
  USING (true);

-- Also add service_role policies for user_credits
DROP POLICY IF EXISTS "Service role can insert user_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can select user_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can update user_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can delete user_credits" ON public.user_credits;

CREATE POLICY "Service role can insert user_credits"
  ON public.user_credits
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select user_credits"
  ON public.user_credits
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update user_credits"
  ON public.user_credits
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete user_credits"
  ON public.user_credits
  FOR DELETE
  TO service_role
  USING (true);

-- Step 4: Create new trigger function with SECURITY DEFINER and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  full_name_value TEXT;
  email_value TEXT;
  error_message TEXT;
BEGIN
  RAISE LOG 'Creating profile for new user: %', NEW.id;

  BEGIN
    full_name_value := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1),
      'User'
    );
  EXCEPTION WHEN OTHERS THEN
    full_name_value := 'User';
    RAISE LOG 'Error extracting full_name for user %: %', NEW.id, SQLERRM;
  END;

  email_value := COALESCE(NEW.email, '');

  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      email,
      full_name,
      first_name,
      is_verified,
      verification_status,
      is_online,
      profile_visibility,
      show_online_status,
      bio,
      interests,
      looking_for,
      distance_preference,
      age_range_min,
      age_range_max,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      email_value,
      full_name_value,
      SPLIT_PART(full_name_value, ' ', 1),
      false,
      'not_started',
      false,
      'public',
      true,
      '',
      '{}',
      'serious',
      50,
      18,
      99,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE LOG 'Successfully created profile for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    RAISE WARNING 'Failed to create user_profile for user %: %', NEW.id, error_message;
  END;

  BEGIN
    INSERT INTO public.user_credits (
      user_id,
      complimentary_credits,
      purchased_credits,
      total_kobos,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      10,
      0,
      10,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE LOG 'Successfully created credits for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    RAISE WARNING 'Failed to create user_credits for user %: %', NEW.id, error_message;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Unexpected error in handle_new_user() for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- Step 5: Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created successfully created';
  ELSE
    RAISE WARNING 'Failed to create trigger on_auth_user_created';
  END IF;
END $$;

COMMENT ON FUNCTION public.handle_new_user() IS
'Automatically creates user profile and credits when a new user signs up.
Uses SECURITY DEFINER to bypass RLS policies. Includes error handling to prevent signup failures.';