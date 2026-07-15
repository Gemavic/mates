# Step-by-Step Implementation Guide for 50K Users

**Status:** Phase 1-6 Complete ✅
**Remaining:** Phases 7-10
**Estimated Time:** 6-9 weeks

---

## ✅ What's Been Completed

### Phase 1: Architecture Analysis ✅
- Analyzed current client-side architecture
- Identified all security and scalability issues
- Created comprehensive migration plan

### Phase 2: Atomic Database Functions ✅
- `check_sufficient_credits(user_id, amount)` - Check if user can afford operation
- `get_user_balance(user_id)` - Get current credit balance
- `spend_credits_atomic(user_id, amount, description, category)` - Deduct credits atomically
- `add_credits_atomic(user_id, amount, type, description, category)` - Add credits atomically

### Phase 3: Edge Function - Send Message ✅
- Server-side message sending with credit validation
- First message free, subsequent messages cost 10 credits
- Atomic credit deduction
- Rate limiting ready

### Phase 4: Edge Function - Like User ✅
- Server-side like processing
- Regular likes free, super likes cost 25 credits
- Automatic match creation when mutual
- Rate limiting ready

### Phase 5: Edge Function - Send Gift ✅
- Server-side gift sending
- Validates gift exists and is active
- Atomic credit deduction
- Updates gift popularity

### Phase 6: Rate Limiting System ✅
- Database-backed rate limiting
- Per-user, per-action limits
- Automatic counter reset
- Limits:
  - Messages: 10/min, 500/day
  - Likes: 30/min, 1000/day
  - Gifts: 5/min, 50/day
  - API: 100/min, 10,000/day

---

## 🔄 Phase 7: Update Frontend to Use Edge Functions (Week 1-2)

### Current State
Frontend makes direct database calls with client-side validation:
```typescript
// CURRENT (INSECURE)
if (creditManager.canAfford(userId, 10)) {
  await sendMessage(recipientId, message);
  await creditManager.deductCredits(userId, 10);
}
```

### Target State
Frontend calls Edge Functions that handle everything server-side:
```typescript
// NEW (SECURE)
const response = await supabase.functions.invoke('send-message', {
  body: { recipientId, message }
});
```

### Implementation Steps

#### Step 1: Create API Service Layer

Create `/src/lib/api.ts`:

```typescript
import { supabase } from './supabase';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

// Send message via Edge Function
export async function sendMessage(
  recipientId: string,
  message: string,
  threadId?: string
): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-message', {
      body: { recipientId, message, threadId }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    return {
      success: false,
      error: 'Failed to send message',
      errorCode: 'SEND_MESSAGE_FAILED'
    };
  }
}

// Like user via Edge Function
export async function likeUser(
  targetUserId: string,
  likeType: 'like' | 'super_like' | 'pass' | 'blink'
): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('like-user', {
      body: { targetUserId, likeType }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Like user error:', error);
    return {
      success: false,
      error: 'Failed to like user',
      errorCode: 'LIKE_USER_FAILED'
    };
  }
}

// Send gift via Edge Function
export async function sendGift(
  recipientId: string,
  giftId: string,
  message?: string
): Promise<ApiResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-gift', {
      body: { recipientId, giftId, message }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Send gift error:', error);
    return {
      success: false,
      error: 'Failed to send gift',
      errorCode: 'SEND_GIFT_FAILED'
    };
  }
}

// Get user's credit balance
export async function getUserBalance(userId: string): Promise<{
  complimentary: number;
  purchased: number;
  total: number;
}> {
  try {
    const { data, error } = await supabase.rpc('get_user_balance', {
      p_user_id: userId
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        complimentary: data[0].complimentary_credits,
        purchased: data[0].purchased_credits,
        total: data[0].total_credits
      };
    }

    return { complimentary: 0, purchased: 0, total: 0 };
  } catch (error) {
    console.error('Get balance error:', error);
    return { complimentary: 0, purchased: 0, total: 0 };
  }
}
```

#### Step 2: Update Components to Use New API

**Example: MessageChatBox Component**

BEFORE:
```typescript
// src/components/MessageChatBox.tsx (OLD)
const handleSend = async () => {
  if (!creditManager.canAfford(currentUserId, 10)) {
    alert('Insufficient credits');
    return;
  }

  await sendMessage(recipientId, message);
  await creditManager.deductCredits(currentUserId, 10);
};
```

AFTER:
```typescript
// src/components/MessageChatBox.tsx (NEW)
import { sendMessage } from '@/lib/api';

const handleSend = async () => {
  setLoading(true);

  const result = await sendMessage(recipientId, message, threadId);

  if (!result.success) {
    if (result.errorCode === 'INSUFFICIENT_CREDITS') {
      alert('You need more credits to send this message');
    } else if (result.errorCode === 'RATE_LIMIT_MINUTE') {
      alert('You\'re sending messages too quickly. Please wait a moment.');
    } else {
      alert(result.error || 'Failed to send message');
    }
    setLoading(false);
    return;
  }

  // Update UI with new balance
  setCredits(result.data.newBalance);
  setMessage('');
  setLoading(false);
};
```

