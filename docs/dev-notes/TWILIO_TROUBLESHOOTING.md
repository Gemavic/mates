# Twilio Calling - Troubleshooting Guide

## Quick Test

I've created a test tool for you. Open this file in your browser:

```
test-twilio-functions.html
```

This will tell you EXACTLY what's wrong:
- ✅ If credentials are configured correctly
- ❌ If credentials are missing
- ❌ If there are authentication issues
- ❌ If there are network problems

## Most Likely Issues

### Issue 1: Credentials Not Set in Supabase (90% probability)

**Symptoms:**
- Calls don't connect
- Console shows "Failed to get video/voice token"
- Test tool shows "CREDENTIALS NOT CONFIGURED"

**How to Fix:**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: "zdkxonufiuagkrhprnbd"
3. **Go to**: Project Settings → Edge Functions → Secrets
4. **Add these 4 secrets**:

```
TWILIO_ACCOUNT_SID = AC... (your Account SID from Twilio Console)
TWILIO_API_KEY = SK... (your API Key SID from Twilio Console)
TWILIO_API_SECRET = ... (your API Secret from Twilio Console)
TWILIO_TWIML_APP_SID = AP... (your TwiML App SID from Twilio Console)
```

5. **Where to find these in Twilio**:
   - Login to https://console.twilio.com
   - **Account SID**: Dashboard home page (top section)
   - **API Key & Secret**:
     - Go to Account → API Keys & Tokens
     - Click "Create API Key"
     - Copy both the SID and Secret immediately (secret shown once!)
   - **TwiML App SID**:
     - Go to Voice → TwiML Apps
     - Create new TwiML App if needed
     - Copy the SID (starts with AP...)

### Issue 2: Not Signed In (5% probability)

**Symptoms:**
- Get "Not authenticated" error
- Test tool says "NOT AUTHENTICATED"

**How to Fix:**
- Sign in to your app first
- Then try making calls

### Issue 3: Camera/Mic Permissions Denied (3% probability)

**Symptoms:**
- Video calls show black screen
- Browser shows permission denied in console

**How to Fix:**
1. Click the lock icon in browser address bar
2. Set Camera and Microphone to "Allow"
3. Refresh the page

### Issue 4: Rate Limiting (1% probability)

**Symptoms:**
- Error message: "Rate limit exceeded"

**How to Fix:**
- Wait 1 minute and try again
- Rate limits reset every 60 seconds

### Issue 5: Wrong Browser (1% probability)

**Symptoms:**
- Weird WebRTC errors
- Calls don't connect

**How to Fix:**
- Use Chrome, Firefox, or Edge (Safari has WebRTC issues)

## Step-by-Step Debugging Process

### Step 1: Open Test Tool

1. Open `test-twilio-functions.html` in your browser
2. Click "Show System Info" - should show you're signed in
3. If not signed in:
   - Open your app in another tab
   - Sign in
   - Come back to test tool

### Step 2: Test Video Token

1. Click "Test Video Token"
2. **If SUCCESS**: Credentials are configured correctly!
3. **If "CREDENTIALS NOT CONFIGURED"**: Follow Issue 1 fix above
4. **If "NOT AUTHENTICATED"**: Follow Issue 2 fix above
5. **If other error**: Copy the full error message and check below

### Step 3: Test Voice Token

1. Click "Test Voice Token"
2. Same process as video token

### Step 4: Test Actual Call

If both tokens work:
1. Go to Video Chat in your app
2. Click "Call" on any user
3. Allow camera/microphone when prompted
4. Should see video connecting

## What Each Error Means

### "Failed to get video token"
- Edge function couldn't generate token
- Usually means credentials not set
- Run test tool to confirm

### "Twilio credentials not configured"
- Definitely means credentials missing in Supabase
- Follow Issue 1 fix above

### "Rate limit exceeded"
- You're making too many requests
- Wait 60 seconds
- Should be rare in normal use

### "Unauthorized" or "No authorization header"
- Not signed in
- Session expired
- Sign in again

### "DOMException: Permission denied"
- Browser blocked camera/microphone
- Click lock icon → Allow permissions

