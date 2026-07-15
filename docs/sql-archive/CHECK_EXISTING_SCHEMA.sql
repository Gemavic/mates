-- ============================================
-- CHECK WHAT ALREADY EXISTS IN YOUR DATABASE
-- ============================================
-- Run this first to see what you already have

-- Check existing tables
SELECT 'EXISTING TABLES:' as info;
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check existing types
SELECT 'EXISTING TYPES:' as info;
SELECT typname as type_name
FROM pg_type
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typtype = 'e'
ORDER BY typname;

-- Check existing functions
SELECT 'EXISTING FUNCTIONS:' as info;
SELECT routine_name as function_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Check existing triggers
SELECT 'EXISTING TRIGGERS:' as info;
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- Summary
SELECT
  'SUMMARY:' as info,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
  (SELECT COUNT(*) FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') as type_count,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as function_count;