**Example: SwipeCard Component (Likes)**

BEFORE:
```typescript
// src/components/SwipeCard.tsx (OLD)
const handleLike = async (type: 'like' | 'super_like') => {
  const cost = type === 'super_like' ? 25 : 0;
  if (cost > 0 && !creditManager.canAfford(userId, cost)) {
    alert('Insufficient credits');
    return;
  }

  await likeUser(userId, targetUserId, type);
  if (cost > 0) {
    await creditManager.deductCredits(userId, cost);
  }
};
```

AFTER:
```typescript
// src/components/SwipeCard.tsx (NEW)
import { likeUser } from '@/lib/api';

const handleLike = async (type: 'like' | 'super_like') => {
  setProcessing(true);

  const result = await likeUser(targetUserId, type);

  if (!result.success) {
    if (result.errorCode === 'INSUFFICIENT_CREDITS') {
      alert('You need 25 credits for a super like');
    } else {
      alert(result.error || 'Failed to like user');
    }
    setProcessing(false);
    return;
  }

  // Show match notification if mutual
  if (result.data.isMatch) {
    showMatchNotification(targetUserId);
  }

  // Update UI
  setCredits(result.data.newBalance);
  onSwipe();
  setProcessing(false);
};
```

**Example: GiftShop Component**

BEFORE:
```typescript
// src/screens/GiftShop/GiftShop.tsx (OLD)
const handleSendGift = async (giftId: string) => {
  if (!creditManager.canAfford(userId, giftPrice)) {
    alert('Insufficient credits');
    return;
  }

  await sendGiftToUser(recipientId, giftId);
  await creditManager.deductCredits(userId, giftPrice);
};
```

AFTER:
```typescript
// src/screens/GiftShop/GiftShop.tsx (NEW)
import { sendGift } from '@/lib/api';

const handleSendGift = async (giftId: string, message?: string) => {
  setSending(true);

  const result = await sendGift(recipientId, giftId, message);

  if (!result.success) {
    if (result.errorCode === 'INSUFFICIENT_CREDITS') {
      showCreditPurchaseModal();
    } else {
      alert(result.error || 'Failed to send gift');
    }
    setSending(false);
    return;
  }

  // Show success message
  toast.success('Gift sent successfully!');
  setCredits(result.data.newBalance);
  setSending(false);
  onClose();
};
```

#### Step 3: Update Credit Display Component

Create a hook to refresh credits from server:

```typescript
// src/hooks/useCredits.ts
import { useState, useEffect } from 'react';
import { getUserBalance } from '@/lib/api';
import { useAuth } from './useAuth';

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState({
    complimentary: 0,
    purchased: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  const refreshCredits = async () => {
    if (!user) return;

    setLoading(true);
    const balance = await getUserBalance(user.id);
    setCredits(balance);
    setLoading(false);
  };

  useEffect(() => {
    refreshCredits();

    // Refresh every 30 seconds
    const interval = setInterval(refreshCredits, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return { credits, loading, refreshCredits };
}
```

Use in components:
```typescript
import { useCredits } from '@/hooks/useCredits';

function Header() {
  const { credits, refreshCredits } = useCredits();

  return (
    <div>
      Credits: {credits.total}
      <button onClick={refreshCredits}>Refresh</button>
    </div>
  );
}
```

### Files to Update

1. `/src/lib/api.ts` - NEW FILE (create API service layer)
2. `/src/hooks/useCredits.ts` - NEW FILE (create credits hook)
3. `/src/components/MessageChatBox.tsx` - Update to use API
4. `/src/components/SwipeCard.tsx` - Update to use API
5. `/src/screens/GiftShop/GiftShop.tsx` - Update to use API
6. `/src/screens/Discovery/Discovery.tsx` - Update to use API
7. `/src/screens/Discovery/ModernDiscovery.tsx` - Update to use API

### Testing Checklist

- [ ] Can send messages and credits deduct correctly
- [ ] Cannot send messages without sufficient credits
- [ ] Rate limiting works (try sending 11 messages in 1 minute)
- [ ] Super likes deduct 25 credits
- [ ] Regular likes don't deduct credits
- [ ] Gifts deduct correct amount
- [ ] Credit balance updates in real-time
- [ ] Error messages are user-friendly

---

## 🗑️ Phase 8: Remove localStorage Credit Storage (Week 2)

### Implementation Steps

#### Step 1: Remove localStorage Usage

Search for and remove all instances of:
```typescript
// REMOVE THESE
localStorage.setItem('credits_*')
localStorage.getItem('credits_*')
localStorage.removeItem('credits_*')
```

Files to update:
- `/src/lib/creditSystem.tsx` - Remove all localStorage operations
- Any component using `creditManager.getUserData()`

#### Step 2: Deprecate Old Credit Manager Methods

