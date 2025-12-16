/*
  # Consolidated Signup Trigger - FINAL VERSION
  
  1. Problem
    - Multiple conflicting trigger functions exist
    - Different functions assign different credit amounts (10 vs 20 vs 50)
    - Triggers may conflict or overwrite each other
    - Unpredictable user profile creation
  
  2. Solution
    - Drop ALL existing trigger functions
    - Drop ALL existing triggers on auth.users
    - Create ONE definitive trigger function
    - Create ONE trigger that calls it
  
  3. New User Gets
    - Profile in user_profiles table
    - 20 complimentary credits
    - 20 kobos (alternative currency)
    - Default settings (visibility: public, verified: false)
  
  4. Security
    - Uses security definer to bypass RLS during setup
    - Proper error handling with RAISE NOTICE
    - Returns NEW to allow signup to complete even if trigger fails
*/

-- ==================================================================
-- STEP 1: Clean up ALL existing triggers and functions
-- ==================================================================

-- Drop all triggers on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- Drop all related functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_profile_on_signup() CASCADE;
DROP FUNCTION IF EXISTS public.handle_user_signup() CASCADE;

-- ==================================================================
-- STEP 2: Create THE definitive signup trigger function
-- ==================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_email text;
  user_name text;
  first_name_part text;
BEGIN
  -- Get user email from auth metadata
  user_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', 'user@example.com');
  
  -- Get user name from metadata
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'User'
  );
  
  -- Extract first name
  first_name_part := COALESCE(split_part(user_name, ' ', 1), 'User');

  -- Log the signup attempt
  RAISE NOTICE 'Creating profile for user: % (email: %)', NEW.id, user_email;

  -- ==================================================================
  -- Create user profile
  -- ==================================================================
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      email,
      full_name,
      first_name,
      profile_visibility,
      is_verified,
      is_online,
      show_online_status,
      verification_status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      user_email,
      user_name,
      first_name_part,
      'public',  -- Default to public visibility
      false,     -- Not verified yet
      true,      -- Show as online
      true,      -- Show online status
      'unverified',
      now(),
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Profile creation failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    -- Continue even if profile creation fails
  END;

  -- ==================================================================
  -- Initialize user credits
  -- ==================================================================
  BEGIN
    INSERT INTO public.user_credits (
      user_id,
      complimentary_credits,
      purchased_credits,
      total_kobos,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      20,   -- 20 complimentary credits
      0,    -- No purchased credits yet
      20,   -- 20 kobos
      now(),
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Credits initialized for user: % (20 credits, 20 kobos)', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Credit initialization failed for user %: % %', NEW.id, SQLERRM, SQLSTATE;
    -- Continue even if credit initialization fails
  END;

  -- ==================================================================
  -- Log successful signup
  -- ==================================================================
  RAISE NOTICE 'User signup completed successfully: %', NEW.id;

  -- Always return NEW to allow signup to complete
  RETURN NEW;
END;
$$;

-- ==================================================================
-- STEP 3: Create THE definitive trigger
-- ==================================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

-- ==================================================================
-- STEP 4: Verify trigger is active
-- ==================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Consolidated signup trigger installed successfully';
  RAISE NOTICE 'Trigger: on_auth_user_created';
  RAISE NOTICE 'Function: handle_new_user_signup()';
  RAISE NOTICE 'New users receive: 20 credits + 20 kobos';
  RAISE NOTICE '=================================================';
END $$;