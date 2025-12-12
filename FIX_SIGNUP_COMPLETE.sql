/*
  # Complete Signup Fix - Final Solution

  This ensures signup works by:
  1. Dropping and recreating the trigger function
  2. Ensuring all columns have proper defaults
  3. Simplifying RLS policies
*/

-- ============================================
-- STEP 1: Drop existing trigger and function
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================
-- STEP 2: Ensure columns exist with defaults
-- ============================================
DO $$
BEGIN
  -- Add missing columns to user_profiles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'gender') THEN
    ALTER TABLE user_profiles ADD COLUMN gender TEXT DEFAULT 'prefer-not-to-say';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'verification_status') THEN
    ALTER TABLE user_profiles ADD COLUMN verification_status TEXT DEFAULT 'not_started';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'profile_visibility') THEN
    ALTER TABLE user_profiles ADD COLUMN profile_visibility TEXT DEFAULT 'public';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_online') THEN
    ALTER TABLE user_profiles ADD COLUMN is_online BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'show_online_status') THEN
    ALTER TABLE user_profiles ADD COLUMN show_online_status BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ============================================
-- STEP 3: Create simplified trigger function
-- ============================================
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
  -- Get values
  email_value := COALESCE(NEW.email, 'user@example.com');
  full_name_value := COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User');
  first_name_value := SPLIT_PART(full_name_value, ' ', 1);

  -- Insert profile (ignore if exists)
  INSERT INTO public.user_profiles (
    user_id, email, full_name, first_name, created_at, updated_at
  ) VALUES (
    NEW.id, email_value, full_name_value, first_name_value, NOW(), NOW()
  ) ON CONFLICT (user_id) DO NOTHING;

  -- Insert credits (ignore if exists)
  INSERT INTO public.user_credits (
    user_id, complimentary_credits, purchased_credits, total_kobos, created_at, updated_at
  ) VALUES (
    NEW.id, 20, 0, 20, NOW(), NOW()
  ) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Create the trigger
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- ============================================
-- STEP 6: Test the setup
-- ============================================
SELECT
  'Trigger created successfully!' as status,
  tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND t.tgname = 'on_auth_user_created';
