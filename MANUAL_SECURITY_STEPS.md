# Manual Security Configuration Steps

## Overview

The following security improvements require manual configuration in the Supabase Dashboard. These cannot be automated via SQL migrations.

**Time Required**: ~10 minutes
**Priority**: High
**When**: Complete these before production launch

---

## Step 1: Update Postgres Version (5 min)

**Priority**: 🔴 HIGH - Security patches available

### Instructions

1. Go to: https://supabase.com/dashboard/project/kgwjjzbtyaqigrldtiaj
2. Navigate to: **Database** → **Settings**
3. Look for: "Postgres Version" section
4. Click: **"Check for Updates"**
5. If updates available:
   - Review release notes
   - Schedule maintenance window (low-traffic time)
   - Click **"Update Now"**
   - Wait for completion (typically 5-10 minutes)

### Expected Result
- Postgres version updated to latest with security patches
- Brief downtime during update (~2-5 minutes)
- All data preserved

### Verification
- Check version in Database → Settings
- Ensure version is latest available
- Test app functionality after update

---

## Step 2: Configure OTP Expiry (2 min)

**Priority**: 🟡 MEDIUM - Security best practice

### Current Issue
- OTP (One-Time Password) expiry set to >1 hour
- Increases risk of token theft/reuse

### Recommended Setting
- 15-30 minutes

### Instructions

1. Go to: https://supabase.com/dashboard/project/kgwjjzbtyaqigrldtiaj
2. Navigate to: **Authentication** → **Providers**
3. Click on: **Email**
4. Scroll to: **"OTP Expiry"** setting
5. Change to: **1800** seconds (30 minutes) or **900** seconds (15 minutes)
6. Click: **Save**

### Why This Matters
- Shorter window for attackers to use stolen OTPs
- Better security without impacting user experience
- Industry best practice

### Verification
- Try password reset flow
- Verify OTP expires after set time
- Confirm users can still complete auth within window

---

## Step 3: Enable Additional MFA Options (3 min)

**Priority**: 🟡 MEDIUM - Enhanced security

### Current Issue
- Limited MFA options available
- Reduces user security options

### Recommended Configuration
- Enable TOTP (Time-based One-Time Password)
- Consider SMS (if budget allows)

### Instructions

1. Go to: https://supabase.com/dashboard/project/kgwjjzbtyaqigrldtiaj
2. Navigate to: **Authentication** → **Multi-Factor Authentication**
3. Enable: **TOTP** (Time-based One-Time Password)
   - Toggle ON
   - Configure settings (use defaults)
   - Save
4. Optional: Enable **SMS** (requires Twilio setup)
   - Costs apply per SMS
   - Good for non-technical users
   - Configure Twilio credentials

### MFA Options Explained

**TOTP (Recommended)**
- Free
- Works with Google Authenticator, Authy, etc.
- Most secure option
- No ongoing costs

**SMS (Optional)**
- Costs per message
- Easier for non-technical users
- Less secure than TOTP
- Requires phone number

### User Experience
- Users can enable MFA in their settings
- Recommended but not forced (for now)
- Can make mandatory later if needed

### Verification
- Go to your user settings
- Enable MFA on test account
- Verify login requires MFA code
- Test backup codes work

---

## Step 4: Review Authentication Settings (2 min)

**Priority**: 🟢 LOW - Verification

### Settings to Check

1. **Anonymous Sign-ins**
   - Location: Authentication → Settings
   - Should be: **DISABLED**
   - Why: Dating app requires real accounts

2. **Email Confirmations**
   - Location: Authentication → Providers → Email
   - Current: Can be enabled or disabled
   - MVP Recommendation: Disabled (faster onboarding)
   - Production Recommendation: Enabled (better quality users)

3. **Rate Limits**
   - Location: Authentication → Rate Limits
   - Verify defaults are reasonable:
     - Sign-ups: 10 per hour per IP
     - Sign-ins: 20 per hour per IP
     - Password resets: 5 per hour per IP

### Instructions

1. Go to: https://supabase.com/dashboard/project/kgwjjzbtyaqigrldtiaj
2. Navigate to: **Authentication** → **Settings**
3. Review each setting
4. Adjust if needed
5. Save changes

---

## Step 5: Run Security Audit (1 min)

**Priority**: 🟢 LOW - Verification

### Purpose
Verify all anonymous access policies are correct.

### Instructions

1. Go to: https://supabase.com/dashboard/project/kgwjjzbtyaqigrldtiaj
2. Navigate to: **SQL Editor**
3. Create new query
4. Run this SQL:

```sql
SELECT * FROM security_audit_anonymous_policies();
```

### Expected Output

| table_name               | policy_name              | policy_command | security_risk           |
|-------------------------|--------------------------|----------------|------------------------|
| newsletter_subscriptions | Anyone can subscribe     | INSERT         | ✅ OK - Marketing      |

### What to Look For
- ✅ Only newsletter_subscriptions should appear
- ✅ Only INSERT command should be allowed
- ❌ No sensitive tables (user_profiles, user_photos, etc.)

### If You See Issues
- Review the policy
- Check if it's intentional
- Remove if not needed
- Document if intentional

---

## Quick Checklist

Use this checklist to track progress:

- [ ] **Postgres Updated** - Latest version with security patches
- [ ] **OTP Expiry Set** - 15-30 minutes configured
- [ ] **TOTP Enabled** - Multi-factor authentication available
- [ ] **Anonymous Sign-ins** - Verified disabled
- [ ] **Rate Limits** - Reviewed and appropriate
- [ ] **Security Audit** - Run and verified clean

---

## Timeline

| Task | Time | Priority |
|------|------|----------|
| Update Postgres | 5 min | 🔴 High |
| Configure OTP | 2 min | 🟡 Medium |
| Enable MFA | 3 min | 🟡 Medium |
| Review Settings | 2 min | 🟢 Low |
| Run Audit | 1 min | 🟢 Low |
| **Total** | **13 min** | - |

---

## Support

### If Postgres Update Fails
1. Check Supabase status page
2. Contact Supabase support
3. Schedule update during maintenance window
4. Keep current version until resolved

### If MFA Setup Issues
1. Review Supabase MFA documentation
2. Test with personal account first
3. Start with TOTP only (simplest)
4. Add SMS later if needed

### If Settings Don't Save
1. Check browser console for errors
2. Verify you have admin access
3. Try different browser
4. Contact Supabase support

---

## Next Steps After Completion

1. ✅ Test all auth flows (sign up, sign in, password reset)
2. ✅ Enable MFA on admin accounts
3. ✅ Monitor auth logs for issues
4. ✅ Schedule monthly security reviews
5. ✅ Document any custom configurations

---

## Summary

These manual steps complete the security hardening of your dating app:

**Automated** (via SQL migrations):
- ✅ Removed 43 unused indexes
- ✅ Fixed duplicate RLS policies
- ✅ Reviewed anonymous access
- ✅ Created audit tools

**Manual** (via Supabase Dashboard):
- 🔴 Update Postgres version
- 🟡 Configure OTP expiry
- 🟡 Enable MFA options
- 🟢 Review auth settings
- 🟢 Run security audit

**Time**: 13 minutes total
**Result**: Production-ready security! 🔒
