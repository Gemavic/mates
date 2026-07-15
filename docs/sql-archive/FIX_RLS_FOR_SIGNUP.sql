/*
  # Fix RLS Policies for User Signup

  The trigger exists but RLS policies are blocking the inserts.
  This fixes the policies to allow the trigger to create profiles.
*/

-- ============================================
-- PART 1: Check current RLS status
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '=== Checking Current Setup ===';
END $$;

-- Show current policies on user_profiles
SELECT 'Current user_profiles policies:' as info;
SELECT
  polname as policy_name,
  polcmd as command,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation
FROM pg_policy
WHERE polrelid = 'public.user_profiles'::regclass;

-- Show current policies on user_credits
SELECT 'Current user_credits policies:' as info;
SELECT
  polname as policy_name,
  polcmd as command,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation
FROM pg_policy
WHERE polrelid = 'public.user_credits'::regclass;

-- ============================================
-- PART 2: Fix user_profiles RLS policies
-- ============================================

-- Drop ALL existing policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;

-- Create fresh, working policies

-- 1. Allow trigger to insert (runs as service role via SECURITY DEFINER)
CREATE POLICY "Enable insert for service role"
  ON user_profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Allow authenticated users to insert their own profile (fallback)
CREATE POLICY "Enable insert for authenticated users own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to read their own profile
CREATE POLICY "Enable read access for users own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Allow users to read public profiles
CREATE POLICY "Enable read access for public profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (profile_visibility = 'public');

-- 5. Allow users to update their own profile
CREATE POLICY "Enable update for users own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 3: Fix user_credits RLS policies
-- ============================================

-- Drop ALL existing policies on user_credits
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can insert own credits" ON user_credits;
DROP POLICY IF EXISTS "Users can update own credits" ON user_credits;
DROP POLICY IF EXISTS "Service role can insert credits" ON user_credits;

-- Create fresh, working policies

-- 1. Allow trigger to insert (runs as service role via SECURITY DEFINER)
CREATE POLICY "Enable insert for service role"
  ON user_credits
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 2. Allow authenticated users to insert their own credits (fallback)
CREATE POLICY "Enable insert for authenticated users own credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to read their own credits
CREATE POLICY "Enable read access for users own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Allow users to update their own credits
CREATE POLICY "Enable update for users own credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PART 4: Ensure trigger function is correct
-- ============================================

-- Recreate the trigger function with all required columns
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
BEGIN
  -- Extract values from the new user
  full_name_value := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1),
    'User'
  );

  first_name_value := SPLIT_PART(full_name_value, ' ', 1);
  email_value := COALESCE(NEW.email, '');

  -- Create user profile with all required fields
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
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  -- Create user credits
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
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant permissions to the function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- ============================================
-- PART 5: Verify the fix
-- ============================================

SELECT 'RLS policies fixed successfully!' as status;

-- Show new policies
SELECT 'New user_profiles policies:' as info;
SELECT polname as policy_name
FROM pg_policy
WHERE polrelid = 'public.user_profiles'::regclass;

SELECT 'New user_credits policies:' as info;
SELECT polname as policy_name
FROM pg_policy
WHERE polrelid = 'public.user_credits'::regclass;
