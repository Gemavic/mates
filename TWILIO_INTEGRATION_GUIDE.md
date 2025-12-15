# Twilio Integration Setup Guide

## Overview

Your application now has full Twilio integration for:
- Video calls (WebRTC)
- Voice calls (Audio chat)
- SMS verification (Phone verification)

## Architecture

```
Frontend (Vite React)
    ↓
Supabase Edge Functions (Secure Token Generation)
    ↓
Twilio Services (Video, Voice, SMS)
```

## 1. Twilio Account Setup

### Step 1: Create Twilio Account
1. Go to [Twilio Console](https://www.twilio.com/console)
2. Sign up for a free trial account (gets you $15 credit)
3. Verify your email and phone number

### Step 2: Get Your Credentials

#### For SMS Verification:
1. Go to [Twilio Console Dashboard](https://console.twilio.com/)
2. Find these credentials:
   - **Account SID** (starts with "AC...")
   - **Auth Token** (click to reveal)
3. Get a phone number:
   - Go to Phone Numbers → Manage → Buy a Number
   - Select a US number (free in trial)
   - Note the phone number with country code (+1...)

#### For Video & Voice Calls:
1. Go to [API Keys](https://console.twilio.com/us1/develop/api-keys)
2. Create a new API Key:
   - Click "Create API Key"
   - Give it a name (e.g., "Dating App Video/Voice")
   - Copy the **SID** and **Secret** (save immediately, you can't see it again!)

#### For Voice Calls (Optional):
1. Go to [TwiML Apps](https://console.twilio.com/us1/develop/voice/manage/twiml-apps)
2. Create a new TwiML App for voice calling
3. Copy the **Application SID**

## 2. Configure Supabase Edge Functions

### Option A: Using Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **mates** (zdkxonufiuagkrhprnbd)
3. Navigate to **Edge Functions** → **Secrets**
4. Add these secrets:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here
TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (optional)
```

### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref zdkxonufiuagkrhprnbd

# Set secrets
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here
supabase secrets set TWILIO_PHONE_NUMBER=+1234567890
supabase secrets set TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_API_SECRET=your_api_secret_here
supabase secrets set TWILIO_TWIML_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. Edge Functions Deployed

The following edge functions are ready to use:

### 1. send-sms-verification
- **Purpose**: Send SMS verification codes
- **Endpoint**: `/functions/v1/send-sms-verification`
- **Status**: ✅ Deployed

### 2. twilio-video-token
- **Purpose**: Generate tokens for video calls
- **Endpoint**: `/functions/v1/twilio-video-token`
- **Status**: ✅ Deployed

### 3. twilio-voice-token
- **Purpose**: Generate tokens for voice calls
- **Endpoint**: `/functions/v1/twilio-voice-token`
- **Status**: ✅ Deployed

## 4. Testing the Integration

### Test SMS Verification
1. Go to your Verification screen
2. Enter a phone number
3. Click "Send Code"
4. Check your phone for the SMS

**Note**: Trial accounts can only send SMS to verified phone numbers. Add your test numbers at:
[Verified Caller IDs](https://console.twilio.com/us1/develop/phone-numbers/manage/verified)

### Test Video Calls
1. Navigate to Video Chat screen
2. The system will request a video token
3. Start a call to see it in action

### Test Voice Calls
1. Navigate to Audio Chat screen
2. The system will request a voice token
3. Start a call to test audio

## 5. Frontend Integration

The frontend is already configured to use these services via:

### TwilioService (src/lib/twilioConfig.ts)
```typescript
// Get video token
const token = await TwilioService.getVideoToken(roomName, userId);

// Get voice token
const token = await TwilioService.getVoiceToken(userId);

// Send SMS
const success = await TwilioService.sendSMSVerification(phoneNumber, otp);
```

## 6. Cost Information

### Twilio Pricing (after free trial):
- **SMS**: ~$0.0075 per message
- **Video**: ~$0.004 per participant-minute
- **Voice**: ~$0.013 per minute

### Free Trial Limits:
- $15 credit
- Can only call/SMS verified numbers
- "Sent from a Twilio trial account" message prefix on SMS

### To Remove Limitations:
1. Add payment method in Twilio Console
2. Upgrade from trial to paid account
3. No more restrictions on who can receive calls/SMS

## 7. Production Checklist

Before going live:

- [ ] Upgrade Twilio account from trial to paid
- [ ] Set up proper TwiML apps for voice
- [ ] Configure webhook URLs for call status
- [ ] Set up Twilio phone number(s)
- [ ] Test all features with real phone numbers
- [ ] Monitor Twilio usage in console
- [ ] Set up billing alerts in Twilio
- [ ] Review and accept Twilio's messaging regulations

## 8. Security Notes

✅ **What's Secure:**
- All Twilio credentials stored in Supabase Edge Function secrets
- Never exposed to frontend
- JWT authentication required for all endpoints
- Tokens are short-lived (1-4 hours)

✅ **Best Practices:**
- Tokens are generated per-call/per-session
- Users must be authenticated via Supabase Auth
- All API calls go through secure edge functions

## 9. Troubleshooting

### SMS Not Sending
- Verify TWILIO_ACCOUNT_SID starts with "AC"
- Verify TWILIO_AUTH_TOKEN is correct
- Check phone number is in E.164 format (+1234567890)
- For trial accounts, verify the recipient number at Twilio Console

### Video/Voice Not Working
- Verify TWILIO_API_KEY and TWILIO_API_SECRET are set
- Check browser permissions for camera/microphone
- Ensure users are authenticated
- Check browser console for errors

### Edge Function Errors
- Check Edge Function logs in Supabase Dashboard
- Verify all secrets are set correctly
- Ensure no typos in secret names

## 10. Support Resources

- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Video Quick Start](https://www.twilio.com/docs/video/javascript-getting-started)
- [Twilio Voice Quick Start](https://www.twilio.com/docs/voice/sdks/javascript/get-started)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## Next Steps

1. Add Twilio credentials to Supabase secrets
2. Test each feature (SMS, Video, Voice)
3. Integrate Twilio Video/Voice SDKs into React components
4. Set up proper error handling and user feedback
5. Consider upgrading Twilio account for production use
