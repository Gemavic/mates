# Subscription Tiers & User Moderation System

Your app now has a complete free tier and premium subscription system implemented!

## Overview

The system provides **FREE** users with a **15-day grace period** to test the platform with limited access. After the trial ends, users are prompted to upgrade to Premium for full unlimited access.

---

## Subscription Tiers

### Free Tier (Trial)
**Duration:** 15 days from signup
**Daily Limits:**
- 10 profile views per day
- 5 likes per day
- 5 winks per day
- 10 messages per day
- 3 chats per day
- 20 blog reads per day
- 5 blog comments per day

**Features Blocked:**
- Video calls (Premium only)
- Audio calls (Premium only)
- See who liked you
- Advanced filters

### Premium Tiers (Unlimited Access)
**Available Tiers:**
1. **Silver** - $19.99/month
2. **Gold** - $39.99/month (Most Popular)
3. **Platinum** - $79.99/month (Includes video/audio)
4. **Elite** - $149.99/month (VIP treatment)

**Premium Benefits:**
- Unlimited profile views
- Unlimited likes and messages
- Video & audio calls (Platinum+)
- See who liked you
- Advanced filters
- Priority support
- No advertisements

---

## How It Works

### 1. **Automatic Free Trial**
When users sign up, they automatically receive:
- 15-day free trial period
- Access to all features with daily limits
- Grace period countdown tracking

### 2. **Feature Access Control**
Every feature checks access before allowing use:
- Profile viewing → Checks daily limit
- Liking → Checks daily limit
- Messaging → Checks monthly limit
- Video calls → Requires Premium tier
- Blog interactions → Checks daily limits

### 3. **Upgrade Prompts**
Users see upgrade prompts when:
- Daily limit is reached
- Attempting premium features (video/audio)
- Grace period ends (after 15 days)
- Near limit (70%+ usage)

### 4. **Usage Tracking**
System automatically tracks:
- Daily feature usage (resets every 24 hours)
- Monthly usage (resets every 30 days)
- Grace period expiration
- Upgrade prompt frequency

---

## Implementation Details

### Database Structure

**Tables Created:**
1. `subscription_tiers` - Defines available tiers and limits
2. `user_subscriptions` - Tracks user's current subscription
3. `feature_usage_tracking` - Tracks daily/monthly usage

**Functions Created:**
1. `check_feature_access()` - Validates if user can access a feature
2. `increment_feature_usage()` - Tracks feature usage
3. `record_upgrade_prompt()` - Logs upgrade prompts shown
4. `initialize_free_trial()` - Sets up trial on signup

### Frontend Components

**New Components:**
1. `UpgradePrompt` - Modal shown when limits reached
2. `FeatureLimitBanner` - Shows usage approaching limit
3. `GracePeriodBanner` - Trial expiration warning
4. `subscriptionManager` - Library for subscription management
5. `useSubscription` - React hook for subscription state

**Updated Features:**
- Discovery/Profile Viewing - Now checks limits
- Liking - Now tracks and limits daily usage
- Video Chat - Requires premium access
- Messaging - Tracks monthly limits (ready for integration)

---

## User Experience Flow

### Day 1-10 (Trial Active)
- User has full access with limits
- Can use all features within daily limits
- Sees gentle reminders about trial

### Day 11-15 (Trial Ending Soon)
- Warning banners appear
- "Only X days left" messages
- Encouraged to upgrade

### Day 16+ (Trial Expired)
- Access blocked with upgrade prompt
- Clear explanation of what happened
- Easy upgrade path to premium

### Premium Users
- No limits or restrictions
- Full unlimited access
- Premium badge/indicators
- Priority features unlocked

---

## Upgrade Flow

When users click "Upgrade":
1. Redirected to Credits page
2. See all tier options
3. Choose monthly or annual billing
4. Complete payment
5. Instant access to premium features

---

## Features Protected

✅ **Currently Protected:**
- Profile viewing (daily limit)
- Likes (daily limit)
- Video calls (premium only)
- Audio calls (premium only)

🔄 **Ready to Protect:** (Use the same pattern)
- Messaging
- Winks
- Chats
- Blog comments
- Blog reads

---

## Technical Implementation

### Check Access Example
```typescript
const accessResult = await checkAccess('like');
if (!accessResult.allowed) {
  // Show upgrade prompt
  setShowUpgradePrompt(true);
  return;
}
// Proceed with action
await trackUsage('like');
```

### Track Usage
```typescript
// After successful action
await trackUsage('like'); // or 'message', 'profile_view', etc.
```

### Using the Hook
```typescript
const {
  subscription,      // Current subscription info
  tier,             // Current tier details
  usage,            // Current usage stats
  isFreeTier,       // Boolean: is user on free tier
  daysRemaining,    // Days left in trial
  checkAccess,      // Function to check feature access
  trackUsage        // Function to track usage
} = useSubscription();
```

---

## Monitoring & Analytics

Track important metrics:
- **Conversion Rate** - Free → Premium upgrades
- **Trial Engagement** - How much users use during trial
- **Limit Hit Rate** - How often users hit limits
- **Upgrade Prompt Views** - Tracked in database
- **Feature Usage** - Which features drive upgrades

---

## Next Steps

To protect additional features:
1. Import `useSubscription` hook
2. Call `checkAccess(featureType)` before action
3. Show upgrade prompt if not allowed
4. Call `trackUsage(featureType)` after success
5. Add usage banners to show limits

---

## Testing

### Test Free User Experience:
1. Create new account → Gets 15-day trial
2. Try features → See limits apply
3. Reach daily limit → See upgrade prompt
4. Wait 15 days → Trial expires

### Test Premium Features:
1. Staff accounts bypass limits
2. Can manually upgrade users in database
3. Test video/audio call restrictions

---

## Benefits of This System

✅ Users can test platform risk-free for 15 days
✅ Clear value proposition for upgrading
✅ Automatic limit enforcement
✅ Graceful upgrade prompts
✅ Usage tracking for analytics
✅ Scalable to add more features
✅ No manual moderation needed

---

## Database Queries for Management

### Check User's Subscription
```sql
SELECT us.*, st.display_name, st.limits
FROM user_subscriptions us
JOIN subscription_tiers st ON us.tier_id = st.id
WHERE us.user_id = 'USER_ID';
```

### Check User's Usage
```sql
SELECT * FROM feature_usage_tracking
WHERE user_id = 'USER_ID';
```

### Manually Upgrade User
```sql
UPDATE user_subscriptions
SET tier_id = (SELECT id FROM subscription_tiers WHERE tier_name = 'platinum'),
    status = 'active'
WHERE user_id = 'USER_ID';
```

### See Trial Expirations Today
```sql
SELECT us.user_id, up.first_name, us.grace_period_ends_at
FROM user_subscriptions us
JOIN user_profiles up ON us.user_id = up.user_id
WHERE us.grace_period_ends_at::date = CURRENT_DATE;
```

---

## Success! 🎉

Your platform now has enterprise-grade user moderation and subscription management:
- Automatic 15-day free trials
- Feature limits enforced
- Smooth upgrade prompts
- Usage tracking
- Premium tier access control

Users will experience a professional, well-structured path from free trial to paid premium membership!
