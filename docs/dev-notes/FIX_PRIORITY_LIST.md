# Priority Fix List for 50K User Scale

## 🚨 CRITICAL - Fix Before Launch (24 hours)

### 1. SMS Authentication Bypass ⚠️ SECURITY
**File:** `supabase/functions/send-sms-verification/index.ts`
**Issue:** No auth check before sending SMS
**Risk:** Unlimited SMS bombing, massive Twilio bills
**Fix:**
```typescript
// Add after line 21
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: authHeader } } }
);

const { data: { user }, error } = await supabaseClient.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```

---

### 2. Race Condition in send-gift 💰 REVENUE LOSS
**File:** `supabase/functions/send-gift/index.ts`
**Issue:** Gift inserted before credits deducted
**Risk:** Users get free gifts if payment fails
**Fix:** Move credit deduction BEFORE gift insert (lines 203-238 → swap order)

```typescript
// CORRECT ORDER:
// 1. Deduct credits FIRST
const { data: spendResult, error: spendError } = await supabaseClient.rpc(
  "spend_credits_atomic",
  { p_user_id: user.id, p_amount: creditCost, ... }
);

if (spendError || !spendResult?.success) {
  return error(402, 'Insufficient credits');
}

// 2. THEN insert gift
const { data: sentGiftData, error: sentGiftError } = await supabaseClient
  .from("sent_gifts")
  .insert({ ... });
```

---

### 3. Race Condition in send-message 💰 REVENUE LOSS
**File:** `supabase/functions/send-message/index.ts`
**Issue:** Message inserted before credits deducted
**Risk:** Users get free messages if payment fails
**Fix:** Same as above - deduct credits FIRST (lines 241-278)

---

### 4. Missing Rate Limiting 🛡️ ABUSE PREVENTION
**Files:** All 6 Edge Functions
**Issue:** Functions don't call existing rate limit system
**Risk:** Spam, DoS, unlimited actions
**Fix:** Add to start of each function:

```typescript
// After auth validation, before main logic
const { data: rateLimitCheck, error: rateLimitError } = await supabaseClient.rpc(
  'check_and_update_rate_limit',
  {
    p_user_id: user.id,
    p_action_type: 'messages', // or 'likes', 'gifts', 'api_calls'
    p_increment: true
  }
);

if (rateLimitError || !rateLimitCheck) {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit exceeded',
      errorCode: 'RATE_LIMIT_EXCEEDED'
    }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Apply to:**
- `like-user/index.ts` (action_type: 'likes')
- `send-gift/index.ts` (action_type: 'gifts')
- `send-message/index.ts` (action_type: 'messages')
- `send-sms-verification/index.ts` (action_type: 'api_calls', limit 10/day)
- `twilio-video-token/index.ts` (action_type: 'api_calls')
- `twilio-voice-token/index.ts` (action_type: 'api_calls')

---

### 5. N+1 Query in ModernDiscovery ⚡ PERFORMANCE KILLER
**File:** `src/screens/Discovery/ModernDiscovery.tsx` (lines 114-138)
**Issue:** Separate query for each profile's photos
**Risk:** 50 profiles = 50+ queries, database overload
**Fix:** Use JOIN query

```typescript
// REPLACE lines 114-138 with:
const { data: dbProfiles, error: profileError } = await supabaseClient
  .from('user_profiles')
  .select(`
    *,
    user_photos!inner (
      photo_url,
      is_primary,
      upload_date
    )
  `)
  .eq('profile_visibility', 'public')
  .neq('user_id', user?.id || '')
  .limit(50);

if (profileError) {
  console.error('Error loading profiles:', profileError);
  return;
}

// Group photos by profile
const profilesWithPhotos = dbProfiles.map(profile => ({
  ...profile,
  photos: profile.user_photos?.slice(0, 3) || []
}));

