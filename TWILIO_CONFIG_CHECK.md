# Twilio Configuration Check

## Overview

This document outlines the Twilio configuration requirements and how to verify proper setup.

## Required Environment Variables

Your Supabase Edge Functions need these environment variables configured:

### For Video Calls
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_API_KEY` - Your Twilio API Key SID
- `TWILIO_API_SECRET` - Your Twilio API Secret

### For Voice Calls
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_API_KEY` - Your Twilio API Key SID
- `TWILIO_API_SECRET` - Your Twilio API Secret
- `TWILIO_TWIML_APP_SID` - Your TwiML App SID (optional but recommended)

## Where to Set These Variables

### In Supabase Dashboard:
1. Go to your Supabase Dashboard
2. Select your project
3. Navigate to: **Project Settings** → **Edge Functions** → **Secrets**
4. Add each environment variable with its value

### Important Notes:
- These are **Supabase Edge Function secrets**, NOT local .env variables
- The local .env file only needs VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Edge function secrets are stored securely in Supabase and are NOT in your codebase

## How to Get Twilio Credentials

1. **Log in to Twilio Console**: https://console.twilio.com/
2. **Account SID**: Found on the console dashboard
3. **API Key & Secret**:
   - Go to Account → API Keys & Tokens
   - Create a new API Key
   - Save the API Key SID and API Secret (secret shown only once!)
4. **TwiML App SID** (for voice calls):
   - Go to Voice → TwiML Apps
   - Create a new TwiML App
   - Use the SID from the created app

## Testing Your Configuration

### Option 1: Use the Test Page
1. Open `test-twilio-config.html` in a web browser
2. The tests will run automatically
3. Check the results for each feature (video/voice)

### Option 2: Manual Test
You can test by trying to make a video or voice call in the app:
- If credentials are missing: You'll see a friendly error message
- If credentials are valid: The call will initiate successfully

## Edge Functions Status

Both Twilio edge functions are deployed and active:
- ✅ `twilio-video-token` - ACTIVE
- ✅ `twilio-voice-token` - ACTIVE

## What Each Function Does

### twilio-video-token
- Generates JWT tokens for video chat rooms
- Required for: Video chat feature
- Checks: TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET

### twilio-voice-token
- Generates JWT tokens for voice calls
- Required for: Audio call feature
- Checks: TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID

## Configuration States

### ✅ Fully Configured
Both functions return success with valid tokens.
**Result**: Video and voice calls work perfectly.

### ⚠️ Not Configured
Functions return `testMode: true` with error messages.
**Result**: Friendly error messages shown to users when they try to call.

### ❌ Partially Configured
One function works, the other doesn't.
**Result**: Only one feature (video OR voice) works.

## Troubleshooting

### "Credentials not configured" error
- Check that all 3 required variables are set in Supabase Edge Function secrets
- Make sure there are no typos in variable names
- Verify the secrets are saved (they don't show values after saving)

### "Failed to generate token" error
- Double-check your Twilio credentials are valid
- Verify API Key has the correct permissions
- Ensure Account SID matches the one in Twilio Console

### Voice calls fail but video works
- Check that TWILIO_TWIML_APP_SID is set
- Verify the TwiML App exists in Twilio Console
- Ensure the App SID is correct

## Next Steps After Configuration

Once all credentials are configured:
1. Run the test page to verify everything works
2. Try making a test video call in the app
3. Try making a test voice call in the app
4. Check the browser console for any errors

## Support Resources

- Twilio Video Docs: https://www.twilio.com/docs/video
- Twilio Voice Docs: https://www.twilio.com/docs/voice
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
