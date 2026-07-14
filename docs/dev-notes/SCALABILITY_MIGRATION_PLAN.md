# 50K Users Scalability Migration Plan

**Created:** January 3, 2026
**Target Capacity:** 50,000 concurrent users
**Current Capacity:** ~100-200 concurrent users
**Estimated Completion:** 12-15 weeks

---

## Executive Summary

This document outlines the complete migration path from the current client-side architecture to a production-ready system capable of handling 50,000+ concurrent users.

### Current Critical Issues

1. **Credit System:** 100% client-side validation (localStorage) - CRITICAL SECURITY FLAW
2. **No Rate Limiting:** Users can spam requests infinitely
3. **Bundle Size:** 616 KB main bundle - too large for mobile users
4. **No Caching:** Every action hits database directly
5. **No Background Jobs:** All operations synchronous
6. **Direct Client Queries:** No server-side enforcement layer
7. **No Monitoring:** Cannot detect or respond to issues

---

## Phase 1: Server-Side Credit Validation (Weeks 1-2)

**Priority:** CRITICAL - Security & Revenue Protection

### Current State
```typescript
// Client-side validation (INSECURE)
if (creditManager.canAfford(userId, 10)) {
  await sendMessage(...);
}
```

### Target State
```typescript
// Server-side validation via Edge Function
const result = await supabase.functions.invoke('send-message', {
  body: { recipientId, message }
});
// Credits validated and deducted server-side
```

### Implementation Steps

1. **Create Edge Functions for ALL credit operations:**
   - `send-message` - Validate credits, send message, deduct credits atomically
   - `send-gift` - Validate credits, send gift, deduct credits
   - `like-user` - Validate credits for super likes, process like
   - `boost-profile` - Validate credits, activate boost
   - `video-call-start` - Validate credits, create call session

