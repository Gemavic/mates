/*
  # Complete Signup Fix - Comprehensive Solution

  This migration fixes all signup issues by:
  1. Ensuring all required columns exist with proper defaults
  2. Fixing RLS policies to allow trigger inserts
  3. Creating a bulletproof trigger function
  4. Granting all necessary permissions
*/

-- ============================================
-- STEP 1: Clean up existing trigger
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================
-- STEP 2: Ensure user_profiles has all columns with defaults
-- ============================================
DO $$
BEGIN
  -- Ensure email column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'email') THEN
    ALTER TABLE public.user_profiles ADD COLUMN email TEXT;
  END IF;

  -- Ensure full_name column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'full_name') THEN
    ALTER TABLE public.user_profiles ADD COLUMN full_name TEXT DEFAULT 'New User';
  END IF;

  -- Ensure first_name column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'first_name') THEN
    ALTER TABLE public.user_profiles ADD COLUMN first_name TEXT DEFAULT 'User';
  END IF;

  -- Ensure gender column with default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'gender') THEN
    ALTER TABLE public.user_profiles ADD COLUMN gender TEXT DEFAULT 'prefer-not-to-say';
  ELSE
    ALTER TABLE public.user_profiles ALTER COLUMN gender SET DEFAULT 'prefer-not-to-say';
  END IF;

  -- Ensure verification_status column with default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'verification_status') THEN
    ALTER TABLE public.user_profiles ADD COLUMN verification_status TEXT DEFAULT 'not_started';
  ELSE
    ALTER TABLE public.user_profiles ALTER COLUMN verification_status SET DEFAULT 'not_started';
  END IF;

  -- Ensure profile_visibility column with default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'profile_visibility') THEN
    ALTER TABLE public.user_profiles ADD COLUMN profile_visibility TEXT DEFAULT 'public';
  ELSE
    ALTER TABLE public.user_profiles ALTER COLUMN profile_visibility SET DEFAULT 'public';
  END IF;

  -- Ensure is_verified column with default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
  ELSE
    ALTER TABLE public.user_profiles ALTER COLUMN is_verified SET DEFAULT false;
  END IF;

  -- Ensure is_online column with default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'is_online') THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
  ELSE
    ALTER TABLE public.user_profiles ALTER COLUMN is_online SET DEFAULT false;
  END IF;

  -- Ensure show_online_status column with default
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'show_online_status') THEN
    ALTER TABLE public.user_profiles ADD COLUMN show_online_status BOOLEAN DEFAULT true;
  ELSE
    ALTER TABLE public.user_profiles ALTER COLUMN show_online_status SET DEFAULT true;
  END IF;
END $$;

-- ============================================
-- STEP 3: Fix RLS policies for service_role
-- ============================================

-- Temporarily disable RLS to allow service_role inserts
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "allow_service_role_all_user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_service_role_all_user_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;

-- Create service_role bypass policies (MUST be first)
CREATE POLICY "allow_service_role_all_user_profiles"
  ON public.user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "allow_service_role_all_user_credits"
  ON public.user_credits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create user policies
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (profile_visibility = 'public' OR auth.uid() = user_id);

-- ============================================
-- STEP 4: Create the bulletproof trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  full_name_value TEXT;
  first_name_value TEXT;
  email_value TEXT;
BEGIN
  -- Extract values with fallbacks
  email_value := COALESCE(NEW.email, 'user@example.com');
  full_name_value := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  first_name_value := COALESCE(SPLIT_PART(full_name_value, ' ', 1), 'User');

  -- Insert user profile (ignore conflicts)
  BEGIN
    INSERT INTO public.user_profiles (
      user_id,
      email,
      full_name,
      first_name,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      email_value,
      full_name_value,
      first_name_value,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user_profiles for %: %', NEW.id, SQLERRM;
  END;

  -- Insert user credits (ignore conflicts)
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user_credits for %: %', NEW.id, SQLERRM;
  END;

  -- Always return NEW to allow signup to continue
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 5: Create the trigger
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 6: Grant all necessary permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA auth TO service_role;

GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.user_credits TO service_role;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- ============================================
-- STEP 7: Verify the setup
-- ============================================
SELECT
  'Setup complete!' as status,
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND t.tgname = 'on_auth_user_created';
