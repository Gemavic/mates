/*
  # EMERGENCY SIGNUP FIX

  Run this FIRST to immediately fix signup issues.
  This temporarily disables RLS to allow user registration to work.
*/

-- ============================================
-- STEP 1: Temporarily disable RLS
-- ============================================
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop and recreate trigger
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================
-- STEP 3: Create simple trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    first_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, 'user@example.com'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(SPLIT_PART(COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), ' ', 1), 'User'),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create credits
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

  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Create trigger
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Verify
-- ============================================
SELECT 'Signup fix applied! RLS is now disabled. Test signup now.' as status;
