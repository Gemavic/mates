# FIX SIGNUP ERROR - 3 SIMPLE STEPS

## The Problem
Your database trigger is being blocked by RLS (Row Level Security) policies. This prevents new user profiles from being created during signup.

## The Solution (Takes 2 minutes)

### Step 1: Open Supabase SQL Editor
Click this link to go directly to your SQL editor:
https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql

### Step 2: Copy the SQL Fix
Open the file `fix_rls_trigger_signup.sql` in this project folder and copy ALL its contents.

### Step 3: Run the SQL
1. Paste the SQL into the Supabase SQL Editor
2. Click the "Run" button (or press Ctrl/Cmd + Enter)
3. Wait for "Success" message

## That's It!
Once you see "Success", go back to your app and try signing up again. The error will be gone!

---

##What This Fix Does

1. ✓ Drops the old broken trigger
2. ✓ Adds default values to all database columns
3. ✓ Creates RLS policies that allow the trigger to work
4. ✓ Creates a new, error-proof trigger function
5. ✓ Automatically creates user profiles during signup

## Troubleshooting

**If you see "trigger already exists":**
- That's fine! It means part of the fix was already applied
- The SQL is designed to be safe to run multiple times

**If you see "policy already exists":**
- Same as above - this is safe and expected

**If signup still doesn't work:**
- Check the browser console for error messages
- Try with a different email address
- Make sure you're using a strong password (8+ chars, uppercase, lowercase, number)

## Need Help?
The SQL file is located at:
`/tmp/cc-agent/60502529/project/fix_rls_trigger_signup.sql`

Direct link to SQL Editor:
https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql
