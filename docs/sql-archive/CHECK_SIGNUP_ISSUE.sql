/*
  # Diagnostic Check - Why is Signup Failing?

  Run this first to see what's wrong with your setup
*/

-- Check 1: Does the trigger function exist?
SELECT
  'Checking trigger function...' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Function exists'
    ELSE '✗ Function missing - need to create it'
  END as status
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check 2: Does the trigger exist on auth.users?
SELECT
  'Checking trigger on auth.users...' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Trigger exists'
    ELSE '✗ Trigger missing - need to create it'
  END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth'
  AND c.relname = 'users'
  AND t.tgname = 'on_auth_user_created';

-- Check 3: Do the tables exist?
SELECT
  'Checking user_profiles table...' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Table exists'
    ELSE '✗ Table missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_profiles';

SELECT
  'Checking user_credits table...' as check_name,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Table exists'
    ELSE '✗ Table missing'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'user_credits';

-- Check 4: Are RLS policies blocking inserts?
SELECT
  'Checking RLS on user_profiles...' as check_name,
  CASE
    WHEN relrowsecurity THEN '✓ RLS enabled'
    ELSE '✗ RLS disabled'
  END as status
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'user_profiles';

-- Check 5: List all policies on user_profiles
SELECT
  'user_profiles policies:' as check_name,
  polname as policy_name,
  polcmd as command,
  polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'public.user_profiles'::regclass;

-- Check 6: List all policies on user_credits
SELECT
  'user_credits policies:' as check_name,
  polname as policy_name,
  polcmd as command,
  polroles::regrole[] as roles
FROM pg_policy
WHERE polrelid = 'public.user_credits'::regclass;
