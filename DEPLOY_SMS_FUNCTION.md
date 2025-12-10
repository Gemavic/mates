# Deploy SMS Verification Function

## Step 1: Run Database Migration (Required First)

1. Go to: https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/sql/new
2. Copy ALL content from `FIX_VERIFICATION_SCHEMA.sql`
3. Click **Run**
4. You should see: "Verification schema fixed!"

## Step 2: Deploy Edge Function with Twilio

### Option A: Deploy via Supabase Dashboard (Easiest)

1. **Go to Edge Functions:**
   https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/functions

2. **Create New Function:**
   - Click "Create a new function"
   - Name: `send-sms-verification`
   - Copy code from: `supabase/functions/send-sms-verification/index.ts`
   - Click "Deploy"

3. **Add Secrets (CRITICAL):**
   - Click on your `send-sms-verification` function
   - Go to "Secrets" tab
   - Add these three secrets:

   ```
   Name: TWILIO_ACCOUNT_SID
   Value: AC57a5c62757d0a75b1750eb19c5f09b22

   Name: TWILIO_AUTH_TOKEN
   Value: dce9a111c4b220a4136f789b5017db1a

   Name: TWILIO_PHONE_NUMBER
   Value: +12093486842
   ```

4. **Save and Redeploy:**
   - After adding secrets, redeploy the function

### Option B: Deploy via Supabase CLI

```bash
# Install CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref zdkxonufiuagkrhprnbd

# Set secrets
supabase secrets set TWILIO_ACCOUNT_SID=AC57a5c62757d0a75b1750eb19c5f09b22
supabase secrets set TWILIO_AUTH_TOKEN=dce9a111c4b220a4136f789b5017db1a
supabase secrets set TWILIO_PHONE_NUMBER=+12093486842

# Deploy function
supabase functions deploy send-sms-verification
```

## Step 3: Test the Function

1. Refresh your app
2. Go to the Verification page
3. Enter your phone number (with country code, e.g., +12345678900)
4. Click "Send Verification Code"
5. You should receive an SMS within seconds!

## Troubleshooting

### Function Not Found
- Make sure you completed Step 2
- Check function name is exactly: `send-sms-verification`

### SMS Not Received
- **Trial Account Restriction:** Twilio trial accounts can only send SMS to verified phone numbers
  - Add your phone number at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified
- Check phone number format includes country code (e.g., +12345678900)
- View Twilio logs: https://console.twilio.com/us1/monitor/logs/sms

### "Failed to send verification code"
- Check browser console for detailed error
- Verify all three secrets are set correctly
- Make sure function is deployed

## Monitor Function Logs

View real-time logs:
https://supabase.com/dashboard/project/zdkxonufiuagkrhprnbd/functions/send-sms-verification/logs

## Success!

Once deployed, your verification system will:
- Send real SMS codes to any phone number
- Store verification data securely in the database
- Mark users as verified after completing all steps
- Work seamlessly across the entire app

Your verification system is production-ready!
