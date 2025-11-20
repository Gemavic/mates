# Database Setup Instructions

## Overview

Your Dates app has database migrations that need to be applied to your Supabase instance. The migrations are located in `/supabase/migrations/` directory.

## Current Status

- **Supabase Project**: zdkxonufiuagkrhprnbd.supabase.co
- **Migrations Available**: 22 migration files
- **Migrations Applied**: None (database is empty)

## Why Database Setup Matters

Your app requires these database tables to function properly:
- `user_profiles` - User profile information
- `user_credits` - Credit system for premium features
- `credit_transactions` - Transaction history
- `matches` - User matching data
- `chat_messages` - Chat functionality
- `mail_messages` - Mail/messaging system
- `virtual_gifts` - Gift shop items
- `user_photos` - Photo management
- And many more...

## Option 1: Apply Migrations via Supabase Dashboard (Recommended)

### Step-by-Step:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd

2. Navigate to **SQL Editor** in the left sidebar

3. Apply migrations in order (important!):
   - Click "New Query"
   - Copy the contents of each migration file
   - Paste into the SQL editor
   - Click "Run" or press Ctrl/Cmd + Enter
   - Verify success before moving to next migration

4. **Migration Order** (must be applied in this exact sequence):
   ```
   1. 20250731021148_curly_shadow.sql
   2. 20250812011434_lively_forest.sql
   3. 20250812011444_dry_scene.sql
   4. 20250812011459_little_sky.sql
   5. 20250812011520_graceful_recipe.sql
   6. 20250815213128_lucky_term.sql
   7. 20250815214710_quick_coast.sql
   8. 20250822013842_broken_sky.sql
   9. 20250822013944_hidden_dew.sql
   10. 20250825030613_round_bird.sql
   11. 20250826023017_rustic_scene.sql
   12. 20251006224045_create_biometric_verification_system.sql
   13. 20251006224149_create_matching_algorithm_system.sql
   14. 20251006224321_create_tiered_subscription_system_fixed.sql
   15. 20251006225918_create_error_logs_table.sql
   16. 20251006232538_create_2fa_and_security_system.sql
   17. 20251007011516_create_newsletter_and_community_features.sql
   18. 20251007023439_drop_stripe_tables_and_views.sql
   19. 20251008235156_add_missing_foreign_key_indexes.sql
   20. 20251008235304_optimize_rls_policies_performance.sql
   21. 20251008235341_fix_function_search_paths_corrected.sql
   22. 20251012235010_fix_security_issues_indexes_policies.sql
   23. 20251101224354_add_all_missing_foreign_key_indexes.sql
   24. 20251101224428_optimize_rls_policies_and_remove_duplicates.sql
   25. 20251101224526_optimize_remaining_rls_policies.sql
   ```

## Option 2: Use Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref zdkxonufiuagkrhprnbd

# Push migrations
supabase db push

# Verify migrations
supabase db pull
```

## Verification

After applying migrations, verify your database setup:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see these tables:
   - user_profiles
   - user_credits
   - credit_transactions
   - matches
   - chat_messages
   - mail_messages
   - virtual_gifts
   - user_photos
   - biometric_verifications
   - user_preferences
   - subscription_tiers
   - user_subscriptions
   - And more...

3. Check **Database** > **Roles** to ensure RLS is enabled on all tables

## Authentication Setup

Ensure authentication is configured in Supabase:

1. Go to **Authentication** > **Providers**
2. Enable **Email** provider
3. Disable email confirmation (or configure SMTP if you want confirmation)
4. Set up email templates (optional)

## Post-Setup Testing

After database setup:

1. Deploy your app to Vercel (see DEPLOYMENT_INSTRUCTIONS.md)
2. Try creating a new account
3. Sign in with your account
4. Verify profile creation works
5. Check credit system functionality

## Troubleshooting

### Migration Fails
- Check if you're applying migrations in order
- Review error message in SQL editor
- Ensure you have proper permissions
- Check if table already exists (migrations use IF NOT EXISTS)

### Tables Not Appearing
- Refresh your Supabase Dashboard
- Check you're looking at the correct project
- Verify migrations ran successfully without errors

### Authentication Not Working
- Verify email provider is enabled
- Check RLS policies are applied correctly
- Ensure user_profiles table has proper policies

## Important Notes

- **Data Safety**: These migrations use `IF NOT EXISTS` and `IF EXISTS` clauses to prevent data loss
- **RLS Security**: All tables have Row Level Security enabled
- **Performance**: Migrations include indexes for optimal query performance
- **Credit System**: Supports cryptocurrency payments via direct wallet transfers
- **No Stripe**: Migration 18 removes Stripe-related tables (app uses crypto payments instead)

## Support

If you encounter issues during database setup:
1. Check Supabase Dashboard logs
2. Review migration file comments for details
3. Ensure you're logged into the correct Supabase project
4. Verify your Supabase plan supports the features being used

## Summary

Your database setup is critical for:
- User authentication and profiles
- Credit system and payments
- Matching algorithm
- Chat and messaging
- Photo management
- Security and verification
- All premium features

Complete this setup before deploying to production!