### "Cannot read properties of null"
- Usually means trying to call before initialization
- Wait for "Initializing..." to complete for audio
- Video doesn't need initialization

## How to Verify It's Working

### Video Calls Working:
1. Go to Video Chat
2. See list of users
3. Click "Call" on an online user
4. Browser asks for camera/mic permission → Click "Allow"
5. See "Connecting..." message
6. Within 5 seconds, see:
   - Your video in small window (bottom right)
   - Placeholder for remote user (main window)
7. When other user joins, their video appears
8. Can toggle camera/mic on/off
9. Can end call

### Audio Calls Working:
1. Go to Audio Chat
2. Wait for "Initializing..." to complete (1-2 seconds)
3. Button changes from "Initializing..." to "Call"
4. Click "Call" on an online user
5. See "Connecting..." message
6. Within 5 seconds, call connects
7. Can hear audio
8. Can toggle mic mute
9. Can end call

## Common Mistakes

### ❌ Wrong: Added credentials to .env file
- **Why wrong**: Edge functions don't read .env files
- **Correct**: Add to Supabase Dashboard → Edge Functions → Secrets

### ❌ Wrong: Used Supabase API keys for Twilio
- **Why wrong**: Need Twilio credentials, not Supabase credentials
- **Correct**: Get credentials from console.twilio.com

### ❌ Wrong: Copied credentials with extra spaces
- **Why wrong**: Extra spaces break the credentials
- **Correct**: Copy exactly, no spaces before/after

### ❌ Wrong: Used Auth Token instead of API Secret
- **Why wrong**: Need API Key/Secret pair, not Auth Token
- **Correct**: Create API Key in Twilio Console → API Keys section

### ❌ Wrong: Used phone number instead of TwiML App SID
- **Why wrong**: Voice needs TwiML App SID (starts with AP...)
- **Correct**: Create TwiML App in Twilio Console → Voice → TwiML Apps

## Still Not Working?

If you've done all the above and it still doesn't work:

1. **Check Browser Console** (F12 → Console tab):
   - Copy any red error messages
   - Look for specific error text

2. **Check Network Tab** (F12 → Network tab):
   - Filter: "twilio"
   - Click on the request
   - Check Response tab
   - Copy the response

3. **Check Supabase Logs**:
   - Go to Supabase Dashboard
   - Edge Functions → twilio-video-token or twilio-voice-token
   - Check logs for errors

4. **Verify Credentials Again**:
   - Double-check each credential in Supabase matches Twilio
   - No typos, no extra spaces
   - Correct variable names (case-sensitive!)

## Quick Reference: What Needs to Happen

For a video call to work:
```
1. User clicks "Call"
2. Frontend calls twilioVideo.ts → getToken()
3. getToken() fetches: /functions/v1/twilio-video-token
4. Edge function checks: Are credentials set?
   - ❌ No → Returns error "credentials not configured"
   - ✅ Yes → Generates JWT token
5. Edge function returns token to frontend
6. Frontend connects to Twilio with token
7. Twilio creates room
8. WebRTC connection established
9. Video streams between users
```

If it fails at step 4, credentials aren't set.
If it fails at step 5, credentials are wrong.
If it fails at step 6-9, network or WebRTC issue.

## Testing with Two Users

To test if calls actually work between users:

1. **Option A: Two Browsers**
   - Open app in Chrome
   - Open app in Firefox (or Chrome Incognito)
   - Sign in as different users in each
   - Start call from one side

2. **Option B: Two Devices**
   - Open app on your computer
   - Open app on your phone
   - Sign in as different users
   - Start call from either side

3. **What Should Happen:**
   - User A clicks "Call" on User B
   - User A sees "Connecting..."
   - User B's phone/browser shows incoming call
   - User B clicks "Accept"
   - Video/audio streams between them
   - Both see/hear each other

## Summary

**Most likely problem**: Twilio credentials not set in Supabase Edge Functions secrets.

**Quick fix**:
1. Open test tool → Run tests → See exact error
2. Go to Supabase → Add credentials
3. Test again → Should work!

The code is correct. The edge functions are deployed. It's just waiting for the credentials!
