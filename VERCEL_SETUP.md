# Vercel Deployment Setup

## Environment Variables Configuration

Your application requires these environment variables to be set in Vercel:

### Required Variables

1. **VITE_SUPABASE_URL**
   - Value: `https://zdkxonufiuagkrhprnbd.supabase.co`
   - Environment: Production, Preview, Development

2. **VITE_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpka3hvbnVmaXVhZ2tyaHBybmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjQ0NzQsImV4cCI6MjA2OTkwMDQ3NH0.auHwnh0siI7u95WN-4Fh0aESjge2S6Yks7MNSnivo-k`
   - Environment: Production, Preview, Development

### Optional Variables (for SMS verification)

3. **TWILIO_ACCOUNT_SID**
   - Value: `AC84c5dc960dfee228355c3157a7f12b14`
   - Environment: Production

4. **TWILIO_AUTH_TOKEN**
   - Value: `9a0a2f13fa7cc50cb42d656de0fc4e5a`
   - Environment: Production

5. **TWILIO_PHONE_NUMBER**
   - Value: `+14244887950`
   - Environment: Production

## How to Add Environment Variables in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to "Settings" tab
4. Click "Environment Variables" in the left sidebar
5. Add each variable:
   - Enter the variable name (e.g., `VITE_SUPABASE_URL`)
   - Enter the value
   - Select environments (Production, Preview, Development)
   - Click "Add"

## Important Notes

- **CRITICAL**: Vercel requires environment variables to be configured in the dashboard. The `.env` file is NOT used in production.
- All environment variables starting with `VITE_` are exposed to the client-side code
- After adding variables, redeploy your application for changes to take effect
- You can trigger a redeploy by:
  - Pushing a new commit to your repository
  - Going to Deployments tab and clicking "Redeploy"

## Verification

After deployment, check that:
1. Users can register and sign in (authentication works)
2. Discovery page shows profiles from the database
3. No "demo mode" messages appear in the browser console
4. All features connect to the real Supabase database

## Troubleshooting

If you see "demo mode" after deployment:
1. Verify environment variables are set correctly in Vercel dashboard
2. Ensure variable names match exactly (case-sensitive)
3. Redeploy the application after adding variables
4. Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