2. **Database Functions for Atomic Operations:**
   ```sql
   CREATE OR REPLACE FUNCTION spend_credits_atomic(
     p_user_id UUID,
     p_amount INTEGER,
     p_description TEXT
   ) RETURNS BOOLEAN AS $$
   BEGIN
     -- Check balance
     -- Deduct credits
     -- Log transaction
     -- All in one atomic transaction
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

3. **Remove localStorage Credit Storage:**
   - Delete all `localStorage.setItem('credits_...')` calls
   - Remove client-side credit caching
   - Credits ONLY from database

4. **Update Frontend:**
   - Replace direct operations with Edge Function calls
   - Add proper error handling
   - Show loading states during server validation

### Success Criteria
- ✅ ALL credit operations go through Edge Functions
- ✅ localStorage no longer used for credits
- ✅ Cannot manipulate credits via DevTools
- ✅ All credit changes logged in database

---

## Phase 2: Rate Limiting (Weeks 2-3)

**Priority:** CRITICAL - Prevents abuse and DDoS

### Implementation

1. **Database Rate Limit Tracking:**
   ```sql
   CREATE TABLE user_rate_limits (
     user_id UUID PRIMARY KEY,
     messages_sent_minute INTEGER DEFAULT 0,
     likes_sent_minute INTEGER DEFAULT 0,
     api_calls_minute INTEGER DEFAULT 0,
     last_reset_minute TIMESTAMPTZ DEFAULT NOW(),
     daily_messages INTEGER DEFAULT 0,
     last_reset_day TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Edge Function Middleware:**
   ```typescript
   async function checkRateLimit(userId: string, action: string) {
     const limits = {
       message: { perMinute: 10, perDay: 500 },
       like: { perMinute: 30, perDay: 1000 },
       api: { perMinute: 100, perDay: 10000 }
     };
     // Check and update limits
   }
   ```

3. **Client-Side Backoff:**
   - Implement exponential backoff on 429 errors
   - Show user-friendly rate limit messages
   - Queue requests when rate limited

### Success Criteria
- ✅ Cannot send more than 10 messages/minute
- ✅ Cannot exceed 100 API calls/minute
- ✅ Rate limits reset properly
- ✅ User sees clear feedback when rate limited

---

## Phase 3: Caching Layer (Weeks 3-4)

**Priority:** HIGH - Reduces database load by 80%

### Implementation

1. **Database Materialized Views:**
   ```sql
   CREATE MATERIALIZED VIEW user_credits_cache AS
   SELECT
     user_id,
     complimentary_credits + purchased_credits AS total_credits,
     total_kobos,
     updated_at
   FROM user_credits;

   CREATE INDEX ON user_credits_cache(user_id);

   -- Refresh every 30 seconds
   ```

2. **Profile Caching:**
   ```sql
   CREATE MATERIALIZED VIEW discovery_profiles_cache AS
   SELECT
     user_id,
     full_name,
     age,
     location,
     bio,
     is_online,
     last_active
   FROM user_profiles
   WHERE profile_visibility = 'public'
   ORDER BY is_online DESC, last_active DESC;
   ```

3. **Edge Function Caching:**
   ```typescript
   // Cache credit balances for 30 seconds
   const cachedCredits = await getWithCache(
     `credits:${userId}`,
     () => getUserCredits(userId),
     30 // seconds
   );
   ```

### Success Criteria
- ✅ 80% reduction in database queries
- ✅ Profile loads use cached data
- ✅ Credit checks cached for 30 seconds
- ✅ Cache invalidation works correctly

---

## Phase 4: Bundle Optimization (Weeks 4-5)

**Priority:** HIGH - Improves load times by 60%

### Current State
- Main bundle: 616 KB (134 KB gzipped)
- No code splitting
- All screens loaded upfront

### Target State
- Main bundle: <200 KB
- Code splitting by route
- Lazy loading for heavy components

### Implementation

1. **Route-Based Code Splitting:**
   ```typescript
   // Before
   import Discovery from './screens/Discovery/Discovery';

   // After
   const Discovery = lazy(() => import('./screens/Discovery/Discovery'));
   ```

2. **Component Lazy Loading:**
   ```typescript
   // Load heavy components only when needed
   const VideoChat = lazy(() => import('./screens/VideoChat/VideoChat'));
   const AudioChat = lazy(() => import('./screens/AudioChat/AudioChat'));
   ```

3. **Dependency Optimization:**
   - Remove unused dependencies
   - Replace heavy libraries with lighter alternatives
   - Tree-shake unused code

4. **Asset Optimization:**
   - Convert images to WebP
   - Lazy load images below fold
   - Use responsive images

### Success Criteria
- ✅ Main bundle <200 KB
- ✅ Initial load <2 seconds on 4G
- ✅ Code splitting by route working
- ✅ Lighthouse score >90

---

## Phase 5: Background Job Queue (Weeks 5-6)

**Priority:** MEDIUM - Improves response times

### Implementation

1. **Create Job Queue Table:**
   ```sql
   CREATE TABLE job_queue (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     job_type TEXT NOT NULL,
     payload JSONB NOT NULL,
     status TEXT DEFAULT 'pending',
     attempts INTEGER DEFAULT 0,
     max_attempts INTEGER DEFAULT 3,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     scheduled_for TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ
   );
   ```

2. **Edge Function Job Processor:**
   ```typescript
   // Cron job runs every minute
   Deno.serve(async (req) => {
     const jobs = await getPendingJobs();
     for (const job of jobs) {
       await processJob(job);
     }
   });
   ```

3. **Queue Operations:**
   - Email notifications
   - Match score calculations
   - Profile recommendations
   - Data exports

### Success Criteria
- ✅ Email sending is asynchronous
- ✅ Match calculations don't block user actions
- ✅ Failed jobs retry automatically
- ✅ Job queue processes 1000+ jobs/hour

---

## Phase 6: Database Optimization (Week 7)

**Priority:** MEDIUM - Handles 10x more queries

### Implementation

1. **Add Missing Indexes:**
   ```sql
   -- Already done in recent migration, verify effectiveness
   CREATE INDEX CONCURRENTLY idx_mail_messages_thread_created
   ON mail_messages(thread_id, created_at DESC);
   ```

2. **Query Optimization:**
   - Use EXPLAIN ANALYZE on slow queries
   - Optimize N+1 queries
   - Add covering indexes

3. **Connection Pooling:**
   - Configure max connections
   - Implement connection timeout
   - Add connection retry logic

### Success Criteria
- ✅ All queries <100ms
- ✅ No N+1 query problems
- ✅ Connection pool at <70% usage
- ✅ Zero timeout errors

---

## Phase 7: Monitoring & Alerting (Week 8)

**Priority:** MEDIUM - Detect issues before users notice

### Implementation

1. **Application Performance Monitoring:**
   - Edge Function response times
   - Database query performance
   - Error rates per endpoint
   - User action completion rates

2. **Database Monitoring:**
   - Connection pool usage
   - Query performance
   - Table sizes
   - Index effectiveness

3. **Alerting Rules:**
   ```
   - Alert if error rate >1%
   - Alert if response time >1s
   - Alert if database connections >80%
   - Alert if disk usage >75%
   ```

4. **Monitoring Edge Function:**
   ```typescript
   Deno.serve(async (req) => {
     const metrics = {
       activeUsers: await getActiveUserCount(),
       requestsPerMinute: await getRequestRate(),
       errorRate: await getErrorRate(),
       avgResponseTime: await getAvgResponseTime()
     };
     return new Response(JSON.stringify(metrics));
   });
   ```

### Success Criteria
- ✅ Real-time dashboard showing key metrics
- ✅ Alerts sent within 1 minute of issue
- ✅ 7-day metric history available
- ✅ Error tracking with stack traces

---

## Phase 8: CDN & Asset Delivery (Week 9)

**Priority:** MEDIUM - Reduces bandwidth costs 80%

### Implementation

1. **Vercel Edge Network (Already Configured):**
   - Static assets automatically cached
   - No additional work needed

2. **Image Optimization:**
   - Serve images via CDN
   - Use WebP format with fallbacks
   - Implement lazy loading

3. **API Response Caching:**
   - Cache public data at edge
   - Use Cache-Control headers
   - Implement edge caching rules

### Success Criteria
- ✅ Static assets served from CDN
- ✅ 80% reduction in origin bandwidth
- ✅ <100ms asset delivery globally
- ✅ Automatic cache invalidation works

---

## Phase 9: Load Testing (Weeks 10-11)

**Priority:** CRITICAL - Validate system can handle load

### Implementation

1. **Test Scenarios:**
   ```javascript
   // k6 load test
   export default function() {
     // 1. User signs in
     // 2. Views discovery profiles
     // 3. Sends messages
     // 4. Likes profiles
     // 5. Purchases credits
   }
   ```

2. **Load Profiles:**
   - Baseline: 100 concurrent users
   - Target: 1,000 concurrent users
   - Stress: 5,000 concurrent users
   - Peak: 10,000 concurrent users

3. **Metrics to Track:**
   - Response times (p50, p95, p99)
   - Error rates
   - Database connection usage
   - Memory usage
   - CPU usage

### Success Criteria
- ✅ Handles 1,000 concurrent users with <1s response time
- ✅ Error rate <0.1% under load
- ✅ No database connection exhaustion
- ✅ System auto-recovers from spikes

---

## Phase 10: Final Hardening (Weeks 12-15)

**Priority:** HIGH - Production readiness

### Implementation

1. **Fix All Issues Found in Load Testing**
2. **Security Audit:**
   - Penetrate test all Edge Functions
   - Verify RLS policies work under load
   - Test rate limiting effectiveness
   - Validate credit system security

3. **Documentation:**
   - API documentation
   - Runbook for common issues
   - Scaling playbook
   - Incident response plan

4. **Backup & Recovery:**
   - Automated database backups
   - Point-in-time recovery tested
   - Disaster recovery plan
   - Failover procedures

### Success Criteria
- ✅ All load test issues resolved
- ✅ Security audit passed
- ✅ Documentation complete
- ✅ Backup/restore tested successfully
- ✅ Team trained on operations

---

## Cost Breakdown

### Development Costs (One-Time)
- **Developer Time:** 12-15 weeks @ $100/hr = $48,000 - $60,000
- **Load Testing Tools:** $500
- **Total:** ~$50,000 - $60,000

### Operational Costs (Monthly)

| Service | Cost/Month |
|---------|------------|
| Supabase Pro | $25 |
| Database (4 CPU, 16 GB RAM) | $200 |
| Bandwidth (5 TB) | $100 |
| Edge Functions (1M invocations) | $25 |
| Storage (100 GB) | $10 |
| Monitoring | $50 |
| CDN | Included with Vercel |
| **Total** | **$410/month** |

### Scaling Costs

| User Count | Monthly Cost |
|------------|--------------|
| 1,000 users | $410 |
| 10,000 users | $650 |
| 50,000 users | $1,200 |
| 100,000 users | $2,500 |

---

## Capacity Estimates After Each Phase

| Phase | Max Concurrent Users | Notes |
|-------|---------------------|-------|
| Current | 100-200 | Client-side validation breaks system |
| After Phase 1 | 300-500 | Server-side validation adds overhead |
| After Phase 2 | 500-800 | Rate limiting prevents abuse |
| After Phase 3 | 2,000-3,000 | Caching reduces DB load 80% |
| After Phase 4 | 3,000-5,000 | Faster loads = more users |
| After Phase 5 | 5,000-10,000 | Async jobs reduce blocking |
| After Phase 6 | 10,000-25,000 | Optimized queries handle more load |
| After Phase 7 | 25,000-50,000 | Monitoring allows proactive scaling |
| After Phase 8 | 50,000+ | CDN reduces origin load |
| After Phase 9 | 50,000+ Verified | Load tested and validated |

---

## Risk Mitigation

### High-Risk Items
1. **Database Migration:** Implement in maintenance window
2. **Credit System Migration:** Dual-write period to ensure no lost transactions
3. **Rate Limiting:** Start with generous limits, tighten gradually

### Rollback Plans
1. **Feature Flags:** Enable new system gradually
2. **Database Triggers:** Can be disabled instantly if issues arise
3. **Edge Functions:** Can route back to old client-side code

---

## Next Steps

1. ✅ Review and approve this plan
2. 🔄 Begin Phase 1: Server-Side Credit Validation
3. ⏳ Set up development environment
4. ⏳ Create project tracking board
5. ⏳ Schedule weekly progress reviews

---

**Status:** Ready to begin implementation
**First Task:** Create Edge Function for send-message operation
**Estimated Completion Date:** April 2026
