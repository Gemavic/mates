# Fix "Permission Denied" Error - Quick Guide

## What's Wrong

You're getting "permission denied for table user_profiles" because the Row Level Security (RLS) policies aren't configured correctly. This happens when:
- A user tries to sign up
- A user tries to view profiles
- The app tries to read/write data

## The 1-Minute Fix

### Step 1: Run the RLS Fix

1. **Open Supabase SQL Editor:**
   - https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql

2. **Copy ALL content from:**
   - File: `FIX_RLS_PERMISSIONS.sql`

3. **Paste into SQL Editor**

4. **Click "Run"**

5. **Wait 10 seconds**

You should see:
```
RLS Policies Fixed!
All RLS policies have been fixed! Try signing up again.
```

### Step 2: Test Your App

1. Go to your website
2. Try to sign up with a new account
3. Should work immediately

## What This Fix Does

The fix creates proper RLS policies for ALL tables:

### Main Changes:
- **user_profiles**: Allows authenticated users to read all profiles (needed for discovery)
- **user_credits**: Users can view/manage their own credits
- **messages**: Users can send/view their own messages
- **likes**: Users can like profiles and view likes
- **matches**: Users can view their matches
- **credit_packages**: Everyone can view packages (needed for purchase page)
- **virtual_gifts**: Everyone can view gifts (needed for gift shop)
- And policies for all 20+ other tables...

### Policy Types Created:
- **SELECT**: Who can read data
- **INSERT**: Who can create new records
- **UPDATE**: Who can modify records
- **DELETE**: Who can remove records

## Why The Original Policies Failed

**Problem 1: Too Restrictive**
- Old policy: Only let users see "public" profiles
- Reality: Discovery page needs to see all profiles
- Fix: Let authenticated users see all profiles

**Problem 2: Missing Policies**
- Old: Only had SELECT policies
- Reality: Need INSERT, UPDATE, DELETE too
- Fix: Added all four policy types

**Problem 3: Complex Conditions**
- Old: Nested EXISTS queries that were slow/buggy
- Reality: Simple conditions work better
- Fix: Simplified all conditions

## Common Errors Fixed

### "permission denied for table user_profiles"
✅ Fixed: Added policies allowing authenticated users to read all profiles

### "permission denied for table user_credits"
✅ Fixed: Added policies for viewing and managing own credits

### "permission denied for table credit_packages"
✅ Fixed: Added policy allowing everyone to view packages

### "permission denied for table messages"
✅ Fixed: Added policies for sending and viewing own messages

### "permission denied for table likes"
✅ Fixed: Added policies for creating likes and viewing own likes

## Verify It Worked

After running the fix, run this query to check:

```sql
-- Should show policies for all tables
SELECT tablename, COUNT(*) as policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

You should see something like:
```
blog_articles: 1
blog_comments: 2
counselling_bookings: 2
credit_packages: 1
credit_transactions: 2
forum_posts: 4
forum_replies: 4
gift_transactions: 2
likes: 3
match_conversations: 2
matches: 2
messages: 3
newsletter_subscribers: 1
user_blocked: 3
user_credits: 3
user_photos: 4
user_preferences: 4
user_profiles: 4
verification_requests: 2
virtual_gifts: 1
```

## Test Checklist

After applying the fix, test these features:

1. ✅ Sign up with new account
2. ✅ Sign in with existing account
3. ✅ View discovery page (browse profiles)
4. ✅ Edit your profile
5. ✅ View credit packages
6. ✅ Like a profile
7. ✅ Send a message
8. ✅ View gift shop

All should work without "permission denied" errors!

## Still Having Issues?

### Error: "relation does not exist"
- **Problem**: Tables don't exist yet
- **Solution**: Run `SAFE_MIGRATION_MASTER.sql` first

### Error: "cannot execute INSERT in a read-only transaction"
- **Problem**: Database might be paused
- **Solution**: Check Supabase dashboard, unpause if needed

### Error: "new row violates row-level security policy"
- **Problem**: Trying to insert data that doesn't match policy
- **Solution**: Make sure you're logged in and using auth.uid()

### Still getting "permission denied"
- **Problem**: Policies might not have applied
- **Solution**: Run FIX_RLS_PERMISSIONS.sql again

## Technical Details

### How RLS Works

Row Level Security (RLS) in Supabase controls who can access what data:

1. **Enabled by default**: All tables have RLS on
2. **Default behavior**: Block everything
3. **Policies**: Explicitly allow specific operations

### Policy Structure

Each policy has:
- **Command**: SELECT, INSERT, UPDATE, or DELETE
- **Role**: authenticated, anon, or specific role
- **USING**: Condition for reading data
- **WITH CHECK**: Condition for writing data

### Example Policy

```sql
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

This means:
- **Table**: user_profiles
- **Action**: SELECT (reading)
- **Who**: authenticated users
- **When**: Only if user_id matches their auth.uid()

## Files Reference

**FIX_RLS_PERMISSIONS.sql**
- Fixes all RLS policies
- Run this to fix "permission denied" errors
- Safe to run multiple times

**SAFE_MIGRATION_MASTER.sql**
- Creates all tables
- Run this first if tables don't exist

**VERIFY_DATABASE_SCHEMA.sql**
- Checks what exists in database
- Run this to diagnose issues

---

**Run FIX_RLS_PERMISSIONS.sql now and your permission errors will be gone!** 🚀
