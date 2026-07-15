-- ============================================
-- DATES APP - DATABASE VERIFICATION SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor to verify your database is set up correctly
-- This will check for all required tables, functions, and policies

-- Check 1: List all tables in public schema
SELECT
  '✓ Tables Found' as check_type,
  COUNT(*) as count,
  ARRAY_AGG(table_name ORDER BY table_name) as items
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Check 2: Verify required core tables exist
SELECT
  CASE
    WHEN COUNT(*) >= 20 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as status,
  'Required Tables' as check_name,
  COUNT(*) as found_count,
  20 as expected_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'user_profiles',
    'user_photos',
    'user_preferences',
    'user_blocked',
    'likes',
    'matches',
    'match_conversations',
    'messages',
    'gift_transactions',
    'virtual_gifts',
    'user_credits',
    'credit_packages',
    'credit_transactions',
    'blog_articles',
    'blog_comments',
    'forum_posts',
    'counselling_bookings',
    'verification_requests',
    'staff_members',
    'newsletter_subscribers'
  );

-- Check 3: List each required table individually
SELECT
  table_name,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public'
      AND t.table_name = required_tables.table_name
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES
    ('user_profiles'),
    ('user_photos'),
    ('user_preferences'),
    ('user_blocked'),
    ('likes'),
    ('matches'),
    ('match_conversations'),
    ('messages'),
    ('gift_transactions'),
    ('virtual_gifts'),
    ('user_credits'),
    ('credit_packages'),
    ('credit_transactions'),
    ('blog_articles'),
    ('blog_comments'),
    ('forum_posts'),
    ('forum_replies'),
    ('counselling_bookings'),
    ('verification_requests'),
    ('staff_members'),
    ('newsletter_subscribers')
) AS required_tables(table_name)
ORDER BY table_name;

-- Check 4: Verify RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check 5: Count policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ HAS POLICIES'
    ELSE '⚠️ NO POLICIES'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Check 6: Verify database functions exist
SELECT
  routine_name as function_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- Check 7: Verify indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check 8: Check for default data
SELECT
  'credit_packages' as table_name,
  COUNT(*) as row_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '⚠️ EMPTY'
  END as status
FROM credit_packages
UNION ALL
SELECT
  'virtual_gifts' as table_name,
  COUNT(*) as row_count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '⚠️ EMPTY'
  END as status
FROM virtual_gifts;

-- Check 9: Test user profile creation trigger
SELECT
  'create_user_profile_on_signup' as trigger_name,
  '✅ EXISTS' as status
FROM information_schema.triggers
WHERE trigger_name = 'create_user_profile_on_signup';

-- Check 10: Overall Summary
SELECT
  '=== DATABASE SETUP SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as total_functions,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') >= 20
     AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') >= 50
    THEN '✅ DATABASE READY'
    ELSE '❌ SETUP INCOMPLETE'
  END as overall_status;

-- Check 11: Authentication settings check
-- Note: Run this to see if users can sign up
SELECT
  'Check Authentication Settings' as note,
  'Go to: Authentication > Providers > Email' as action,
  'Disable "Confirm email" for instant signup' as recommendation;