setProfiles(profilesWithPhotos);
```

**Also fix in:**
- `src/screens/Matches/Matches.tsx` (lines 49-84)
- `src/screens/Mail/Mail.tsx` (lines 116-160)
- `src/components/MessageChatBox.tsx` (lines 149-200)

---

### 6. Memory Leak in realTimeMessaging 💥 SYSTEM CRASH
**File:** `src/lib/realTimeMessaging.ts` (lines 356-377)
**Issue:** Channels not properly cleaned from map
**Risk:** System crashes after 2-4 hours
**Fix:**

```typescript
// Add cleanup to unsubscribe function
static subscribeToUnreadCount(userId: string, callback: (count: number) => void): () => void {
  const channelName = `unread_count_${userId}`;

  // Remove existing channel if any
  if (this.activeChannels.has(channelName)) {
    const oldChannel = this.activeChannels.get(channelName);
    oldChannel?.unsubscribe();
    this.activeChannels.delete(channelName);
  }

  const channel = supabaseClient
    .channel(channelName)
    .on('postgres_changes', ...)
    .subscribe();

  this.activeChannels.set(channelName, channel);

  return () => {
    channel.unsubscribe();
    this.activeChannels.delete(channelName); // ← ADD THIS LINE
  };
}
```

---

### 7. Memory Leak in useAuth 💥 SYSTEM CRASH
**File:** `src/hooks/useAuth.ts` (lines 73-93)
**Issue:** Subscription not properly cleaned
**Risk:** Memory leak on auth state changes
**Fix:**

```typescript
// REPLACE lines 73-93 with:
const subscription = authClient.auth.onAuthStateChange((event, session) => {
  // Don't use async IIFE - update state directly
  setUser(session?.user ?? null);
  setIsAnonymous(session?.user?.is_anonymous || false);
  setLoading(false);
});

return () => {
  // Ensure subscription exists and unsubscribe
  subscription?.data?.subscription?.unsubscribe();
};
```

---

## ⚠️ HIGH PRIORITY - Fix Week 1 (29 hours)

### 8. Code Splitting 📦 PERFORMANCE
**File:** `src/App.tsx`
**Issue:** All 50+ screens imported upfront
**Fix:**

```typescript
// REPLACE lines 5-45 with lazy imports
const Welcome = React.lazy(() => import('@/screens/Welcome/Welcome'));
const SignIn = React.lazy(() => import('@/screens/Auth/SignIn'));
const SignUp = React.lazy(() => import('@/screens/Auth/SignUp'));
const Discovery = React.lazy(() => import('@/screens/Discovery/Discovery'));
const ModernDiscovery = React.lazy(() => import('@/screens/Discovery/ModernDiscovery'));
// ... repeat for all screens

// Then wrap renderScreen() content in Suspense:
return (
  <React.Suspense fallback={<LoadingSkeleton />}>
    {renderScreen()}
  </React.Suspense>
);
```

---

### 9. Credit System to Server 🔐 SECURITY
**Files:** `src/lib/creditSystem.tsx` + new Edge Function
**Issue:** Credits in localStorage = easily manipulated
**Fix:**
1. Create new Edge Function: `get-user-balance`
2. Remove localStorage usage
3. Fetch from database via Edge Function
4. Edge Functions validate credits before actions

---

### 10. Remove Polling 🔄 PERFORMANCE
**File:** `src/screens/Mail/Mail.tsx` (lines 92-97)
**Issue:** Balance check every 2 seconds
**Fix:** Use real-time subscription or remove entirely

```typescript
// REMOVE lines 92-97
// REPLACE with real-time subscription or fetch on demand only
```

---

## ✅ Completion Checklist

- [ ] P0-1: SMS auth bypass fixed
- [ ] P0-2: send-gift race condition fixed
- [ ] P0-3: send-message race condition fixed
- [ ] P0-4: Rate limiting added to all Edge Functions
- [ ] P0-5: N+1 queries fixed in Discovery
- [ ] P0-6: N+1 queries fixed in Matches
- [ ] P0-7: N+1 queries fixed in Mail
- [ ] P0-8: realTimeMessaging memory leak fixed
- [ ] P0-9: useAuth memory leak fixed
- [ ] P1-10: Code splitting implemented
- [ ] P1-11: Credit system moved to server
- [ ] P1-12: Polling removed

---

## Testing After Fixes

```bash
# 1. Build to check for errors
npm run build

# 2. Load test (use Artillery or similar)
# Target: 1000 concurrent users for 5 minutes
# Should be stable with <1% error rate

# 3. Memory leak test
# Run app for 24 hours
# Memory should stabilize, not grow indefinitely

# 4. Rate limiting test
# Try to spam actions
# Should get 429 rate limit errors
```

---

## Expected Results After Fixes

| Metric | Before | After |
|--------|--------|-------|
| Max concurrent users | 500 | 50,000+ |
| Initial page load | 10-15s | 3-5s |
| Profile page queries | 50+ | 1 |
| Memory leak risk | HIGH | LOW |
| Credit security | NONE | SECURE |
| Rate limiting | NONE | ENFORCED |
| System stability | Hours | Days/weeks |

---

**Start with fixes 1-7 (P0) before anything else. These are blocking production launch.**
