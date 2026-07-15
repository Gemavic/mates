-- Check current database state and permissions

-- 1. Check if trigger exists and is enabled
SELECT
  'Trigger Check' as test,
  t.tgname as trigger_name,
  t.tgenabled as enabled,
  'attached to auth.users' as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND t.tgname = 'on_auth_user_created';

-- 2. Check if function exists
SELECT
  'Function Check' as test,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition_exists
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'handle_new_user';

-- 3. Check RLS status on tables
SELECT
  'RLS Status' as test,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'user_credits');

-- 4. Check policies on user_profiles
SELECT
  'user_profiles policies' as test,
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation,
  polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'public.user_profiles'::regclass;

-- 5. Check policies on user_credits
SELECT
  'user_credits policies' as test,
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as operation,
  polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'public.user_credits'::regclass;

-- 6. Check table structure
SELECT
  'user_profiles columns' as test,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 7. Try to simulate what happens during signup
-- This tests if the service role can insert into the tables
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
BEGIN
  RAISE NOTICE 'Testing insert with service role permissions...';

  -- Try inserting into user_profiles
  BEGIN
    INSERT INTO public.user_profiles (
      user_id, email, full_name, first_name,
      gender, is_verified, verification_status,
      profile_visibility, is_online, show_online_status
    ) VALUES (
      test_user_id, 'test@test.com', 'Test User', 'Test',
      'prefer-not-to-say', false, 'not_started',
      'public', false, true
    );
    RAISE NOTICE '✓ Successfully inserted test profile';

    -- Clean up
    DELETE FROM public.user_profiles WHERE user_id = test_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Failed to insert profile: %', SQLERRM;
  END;

  -- Try inserting into user_credits
  BEGIN
    INSERT INTO public.user_credits (
      user_id, complimentary_credits, purchased_credits, total_kobos
    ) VALUES (
      test_user_id, 20, 0, 20
    );
    RAISE NOTICE '✓ Successfully inserted test credits';

    -- Clean up
    DELETE FROM public.user_credits WHERE user_id = test_user_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '✗ Failed to insert credits: %', SQLERRM;
  END;
END $$;
