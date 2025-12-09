# Supabase Database Setup Guide

## The Problem

Your website is connected to Supabase project: **zdkxonufiuagkrhprnbd**

But this database might not have the complete schema (tables, functions, security policies) that your app needs.

You have **3 Supabase accounts**, and we need to:
1. Choose which one to use
2. Apply all database migrations to it
3. Update your website to point to it

## Your Current Configuration

**Project Reference:** zdkxonufiuagkrhprnbd
**URL:** https://zdkxonufiuagkrhprnbd.supabase.co
**Region:** US West (AWS)

## Required Database Schema

Your dating app needs these tables:

### Core Tables:
- `user_profiles` - User information and preferences
- `user_photos` - Profile photos
- `user_preferences` - Matching preferences
- `user_blocked` - Blocked users list

### Matching System:
- `likes` - User likes/swipes
- `matches` - Confirmed matches
- `match_conversations` - Match chats

### Messaging:
- `messages` - Direct messages
- `gift_transactions` - Virtual gifts

### Credits & Payments:
- `user_credits` - Credit balances
- `credit_packages` - Available packages
- `credit_transactions` - Purchase history

### Community:
- `blog_articles` - Dating advice blog
- `blog_comments` - Article comments
- `forum_posts` - Community discussions

### Services:
- `counselling_bookings` - Therapy appointments
- `verification_requests` - ID verification

### Staff:
- `staff_members` - Admin panel access
- `newsletter_subscribers` - Email list

**Total: 29 migrations creating ~25 tables + indexes + security policies**

## Step 1: Choose Your Supabase Project

You have 3 Supabase accounts. You need to decide which one to use:

### Option A: Use Current Project (zdkxonufiuagkrhprnbd)
**Pros:**
- Already connected to your website
- No configuration changes needed
- Just apply migrations

**Cons:**
- Need to verify it's empty or can be reset

**Action:** Apply all migrations to this database

### Option B: Use a Different Supabase Project
**Pros:**
- Clean slate
- Can choose best region
- Keep current one as backup

**Cons:**
- Need to update .env file
- Need to redeploy to Vercel

**Action:** Get credentials from new project, apply migrations there

### Option C: Create Fresh Supabase Project
**Pros:**
- Guaranteed clean database
- Latest Supabase features
- Optimal configuration

**Cons:**
- Need to create new project
- Update credentials everywhere

**Action:** Create project, get credentials, apply migrations

## Step 2: Get Your Supabase Credentials

For whichever project you choose:

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard

2. **Select Your Project**

3. **Get API Credentials:**
   - Click "Project Settings" (gear icon)
   - Click "API"
   - Copy these values:
     - **Project URL** (e.g., https://xxxxx.supabase.co)
     - **anon/public key** (starts with eyJhbGc...)
     - **service_role key** (starts with eyJhbGc...)

4. **Get Database URL:**
   - Click "Project Settings"
   - Click "Database"
   - Scroll to "Connection string"
   - Copy both:
     - **Connection pooling** (port 6543)
     - **Direct connection** (port 5432)

## Step 3: Apply All Database Migrations

I'll create a master migration file that contains everything.

### Using Supabase Dashboard (Recommended):

1. **Go to SQL Editor:**
   - Open your Supabase project
   - Click "SQL Editor" in left sidebar

2. **Run the Master Migration:**
   - Copy the content from `MASTER_MIGRATION.sql` (I'll create this next)
   - Paste into SQL Editor
   - Click "Run"

3. **Verify Success:**
   - You should see "Success. No rows returned"
   - Check "Table Editor" - you should see all tables

### Alternative: Using Migration Files

If you prefer to run migrations individually:

1. Go to SQL Editor
2. Run each file in order (by timestamp):
   - 20250731021148_curly_shadow.sql
   - 20250812011434_lively_forest.sql
   - ... (all 29 files)
   - 20251203232538_add_public_read_access_policies.sql

## Step 4: Update Your Configuration

If you're using a different Supabase project, update your `.env` file:

```env
# Replace with your chosen project's credentials
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...YOUR-SERVICE-ROLE-KEY

# Database URLs
DATABASE_URL="postgresql://postgres.YOUR-PROJECT:PASSWORD@...pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.YOUR-PROJECT:PASSWORD@...pooler.supabase.com:5432/postgres"
```

## Step 5: Update Vercel Environment Variables

If you changed Supabase projects:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard

2. **Select Your Project**

3. **Go to Settings > Environment Variables**

4. **Update These Variables:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`

5. **Redeploy:**
   - Click "Deployments"
   - Click "..." on latest deployment
   - Click "Redeploy"

## Step 6: Disable Email Confirmation

After migrations are applied:

1. **Go to Supabase Dashboard**
2. **Click "Authentication" > "Providers"**
3. **Find "Email" provider**
4. **Toggle OFF "Confirm email"**
5. **Click "Save"**

This allows users to sign up and log in immediately.

## Step 7: Verify Everything Works

### Test Database Connection:

1. **Go to SQL Editor in Supabase**
2. **Run this query:**

```sql
-- Check if all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see at least 20+ tables.

### Test Authentication:

1. **Go to your website**
2. **Click "Sign Up"**
3. **Create test account:**
   - Name: Test User
   - Email: test@yourdomain.com
   - Password: Test1234!
4. **Should be logged in immediately**
5. **Check Supabase Dashboard > Authentication > Users**
6. **You should see the new user**

### Test Database Creation:

1. **After signing up, check Supabase Dashboard**
2. **Go to Table Editor > user_profiles**
3. **You should see a new row for your test user**

## Troubleshooting

### Problem: "relation does not exist" errors
**Solution:** Migrations not applied. Run the master migration file.

### Problem: Can't sign up - no error message
**Solution:** Check browser console. Likely RLS policy blocking insert.

### Problem: User created but no profile
**Solution:** Database trigger not working. Check `create_profile_trigger.sql` migration.

### Problem: "Invalid API key" error
**Solution:** .env file has wrong credentials. Get fresh ones from Supabase.

### Problem: Works locally but not on Vercel
**Solution:** Vercel environment variables not updated. Update and redeploy.

## Which Supabase Account Should You Use?

### Recommendations:

**For Development:**
- Use a separate project
- Easier to reset and test
- Free tier is fine

**For Production (Your Live Website):**
- Use dedicated project
- Consider Pro plan for better performance
- Enable Point-in-Time Recovery (backups)
- Set up monitoring

### Cost Considerations:

**Free Tier Limits:**
- 500 MB database storage
- 2 GB file storage
- 50,000 monthly active users
- 2 GB egress bandwidth

For a dating app with growth potential, you might hit these limits quickly.

**Pro Tier ($25/month):**
- 8 GB database storage
- 100 GB file storage
- 100,000 monthly active users
- 250 GB egress bandwidth
- Daily backups
- Priority support

## Next Steps

1. **Choose your Supabase project** (current or different)
2. **Get credentials** if using different project
3. **Apply migrations** using the master migration file
4. **Update .env** if needed
5. **Update Vercel** if needed
6. **Disable email confirmation**
7. **Test sign up and sign in**

I'll create the master migration file next that contains all 29 migrations in one file.

---

**Ready to proceed? Let me know which option you choose:**
- Option A: Use current database (zdkxonufiuagkrhprnbd) - I'll apply migrations
- Option B: Switch to different account - Tell me the project reference
- Option C: Create new project - I'll guide you through setup
