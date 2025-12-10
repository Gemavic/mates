# Fix Verification System - Complete Guide

## Issues Found

1. **Database Schema Missing**: The `verification_requests` table doesn't exist
2. **SMS Edge Function Not Deployed**: The SMS verification function needs to be deployed
3. **Twilio Configuration**: SMS service needs proper setup

## Step 1: Fix Database Schema

Run the SQL migration to create the verification_requests table:

1. Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql/new
2. Copy the contents of `FIX_VERIFICATION_SCHEMA.sql`
3. Paste and click **Run**

This will:
- Create `verification_requests` table with all required columns
- Set up RLS policies for user access
- Create storage bucket for verification documents
- Add missing columns to user_profiles

## Step 2: Deploy SMS Edge Function

### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref zdkxonufiuagkrhprnbd

# Deploy the edge function
supabase functions deploy send-sms-verification
```

### Option B: Manual Deployment via Dashboard

1. Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/functions
2. Click **Create a new function**
3. Name: `send-sms-verification`
4. Copy the code from `supabase/functions/send-sms-verification/index.ts`
5. Click **Deploy function**

## Step 3: Configure Twilio (Optional but Recommended)

To enable real SMS sending:

1. Sign up for Twilio: https://www.twilio.com/try-twilio
2. Get your credentials from: https://console.twilio.com/
3. Add secrets to your edge function:

Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/functions

Click on `send-sms-verification` function, then **Secrets** tab, and add:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### Test Mode (No Twilio)

If you don't configure Twilio, the app will work in **test mode**:
- Verification codes will be shown in popup alerts
- No actual SMS will be sent
- You can still complete verification for testing

## Step 4: Verify Fix

After completing the above steps:

1. **Test Database**: Try to sign up/log in - you should not see database errors
2. **Test SMS**: Click "Send Verification Code" - you should either:
   - Receive an SMS (if Twilio configured)
   - See the code in an alert popup (test mode)
3. **Complete Verification**: Upload a selfie, verify phone, and complete the process

## What Was Fixed

### Database Schema
- Created `verification_requests` table with proper structure
- Added RLS policies for secure access
- Created storage bucket for verification documents
- Fixed missing columns in user_profiles

### SMS Verification
- Edge function ready to deploy
- Supports both Twilio (production) and test mode (development)
- Proper error handling and user feedback
- OTP expires after 10 minutes

### Security
- RLS ensures users only see their own verification data
- Storage policies protect document uploads
- Authentication required for all operations

## Troubleshooting

### "Failed to send verification code"
- Check if edge function is deployed
- Check browser console for detailed errors
- If in test mode, code will appear in alert popup

### "Column does not exist" errors
- Make sure you ran `FIX_VERIFICATION_SCHEMA.sql`
- Check SQL Editor history to confirm migration ran successfully

### SMS not received (with Twilio)
- Verify Twilio credentials are correct
- Check phone number format (needs country code, e.g., +1234567890)
- Trial accounts can only send to verified numbers
- Check Twilio console logs: https://console.twilio.com/us1/monitor/logs/sms

## Next Steps

Once verification is working:
1. Test the complete flow from signup to verified status
2. Configure production Twilio account for real SMS
3. Monitor edge function logs for any issues
4. Test on mobile devices to ensure SMS delivery

## Support

- Email: support@dates.care
- Phone: +1-289-270-9919

Your verification system is now ready to use!
