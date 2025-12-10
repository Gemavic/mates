# Quick Database Fix - 5 Minutes

## TL;DR - What's Wrong

Your website is pointing to a Supabase database that doesn't have the required tables and data. This is why users can't sign up, sign in, or use any features.

## The Fast Fix (Choose One Path)

### PATH A: Fix Current Database (Fastest - 2 minutes)

**Use this if:** You want to keep using `zdkxonufiuagkrhprnbd.supabase.co`

1. **First, check what you already have:**
   - Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql
   - Copy content from: `CHECK_EXISTING_SCHEMA.sql`
   - Paste and click "Run"
   - This shows what tables/types already exist

2. **Click "New Query"**

3. **Copy ALL content from:**
   - File: `SAFE_MIGRATION_MASTER.sql` (in your project root)
   - This safely handles existing objects (drops and recreates types, uses IF NOT EXISTS)

4. **Paste into SQL Editor**

5. **Click "Run"**

6. **Wait 30 seconds** (it creates all tables, indexes, policies)

7. **Verify:**
   - Click "Table Editor" in left sidebar
   - You should see 20+ tables including:
     - user_profiles
     - likes
     - matches
     - messages
     - user_credits
     - etc.

8. **Disable Email Confirmation:**
   - Click "Authentication" > "Providers"
   - Find "Email"
   - Toggle OFF "Confirm email"
   - Click "Save"

9. **Test on your website:**
   - Go to Sign Up
   - Create account
   - Should work immediately!

**Done! ✅**

---

### PATH B: Switch to Different Supabase (5 minutes)

**Use this if:** You want to use a different Supabase account from your 3 accounts

1. **Choose which Supabase project to use**

2. **Get credentials from that project:**
   - Project Settings > API
   - Copy: URL, anon key, service_role key
   - Project Settings > Database
   - Copy: Connection strings (pooling + direct)

3. **Update your local `.env` file:**
```env
VITE_SUPABASE_URL=https://YOUR-NEW-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
DATABASE_URL="your-new-pooling-connection-string"
DIRECT_URL="your-new-direct-connection-string"
```

4. **Apply migrations to new database:**
   - Open SQL Editor for your new project
   - Run `SAFE_MIGRATION_MASTER.sql`

5. **Disable email confirmation** (same as PATH A step 8)

6. **Update Vercel environment variables:**
   - Vercel Dashboard > Your Project > Settings > Environment Variables
   - Update all 5 variables with new values
   - Click "Redeploy"

7. **Test your website**

**Done! ✅**

---

## How to Know Which Path to Choose

### Choose PATH A if:
- ✅ You like the current project reference (zdkxonufiuagkrhprnbd)
- ✅ You don't have any important data in it
- ✅ You want the fastest fix (2 minutes)
- ✅ You don't want to change any code or redeploy

### Choose PATH B if:
- ✅ You want to use a specific different Supabase account
- ✅ You want a fresh start
- ✅ You want to choose a different region
- ✅ Current project has other stuff you don't want to touch

## What's in SAFE_MIGRATION_MASTER.sql?

This file contains ALL your database setup and safely handles existing objects:

**Tables Created (25+):**
- User profiles and photos
- Matching system (likes, matches)
- Messaging system
- Credit system
- Gift shop
- Blog and forum
- Counselling bookings
- Verification system
- Staff management
- Newsletter subscribers

**Security:**
- Row Level Security (RLS) on all tables
- 50+ security policies
- Proper authentication checks

**Features:**
- Automatic profile creation when users sign up
- Default credit packages
- Default virtual gifts
- Indexes for performance
- Database functions for complex operations

## Verification

After running the migration, verify it worked:

### Method 1: Visual Check
- Open Table Editor in Supabase
- Count tables - should see 20+ tables
- Open `user_profiles` table - should see column structure

### Method 2: Run Verification Script
- Copy content from `VERIFY_DATABASE_SCHEMA.sql`
- Paste in SQL Editor
- Click "Run"
- Should see all green checkmarks ✅

### Method 3: Test on Website
- Go to Sign Up page
- Create test account: test@example.com / Test1234!
- Should successfully create account and log in
- Check Supabase > Authentication > Users - new user should appear
- Check Supabase > Table Editor > user_profiles - new profile should appear

## Common Issues

### Issue: "already exists" errors when running migration
**Solution:** Tables already exist. Either:
- Skip (migrations use `IF NOT EXISTS`)
- Or drop all tables first (dangerous - only if empty database)

### Issue: Migration runs but no tables appear
**Solution:** Check for error messages in SQL Editor output

### Issue: Can create account but not sign in
**Solution:** Email confirmation is still enabled
- Go to Authentication > Providers > Email
- Toggle OFF "Confirm email"
- Save

### Issue: Works in Supabase but not on website
**Solution:** Environment variables mismatch
- Check `.env` file has correct URL and keys
- If using Vercel, check environment variables there too

### Issue: User created but no profile
**Solution:** Trigger not working
- Check if migration created the trigger
- Manually run: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'create_user_profile_on_signup';`

## Your 3 Supabase Accounts

You mentioned you have 3 accounts. Here's how to tell them apart:

**Project Reference:** The unique ID in the URL
- Example: `zdkxonufiuagkrhprnbd` (your current one)
- Each project has a different reference

**To find all your projects:**
1. Go to https://supabase.com/dashboard
2. You'll see all projects from all your accounts
3. Each project shows:
   - Name
   - Reference ID
   - Region
   - Status (Active/Paused)

**To pick the right one:**
- Choose the one you want for production
- Preferably closest region to your users
- Make sure it's on Active status
- Check you have access to upgrade to Pro later if needed

## Next Steps After Fix

Once your database is set up:

1. ✅ Test all features:
   - Sign up / Sign in
   - Profile creation
   - Browse discovery
   - Matching
   - Messaging
   - Credits

2. ✅ Add test data:
   - Create a few test profiles
   - Test matching algorithm
   - Test messaging

3. ✅ Configure production settings:
   - Set up email templates (if you re-enable confirmation later)
   - Configure redirect URLs
   - Set up custom domain
   - Review rate limits

4. ✅ Monitor:
   - Check Supabase Dashboard for usage
   - Watch for errors in logs
   - Monitor database size

## Need Help?

If you're stuck:

1. Check browser console for errors
2. Check Supabase logs (Logs & Reports in dashboard)
3. Run `VERIFY_DATABASE_SCHEMA.sql` to diagnose
4. Check that .env variables match Supabase dashboard

---

## The Actual Fix Commands

**For PATH A (use current database):**
```
1. Open: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql
2. (Optional) Run CHECK_EXISTING_SCHEMA.sql to see what exists
3. Copy content from: SAFE_MIGRATION_MASTER.sql
4. Paste and Run
5. Disable email confirmation
6. Test website
```

**For PATH B (switch database):**
```
1. Choose which Supabase project
2. Get all credentials
3. Update .env file
4. Run SAFE_MIGRATION_MASTER.sql on new project
5. Disable email confirmation
6. Update Vercel environment variables
7. Redeploy
8. Test website
```

---

**Choose your path and let's get your app working!** 🚀

I recommend **PATH A** for speed - you can always switch later if needed.
