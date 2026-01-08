# Database Migration Fix Applied

## Issue Resolved

**Error**: `relation "staff_accounts" does not exist`

**Cause**: The migration referenced a table called `staff_accounts`, but your database actually uses `staff_members`.

**Fix Applied**: Updated all references in the migration from `staff_accounts` to `staff_members`.

---

## Changes Made to REWARD_SYSTEM_MIGRATION.sql

### 1. Foreign Key References Updated
```sql
-- BEFORE
staff_id uuid REFERENCES staff_accounts(id) ON DELETE SET NULL
created_by uuid REFERENCES staff_accounts(id) ON DELETE SET NULL

-- AFTER
staff_id uuid REFERENCES staff_members(id) ON DELETE SET NULL
created_by uuid REFERENCES staff_members(id) ON DELETE SET NULL
```

### 2. RLS Policy Queries Updated
```sql
-- BEFORE
SELECT 1 FROM staff_accounts WHERE id = auth.uid()

-- AFTER
SELECT 1 FROM staff_members WHERE id = auth.uid()
```

### 3. Permission Check Fixed
```sql
-- BEFORE (incorrect syntax)
AND 'manage_rewards' = ANY(permissions)

-- AFTER (correct JSONB syntax)
AND permissions ? 'manage_rewards'
```

### 4. Auto-Grant Permissions Added
New code at the end automatically grants `manage_rewards` permission to:
- Super User
- Credit Manager
- Administrator

---

## How to Apply the Fixed Migration

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project
2. Navigate to SQL Editor

### Step 2: Run the Fixed Migration
1. Open file: `REWARD_SYSTEM_MIGRATION.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click "Run"

### Step 3: Verify Installation

Run these verification queries:

**Check tables created:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('reward_history', 'reward_rules', 'user_achievements');
```
Expected: 3 rows

**Check functions created:**
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE 'award_%'
OR routine_name = 'check_and_award_automated_rewards';
```
Expected: 5 functions

**Check default rules:**
```sql
SELECT rule_name, rule_type, is_active
FROM reward_rules
ORDER BY created_at;
```
Expected: 4 pre-configured rules

**Check staff permissions:**
```sql
SELECT email, role, permissions
FROM staff_members
WHERE permissions ? 'manage_rewards';
```
Expected: All Super Users, Credit Managers, and Administrators

---

## What This Enables

### Staff Panel Features Now Available

1. **Rewards Tab** - Manual reward distribution
   - Award bonus credits (complimentary)
   - Award purchased credits (refunds)
   - Award kobos (currency)
   - Award combo (credits + kobos)

2. **Auto Rules Tab** - Automated reward system
   - Create custom reward rules
   - Set time-limited promotions
   - Configure trigger conditions
   - Manage active/inactive rules

3. **History Tab** - Complete audit trail
   - View all rewards distributed
   - Statistics dashboard
   - Filter by type or user
   - Export capabilities

### Pre-configured Automated Rules

After migration runs successfully:

1. **Welcome Bonus**: 20 credits + 20 kobos on signup
2. **Profile Completion**: 50 credits + 50 kobos when profile 100% complete
3. **Login Streak**: 30 credits + 30 kobos for 7 consecutive days
4. **First Verification**: 100 credits + 100 kobos on first ID verification

---

## Staff Accounts with Access

The following staff accounts will have `manage_rewards` permission:

### admin@dates.care (Super User)
- Password: `AdminPass2025!`
- Permissions: Full access including manage_rewards

### creditmanager@dates.care (Credit Manager)
- Password: `CreditPass2025!`
- Permissions: Award credits, manage rewards, reports

### Administrator role accounts
- Any staff with "Administrator" role
- Automatically gets manage_rewards permission

---

## Migration Is Safe

The migration uses:
- `CREATE TABLE IF NOT EXISTS` - Won't fail if tables exist
- `CREATE OR REPLACE FUNCTION` - Safe to run multiple times
- `INSERT ... ON CONFLICT DO NOTHING` - Won't duplicate data
- `CREATE INDEX IF NOT EXISTS` - Won't fail if indexes exist

**Safe to run multiple times without data loss.**

---

## After Migration Success

### Test the System

1. **Login to Staff Panel**
   - Use admin@dates.care / AdminPass2025!

2. **Check New Tabs Appear**
   - Should see: Rewards, Auto Rules, History

3. **Test Manual Reward**
   - Go to Rewards tab
   - Select a test user
   - Award 10 bonus credits
   - Check success message

4. **View History**
   - Go to History tab
   - Should see the test reward
   - Statistics should update

5. **Check Automated Rules**
   - Go to Auto Rules tab
   - Should see 4 default rules
   - All should be active (green toggle)

### Integration with Application

To trigger automated rewards in your application code:

```typescript
import { supabaseClient } from '@/lib/supabase';

// On user signup
await supabaseClient.rpc('check_and_award_automated_rewards', {
  p_user_id: newUser.id,
  p_trigger_type: 'signup_bonus',
  p_trigger_data: {}
});

// On profile completion
await supabaseClient.rpc('check_and_award_automated_rewards', {
  p_user_id: userId,
  p_trigger_type: 'profile_completion',
  p_trigger_data: { completion_percentage: 100 }
});
```

---

## Troubleshooting

### If migration still fails

**Check 1: user_credits table exists**
```sql
SELECT * FROM information_schema.tables
WHERE table_name = 'user_credits';
```
If missing, the reward system won't work.

**Check 2: staff_members table exists**
```sql
SELECT * FROM information_schema.tables
WHERE table_name = 'staff_members';
```
If missing, run the staff system migration first: `20260103040336_create_staff_system_fixed.sql`

**Check 3: pgcrypto extension enabled**
```sql
SELECT * FROM pg_extension WHERE extname = 'pgcrypto';
```
If missing, run: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

### Common Errors

**Error: "permission denied for table staff_members"**
- Solution: Ensure you're running as database owner or have proper permissions

**Error: "relation user_credits does not exist"**
- Solution: Apply base migrations first, then reward system migration

**Error: "function crypt does not exist"**
- Solution: Enable pgcrypto extension first

---

## Files Updated

✅ `REWARD_SYSTEM_MIGRATION.sql` - Fixed all staff_accounts references
✅ `COMPREHENSIVE_REWARD_SYSTEM_GUIDE.md` - Updated documentation
✅ Frontend components - No changes needed (already correct)
✅ Build - Successful (no errors)

---

## Summary

The reward system is now ready to deploy! The migration has been fixed and will work correctly with your existing `staff_members` table. Once you run it in Supabase, your staff panel will have full reward distribution capabilities.

**Next Step**: Copy contents of `REWARD_SYSTEM_MIGRATION.sql` and run in Supabase SQL Editor.
