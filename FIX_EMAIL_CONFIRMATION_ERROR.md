# Fix: Error Sending Confirmation Email

## Problem

You're seeing this error when users sign up:
```
Error sending confirmation email
Failed to invite user: Failed to make POST request to "https://zdkxonufiuagkrhprnbd.supabase.co/auth/v1/invite"
```

**Root Cause**: Supabase Auth is trying to send confirmation emails, but no email provider (SMTP) is configured.

## Quick Fix: Disable Email Confirmation

### Option 1: Disable in Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd

2. Navigate to **Authentication** → **Providers** → **Email**

3. Find **"Confirm email"** setting

4. **Turn OFF** the toggle for "Confirm email"

5. Click **Save**

6. Test signup again - should work immediately!

### Option 2: Configure Email Provider (For Production)

If you want email confirmations (recommended for production), set up an email provider:

#### Using Resend (Easiest)

1. Sign up at https://resend.com (free tier: 100 emails/day)

2. Get your API key from Resend dashboard

3. In Supabase Dashboard:
   - Go to **Authentication** → **Providers** → **Email**
   - Scroll to **Email Settings**
   - Select **"Use custom SMTP provider"**

4. Configure SMTP:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [Your Resend API Key]
   Sender email: noreply@yourdomain.com
   Sender name: Dates
   ```

5. Enable **"Confirm email"**

6. Click **Save**

#### Using SendGrid (Alternative)

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)

2. Create an API key with "Mail Send" permissions

3. In Supabase Dashboard:
   - Go to **Authentication** → **Providers** → **Email**
   - Select **"Use custom SMTP provider"**

4. Configure SMTP:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: [Your SendGrid API Key]
   Sender email: noreply@yourdomain.com
   Sender name: Dates
   ```

5. Enable **"Confirm email"**

6. Click **Save**

## Current App Behavior

Your app already handles email confirmation errors gracefully:

1. If email confirmation fails during signup:
   - Shows: "Account created! Please check your email to verify your account, or sign in directly."
   - Automatically redirects to sign-in page
   - User can sign in even without email confirmation (if disabled)

2. Code handles this in `src/screens/Auth/SignUp.tsx`:
   ```typescript
   // Lines 119-135 handle email confirmation errors
   if (error.message?.includes('confirmation') || error.message?.includes('email')) {
     errorMessage = 'Account created! Please check your email to verify your account, or sign in directly.';
     // Shows success message and redirects to sign in
   }
   ```

## Why This Happens

Supabase Auth has email confirmation **enabled by default**, but requires you to configure an email provider to actually send those emails. You have three options:

1. **Disable email confirmation** (fastest, works immediately)
2. **Configure SMTP** (recommended for production)
3. **Keep it as-is** (users see the error but can still sign in)

## Testing After Fix

### If you disabled email confirmation:
1. Go to signup page
2. Enter email and password
3. Click "Create Account"
4. Should see: "Account created successfully! Please sign in."
5. Can immediately sign in without email verification

### If you configured SMTP:
1. Go to signup page
2. Enter email and password
3. Click "Create Account"
4. Should receive confirmation email
5. Click link in email to verify
6. Then sign in

## Additional Notes

- **For development**: Disable email confirmation (easier testing)
- **For production**: Enable email confirmation with SMTP (better security)
- **Anonymous users**: Not affected by this setting (they don't use email)
- **Existing users**: Can still sign in regardless of this setting

## Need Help?

If you continue to see errors after disabling email confirmation:

1. Clear browser cache and cookies
2. Try in incognito/private browser window
3. Check Supabase Auth logs in dashboard:
   - Go to **Authentication** → **Logs**
   - Look for recent errors
   - Share the error details for further troubleshooting
