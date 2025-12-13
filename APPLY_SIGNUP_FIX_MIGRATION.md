# Apply Signup Fix Migration

## Problem
RLS (Row Level Security) policies are blocking the database trigger from creating user profiles during signup. The trigger runs with its own security context, but RLS policies only allow authenticated users to insert their own profiles - creating a chicken-and-egg problem where new users can't be created.

## Solution
This migration fixes the issue by:
1. Dropping the existing trigger and function
2. Adding default values to all columns in user_profiles table
3. Creating RLS policies that allow service_role to bypass restrictions
4. Creating a new trigger function with SECURITY DEFINER and proper error handling
5. Recreating the trigger

## Migration File Location
The migration SQL is located at:
```
/tmp/cc-agent/60502529/project/fix_rls_trigger_signup.sql
```

## How to Apply This Migration

### Option 1: Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql
   - Or navigate to: Dashboard > SQL Editor

2. **Open the Migration File**
   ```bash
   cat fix_rls_trigger_signup.sql
   ```

3. **Copy the entire SQL content** and paste it into the SQL Editor

4. **Click "Run"** to execute the migration

5. **Verify Success**
   - You should see "Success. No rows returned" message
   - Check that no errors were reported

### Option 2: Using psql Command Line

If you have psql installed:

```bash
psql "postgresql://postgres:GMdare@3728#@db.zdkxonufiuagkrhprnbd.supabase.co:5432/postgres" \
  -f fix_rls_trigger_signup.sql
```

### Option 3: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db execute --project-ref zdkxonufiuagkrhprnbd \
  --file fix_rls_trigger_signup.sql
```

## What This Migration Does

### 1. Drops Existing Resources
- Removes the `on_auth_user_created` trigger
- Removes the `handle_new_user()` function

### 2. Sets Default Values
Ensures all columns in `user_profiles` have proper defaults:
- `verification_status` → 'not_started'
- `profile_visibility` → 'public'
- `is_verified` → false
- `is_online` → false
- `show_online_status` → true
- `bio` → ''
- `interests` → '{}'
- `looking_for` → 'serious'
- `distance_preference` → 50
- `age_range_min` → 18
- `age_range_max` → 99

### 3. Creates Service Role Bypass Policies
Creates RLS policies for both `user_profiles` and `user_credits` tables that allow the `service_role` to:
- INSERT (WITH CHECK true)
- SELECT (USING true)
- UPDATE (USING true, WITH CHECK true)
- DELETE (USING true)

This allows the trigger function to create profiles without being blocked by RLS.

### 4. Creates Secure Trigger Function
The new `handle_new_user()` function:
- Uses `SECURITY DEFINER` to run with elevated privileges
- Includes comprehensive error handling
- Uses `ON CONFLICT DO NOTHING` for safe inserts
- Logs all operations for debugging
- Won't break signup even if profile/credits creation fails

### 5. Recreates the Trigger
Creates the `on_auth_user_created` trigger that fires AFTER INSERT on `auth.users`

## Verification Steps

After applying the migration, verify it worked:

### 1. Check the Trigger Exists
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### 2. Check the Function Exists
```sql
SELECT proname, prosecdef 
FROM pg_proc 
WHERE proname = 'handle_new_user';
```
The `prosecdef` column should be `true` (indicating SECURITY DEFINER).

### 3. Check RLS Policies
```sql
SELECT tablename, policyname, roles, cmd 
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_credits') 
AND roles @> ARRAY['service_role'];
```
You should see 4 policies for each table (INSERT, SELECT, UPDATE, DELETE).

### 4. Test Signup
Try creating a new user through your application's signup flow. The user should be created successfully along with their profile and credits.

## Troubleshooting

### If Migration Fails

1. **Check for Syntax Errors**
   - Review the error message in the SQL Editor
   - Ensure no special characters were corrupted during copy/paste

2. **Check Permissions**
   - Make sure you're logged in with the correct Supabase account
   - Verify you have admin access to the project

3. **Run in Sections**
   - If the full migration fails, try running it section by section
   - Start with Step 1 (DROP statements)
   - Then Steps 2-5 one at a time

### If Signup Still Fails After Migration

1. **Check Logs**
   ```sql
   SELECT * FROM postgres_logs 
   WHERE log_time > NOW() - INTERVAL '1 hour' 
   ORDER BY log_time DESC;
   ```

2. **Verify Function is SECURITY DEFINER**
   ```sql
   \df+ handle_new_user
   ```

3. **Check if Policies Were Created**
   ```sql
   \dp user_profiles
   \dp user_credits
   ```

## Rollback (If Needed)

If you need to rollback this migration:

```sql
-- Drop the trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop the service_role policies
DROP POLICY IF EXISTS "Service role can insert user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can select user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can update user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can delete user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Service role can insert user_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can select user_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can update user_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Service role can delete user_credits" ON public.user_credits;
```

Then re-apply the previous migration version.

## Migration History

- **Created**: 2025-12-13
- **Version**: 20251213000000
- **Purpose**: Fix RLS blocking trigger during user signup
- **Status**: Ready to apply

## Related Files

- Migration SQL: `fix_rls_trigger_signup.sql`
- Previous migration: `supabase/migrations/20251129200327_fix_user_profile_creation_trigger.sql`
- Original table creation: `supabase/migrations/20250812011434_lively_forest.sql`

## Support

If you encounter issues applying this migration, please:
1. Check the Supabase logs in the dashboard
2. Review the error messages carefully
3. Verify your database connection and permissions
4. Contact your database administrator if needed
