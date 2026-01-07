# Video & Audio Calls Setup Guide

## Overview

Video and audio calling features require **Twilio** integration. Twilio provides the real-time communication infrastructure that enables users to make video and voice calls directly through the app.

## What's Already Done

✅ Twilio SDK packages installed (`twilio-video`, `@twilio/voice-sdk`)
✅ Utility classes created (`twilioVideo.ts`, `twilioVoice.ts`)
✅ Edge functions deployed (`twilio-video-token`, `twilio-voice-token`)
✅ UI components ready (VideoChat, AudioChat)

## What You Need to Do

### Step 1: Create a Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Sign up for a free account
3. Verify your phone number and email

### Step 2: Get Your Twilio Credentials

After signing up, you need to collect these credentials:

#### A. Account SID and Auth Token
1. Go to https://console.twilio.com/
2. On the dashboard, you'll see:
   - **Account SID** (starts with "AC...")
   - **Auth Token** (click to reveal)

#### B. API Key and Secret
1. Go to https://console.twilio.com/project/api-keys
2. Click "Create API Key"
3. Choose "Standard" key type
4. Give it a name (e.g., "Dating App Video/Voice")
5. Save both:
   - **API Key SID** (starts with "SK...")
   - **API Secret** (only shown once - copy immediately!)

#### C. TwiML App SID (for Voice Calls)
1. Go to https://console.twilio.com/develop/voice/manage/twiml-apps
2. Click "Create new TwiML App"
3. Set:
   - **Friendly Name**: "Dating App Voice"
   - **Voice Request URL**: `https://your-domain.com/voice/incoming` (or leave blank for now)
4. Click "Create"
5. Copy the **TwiML App SID** (starts with "AP...")

### Step 3: Add Credentials to Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add these environment variables:

```
TWILIO_ACCOUNT_SID=AC... (your Account SID)
TWILIO_API_KEY=SK... (your API Key SID)
TWILIO_API_SECRET=... (your API Secret)
TWILIO_TWIML_APP_SID=AP... (your TwiML App SID for voice)
```

4. Click "Save" for each one

### Step 4: Redeploy Edge Functions

The edge functions need to be redeployed to pick up the new environment variables:

```bash
# Deploy video token function
supabase functions deploy twilio-video-token

# Deploy voice token function
supabase functions deploy twilio-voice-token
```

### Step 5: Test the Integration

1. **Test Video Calls**:
   - Navigate to the Video Chat screen
   - Click "Call" on an available match
   - You should see a real video connection establish

2. **Test Audio Calls**:
   - Navigate to the Audio Chat screen
   - Click "Call" on an available match
   - You should hear the call connecting

## How It Works

### Video Calls
1. User clicks "Call" button
2. Frontend requests a token from `twilio-video-token` edge function
3. Edge function generates a JWT token with Twilio credentials
4. Frontend uses token to connect to Twilio Video Room
5. WebRTC connection established between users
6. Video/audio streams directly peer-to-peer

### Audio Calls
1. User clicks "Call" button
2. Frontend requests a token from `twilio-voice-token` edge function
3. Edge function generates a JWT token with Twilio credentials
4. Frontend uses token to initialize Twilio Voice Device
5. Voice call connects through Twilio's infrastructure
6. Audio streams between users

## Pricing

### Twilio Free Trial
- Starts with **$15.50 in free credit**
- Good for testing and development
- Can make approximately:
  - **150 minutes** of video calls
  - **300 minutes** of voice calls

### Production Pricing (After Trial)
- **Video**: ~$0.0015/min per participant (~$0.09/hour for 2 people)
- **Voice**: ~$0.013/min per leg (~$1.56/hour for 2 people)

## Troubleshooting

### "Twilio credentials not configured" Error
- You haven't added the environment variables to Supabase
- Follow Step 3 above

### "Failed to get video/voice token" Error
- Check that edge functions are deployed
- Verify environment variables are set correctly in Supabase
- Check Supabase Function Logs for detailed errors

### Video/Audio Not Working
- Ensure browser has camera/microphone permissions
- Try on a different browser (Chrome/Firefox recommended)
- Check console logs for specific errors

### No Connection Between Users
- Both users need to be authenticated
- Both users need to be in the same "room" for video
- For voice, both need valid Twilio tokens

## Security Notes

- ✅ Tokens are generated server-side (edge functions)
- ✅ Tokens expire after a set time (4 hours for video, 1 hour for voice)
- ✅ Each token is user-specific and can't be reused
- ✅ Credentials never exposed to frontend
- ✅ Rate limiting applied to prevent abuse

## Additional Resources

- [Twilio Video Docs](https://www.twilio.com/docs/video)
- [Twilio Voice Docs](https://www.twilio.com/docs/voice)
- [Twilio Console](https://console.twilio.com/)

## Support

If you encounter issues:
1. Check the Supabase Edge Function logs
2. Check browser console for errors
3. Verify all credentials are correct
4. Make sure you have credits in your Twilio account