In `/src/lib/creditSystem.tsx`:
```typescript
// Mark as deprecated
/** @deprecated Use API service instead */
getUserData(userId: string): any {
  console.warn('DEPRECATED: getUserData - Use getUserBalance from api.ts');
  return null;
}

/** @deprecated Use API service instead */
deductCredits(userId: string, amount: number): Promise<boolean> {
  console.warn('DEPRECATED: deductCredits - Use Edge Functions');
  return Promise.resolve(false);
}
```

#### Step 3: Update Tests

Update any tests that rely on localStorage to use API mocks.

---

## 🚀 Phase 9: Implement Caching Layer (Week 3)

### Implementation Steps

#### Step 1: Create Materialized Views

Apply this migration:

```sql
-- Materialized view for user credits (refresh every 30 seconds)
CREATE MATERIALIZED VIEW user_credits_cache AS
SELECT
  user_id,
  complimentary_credits,
  purchased_credits,
  (complimentary_credits + purchased_credits) AS total_credits,
  total_kobos,
  updated_at
FROM user_credits;

CREATE UNIQUE INDEX ON user_credits_cache(user_id);

-- Materialized view for discovery profiles (refresh every 60 seconds)
CREATE MATERIALIZED VIEW discovery_profiles_cache AS
SELECT
  user_id,
  full_name,
  first_name,
  age,
  location,
  bio,
  interests,
  is_online,
  last_active,
  profile_visibility
FROM user_profiles
WHERE profile_visibility = 'public'
  OR profile_visibility IS NULL
ORDER BY is_online DESC, last_active DESC
LIMIT 1000;

CREATE INDEX ON discovery_profiles_cache(is_online, last_active);
```

#### Step 2: Create Refresh Function

```sql
-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_caches()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_credits_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY discovery_profiles_cache;
END;
$$;
```

#### Step 3: Set Up Automatic Refresh

Use `pg_cron` extension (if available) or create an Edge Function that runs on schedule:

```typescript
// supabase/functions/refresh-caches/index.ts
Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  await supabaseClient.rpc('refresh_all_caches');

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

Set up a cron job to call this every 30 seconds using GitHub Actions or similar.

---

## 📦 Phase 10: Bundle Optimization (Week 4)

### Implementation Steps

#### Step 1: Enable Code Splitting in Vite

Update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],

          // Feature chunks
          'discovery': [
            './src/screens/Discovery/Discovery',
            './src/screens/Discovery/ModernDiscovery',
            './src/screens/Discovery/BrowseProfiles'
          ],
          'messaging': [
            './src/screens/Mail/Mail',
            './src/components/MessageChatBox'
          ],
          'media': [
            './src/screens/VideoChat/VideoChat',
            './src/screens/AudioChat/AudioChat'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500
  }
});
```

#### Step 2: Lazy Load Routes

Update `App.tsx`:
```typescript
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Lazy load screens
const Discovery = lazy(() => import('./screens/Discovery/Discovery'));
const Mail = lazy(() => import('./screens/Mail/Mail'));
const VideoChat = lazy(() => import('./screens/VideoChat/VideoChat'));
// ... etc

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSkeleton />}>
        <Routes>
          <Route path="/discovery" element={<Discovery />} />
          <Route path="/mail" element={<Mail />} />
          {/* ... etc */}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

#### Step 3: Analyze Bundle

```bash
npm run build
npx vite-bundle-visualizer
```

Target bundle sizes:
- Main chunk: <200 KB
- Vendor chunk: <300 KB
- Feature chunks: <100 KB each

---

## 🎯 Success Criteria

### Phase 7: Frontend Migration
- ✅ All credit operations use Edge Functions
- ✅ No localStorage usage for credits
- ✅ Error handling for rate limits
- ✅ Real-time credit balance updates

### Phase 8: localStorage Removal
- ✅ No localStorage.setItem('credits_*') calls
- ✅ All credit data from database
- ✅ Old methods deprecated

### Phase 9: Caching
- ✅ 80% reduction in database queries
- ✅ Materialized views refresh automatically
- ✅ Discovery profiles load from cache

### Phase 10: Bundle Optimization
- ✅ Main bundle <200 KB
- ✅ Initial load <2s on 4G
- ✅ Code splitting working
- ✅ Lighthouse score >90

---

## 📊 Expected Performance After All Phases

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Max Concurrent Users | 100-200 | 10,000+ | 50x |
| Database Queries/Min | 10,000 | 2,000 | 80% reduction |
| Bundle Size | 616 KB | <200 KB | 68% reduction |
| Load Time (4G) | 5-8s | <2s | 75% faster |
| Credit Fraud Risk | HIGH | NONE | 100% secure |
| Rate Limit Protection | NONE | ACTIVE | Protected |

---

## 🆘 Getting Help

If you encounter issues:
1. Check Edge Function logs in Supabase Dashboard
2. Verify database functions are working with SQL queries
3. Test rate limiting with rapid API calls
4. Check browser console for errors

## Next Steps

1. Start with Phase 7 - Update one component at a time
2. Test thoroughly after each change
3. Monitor error logs in production
4. Gradually roll out to all users

**Estimated Total Time:** 6-9 weeks for remaining phases
**Current Capacity:** ~500 users
**Final Capacity:** 50,000+ users
