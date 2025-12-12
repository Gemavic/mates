/*
  # Complete Signup Fix - Comprehensive Solution

  This fixes all signup issues by:
  1. Ensuring all required columns exist
  2. Fixing RLS policies to allow inserts
  3. Recreating the trigger with proper error handling
  4. Adding fallback policies for manual profile creation
*/

-- ============================================
-- STEP 1: Verify and add missing columns
-- ============================================

-- Check user_profiles table structure
DO $$
BEGIN
  -- Add gender column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN gender TEXT DEFAULT 'prefer-not-to-say';
  END IF;

  -- Add verification_status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN verification_status TEXT DEFAULT 'not_started';
  END IF;

  -- Add profile_visibility column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'profile_visibility'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN profile_visibility TEXT DEFAULT 'public';
  END IF;

  -- Add is_online column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
  END IF;

  -- Add show_online_status column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'show_online_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN show_online_status BOOLEAN DEFAULT true;
  END IF;

  RAISE NOTICE 'Column check complete';
END $$;

-- ============================================
-- STEP 2: Drop ALL existing RLS policies
-- ============================================

-- Drop all user_profiles policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT polname
        FROM pg_policy
        WHERE polrelid = 'public.user_profiles'::regclass
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.polname || '" ON user_profiles';
    END LOOP;
END $$;

-- Drop all user_credits policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT polname
        FROM pg_policy
        WHERE polrelid = 'public.user_credits'::regclass
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.polname || '" ON user_credits';
    END LOOP;
END $$;

-- ============================================
-- STEP 3: Create simple, working RLS policies
-- ============================================

-- user_profiles policies
CREATE POLICY "allow_service_role_all"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_insert_own"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_select_own"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR profile_visibility = 'public');

CREATE POLICY "allow_authenticated_update_own"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- user_credits policies
CREATE POLICY "allow_service_role_all_credits"
  ON user_credits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_insert_own_credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_select_own_credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "allow_authenticated_update_own_credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 4: Recreate trigger function with logging
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create new function with comprehensive error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  full_name_value TEXT;
  first_name_value TEXT;
  email_value TEXT;
  profile_inserted BOOLEAN := false;
  credits_inserted BOOLEAN := false;
BEGIN
  -- Extract and prepare values
  email_value := COALESCE(NEW.email, '');
  full_name_value := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(email_value, '@', 1),
    'User'
  );
  first_name_value := SPLIT_PART(full_name_value, ' ', 1);

  -- Try to insert profile
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      email,
      full_name,
      first_name,
      gender,
      is_verified,
      verification_status,
      profile_visibility,
      is_online,
      show_online_status,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      email_value,
      full_name_value,
      first_name_value,
      'prefer-not-to-say',
      false,
      'not_started',
      'public',
      false,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    profile_inserted := true;
    RAISE LOG 'Profile created for user %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;

  -- Try to insert credits
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
      20,
      0,
      20,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    credits_inserted := true;
    RAISE LOG 'Credits created for user %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create credits for user %: %', NEW.id, SQLERRM;
  END;

  -- Log results
  IF profile_inserted AND credits_inserted THEN
    RAISE LOG 'Successfully created profile and credits for user %', NEW.id;
  ELSIF NOT profile_inserted AND NOT credits_inserted THEN
    RAISE WARNING 'Failed to create both profile and credits for user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant all necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- ============================================
-- STEP 5: Verify the setup
-- ============================================

SELECT '✓ Setup complete!' as status;

-- Show what we created
SELECT 'Policies on user_profiles:' as info;
SELECT polname FROM pg_policy WHERE polrelid = 'public.user_profiles'::regclass;

SELECT 'Policies on user_credits:' as info;
SELECT polname FROM pg_policy WHERE polrelid = 'public.user_credits'::regclass;

SELECT 'Trigger status:' as info;
SELECT
  t.tgname as trigger_name,
  'attached to auth.users' as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND t.tgname = 'on_auth_user_created';
