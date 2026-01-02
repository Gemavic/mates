# Quick OAuth Setup Guide

Now that you've completed your OAuth provider setup, here's what you need to do to activate them:

## Quick Setup Steps

### 1. Google OAuth (5 minutes)

**Get Credentials:**
1. Visit: https://console.cloud.google.com/
2. Create project or select existing
3. Go to: APIs & Services → Credentials
4. Create OAuth 2.0 Client ID → Web application
5. Add redirect: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
6. Copy **Client ID** and **Client Secret**

**Configure Supabase:**
1. Open your Supabase Dashboard
2. Go to: Authentication → Providers → Google
3. Toggle "Enable Google provider" ON
4. Paste Client ID and Client Secret
5. Click Save

---

### 2. Facebook OAuth (5 minutes)

**Get Credentials:**
1. Visit: https://developers.facebook.com/
2. Create app → Choose "Consumer"
3. Add Product: Facebook Login
4. Settings → Basic: Copy **App ID** and **App Secret**
5. Facebook Login → Settings: Add redirect URI:
   `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`

**Configure Supabase:**
1. Open your Supabase Dashboard
2. Go to: Authentication → Providers → Facebook
3. Toggle "Enable Facebook provider" ON
4. Paste App ID and App Secret
5. Click Save

---

### 3. Apple OAuth (10 minutes)

**Get Credentials:**
1. Visit: https://developer.apple.com/
2. Certificates, Identifiers & Profiles
3. Create Service ID with "Sign in with Apple"
4. Add redirect: `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`
5. Create Key → Enable "Sign in with Apple"
6. Download .p8 key file
7. Note your **Service ID**, **Team ID**, **Key ID**

**Configure Supabase:**
1. Open your Supabase Dashboard
2. Go to: Authentication → Providers → Apple
3. Toggle "Enable Apple provider" ON
4. Enter Service ID, Team ID, Key ID
5. Copy entire contents of .p8 file into "Private Key" field
6. Click Save

---

## Find Your Supabase Project Reference

Your redirect URI format is:
```
https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback
```

To find YOUR-PROJECT-REF:
1. Go to your Supabase Dashboard
2. Look at the URL: `https://supabase.com/dashboard/project/[YOUR-PROJECT-REF]`
3. Or go to Settings → General → Reference ID

---

## Test Your Implementation

After configuring each provider:

1. Run your app locally: `npm run dev`
2. Go to Sign In or Sign Up page
3. Click the social provider button
4. You should be redirected to the provider
5. Sign in with your credentials
6. You'll be redirected back to your app
7. Profile will be created automatically

---

## What Happens When Users Sign In

1. **User clicks button** → Redirects to provider
2. **User authenticates** → Provider redirects back
3. **Profile created** → With name, email, avatar from provider
4. **Credits initialized** → Welcome credits added
5. **User redirected** → To verification or discovery page

---

## Common Issues

### "Provider not enabled" error
- You need to enable the provider in Supabase Dashboard → Authentication → Providers

### "Redirect URI mismatch" error
- Double-check the redirect URI in your provider settings matches EXACTLY:
  `https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`

### OAuth doesn't redirect back
- Clear browser cache and try again
- Check that redirect URI is configured in BOTH places:
  1. Provider dashboard (Google/Facebook/Apple)
  2. Supabase dashboard

---

## Next Steps

1. Configure all three providers (or just the ones you want)
2. Test each one to ensure it works
3. Deploy to production
4. Update redirect URIs for your production domain
5. Monitor authentication in Supabase Dashboard

---

## That's It!

Your OAuth implementation is complete and ready to use. Just configure the providers in Supabase and you're done!
