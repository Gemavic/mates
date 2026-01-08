# Hybrid Payment System Implementation

Your app now supports BOTH payment models - giving users the flexibility to choose what works best for them!

---

## Payment Models Available

### 1. Monthly Subscription (New)
**Best For:** Active users who want unlimited access
**Pricing:** $19.99 - $149.99/month
**Benefits:**
- Unlimited likes, messages, profile views
- No per-action charges
- Video/audio calls (Platinum+)
- See who liked you
- Advanced filters
- One flat monthly rate

**Tiers:**
- **Free Trial** - 15 days with limits
- **Silver** - $19.99/month - Unlimited messaging & likes
- **Gold** - $39.99/month - All Silver + priority features
- **Platinum** - $79.99/month - All Gold + video/audio calls
- **Elite** - $149.99/month - All Platinum + VIP treatment

### 2. Pay-as-You-Go Credits (Your Existing VIP System)
**Best For:** Casual users who use the platform occasionally
**Pricing:** $9.99 - $79.99 per purchase
**Benefits:**
- Pay only for what you use
- No recurring charges
- Credits never expire
- Full access to all features
- Buy more anytime

**Credit Packages:**
- **Starter Pack** - $9.99 for 100 credits
- **Popular Pack** - $39.99 for 500 credits
- **Premium Pack** - $79.99 for 1200 credits

---

## How It Works

### User Journey

#### New Users (Sign Up)
1. Get 15-day free trial with subscription model
2. Daily limits apply (10 profile views, 5 likes, etc.)
3. After 15 days, must choose payment option

#### Choosing Payment Model
When limits are hit or trial ends:
1. Beautiful modal appears with BOTH options
2. User can select:
   - **"Choose Subscription"** → Go to monthly plans
   - **"Pay-as-You-Go"** → Go to credit packages
3. Choice is saved in database

#### Credits Users
- Set to `payment_model = 'credits'`
- Bypass all subscription limits
- Have unlimited access as long as credits available
- Credits deducted per action (existing system)
- Can switch to subscription anytime

#### Subscription Users
- Set to `payment_model = 'subscription'`
- Monthly billing
- Unlimited access (based on tier)
- Can switch to credits anytime

---

## Technical Implementation

### Database Structure

**user_subscriptions table:**
```sql
- payment_model: 'subscription' | 'credits'
```

**Access Logic:**
1. Check user's `payment_model`
2. If `credits` → Check credit balance
   - Has credits? → Allow unlimited access
   - No credits? → Show upgrade prompt
3. If `subscription` → Check tier limits
   - Free tier? → Apply daily limits
   - Premium? → Unlimited access

### Key Functions

**switch_to_credits_model(user_id)**
- Switches user to pay-as-you-go
- Updates payment_model to 'credits'
- Ensures user_credits record exists

**switch_to_subscription_model(user_id, tier_id)**
- Switches user to monthly subscription
- Updates payment_model to 'subscription'
- Sets subscription tier

**check_feature_access(user_id, feature)**
- Returns different responses based on payment model
- Credits users bypass subscription limits
- Subscription users follow tier rules

---

## User Experience

### Credits Users See:
```
✅ Full access to all features
✅ Credits: 450 remaining
✅ No monthly charges
💳 Buy more credits anytime
```

### Subscription Users See:
```
✅ Unlimited access (based on tier)
✅ Monthly subscription active
✅ No per-action charges
👑 Premium features unlocked
```

### Free Trial Users See:
```
⏰ 8 days left in trial
📊 5 of 5 likes used today
⚠️ Upgrade to continue after trial
```

---

## Upgrade Prompts

### Multi-Option Prompt
When users hit limits, they see:

**Main Prompt:**
- Clear explanation of what happened
- "Choose Payment Option" button

**Payment Choice Modal:**
Two beautiful cards side-by-side:
1. **Monthly Subscription Card**
   - Lists unlimited benefits
   - "Starting at $19.99/month"
   - Subscription icon

2. **Pay-as-You-Go Card**
   - Lists flexible benefits
   - "Starting at $9.99 for 100 credits"
   - Credits icon

**Quick Actions:**
- "Subscription" button
- "Pay-as-You-Go" button
- Both visible on main prompt

---

## Switching Between Models

### From Credits to Subscription
```typescript
await switchToSubscription(userId, tierId);
// User is now on monthly plan
// Credits remain in account for future use
```

### From Subscription to Credits
```typescript
await switchToCredits(userId);
// User is now on pay-as-you-go
// Can purchase credits immediately
```

**User can switch anytime!**

---

## Component Updates

### New Components
1. **PaymentModelChoice** - Side-by-side comparison modal
2. **Updated UpgradePrompt** - Shows both options

### Updated Hooks
**useSubscription** now includes:
- `isCreditsModel` - Check if user on credits
- `isSubscriptionModel` - Check if user on subscription
- `switchToCredits()` - Switch to pay-as-you-go
- `switchToSubscription(tierId)` - Switch to monthly

---

## Business Benefits

### Revenue Optimization
✅ **Capture Both User Types:**
- Active users → Subscription (predictable revenue)
- Casual users → Credits (higher per-action value)

✅ **Maximize Conversions:**
- Some users prefer subscriptions
- Some users prefer pay-per-use
- You get both!

✅ **Reduce Churn:**
- Users can switch models instead of leaving
- More flexibility = higher retention

### User Satisfaction
✅ **Freedom of Choice** - Users pick what works
✅ **No Forced Model** - Not locked into one payment type
✅ **Transparent Pricing** - Clear comparison of both options

---

## Examples

### Example 1: Casual User
Sarah uses the app occasionally:
- Signs up → 15-day trial
- Day 16 → Sees upgrade prompt
- Chooses "Pay-as-You-Go"
- Buys $39.99 for 500 credits
- Uses 20 credits/month
- Credits last 25 months
- Total cost: $1.60/month
- ✅ Better than $19.99/month subscription

### Example 2: Active User
Mike uses the app daily:
- Signs up → 15-day trial
- Very active during trial
- Day 16 → Sees upgrade prompt
- Chooses "Subscription"
- Pays $39.99/month for Gold
- Unlimited everything
- ✅ Better than buying credits constantly

### Example 3: Switcher
Lisa starts with credits:
- Buys $9.99 for 100 credits
- Uses them in 2 weeks
- Realizes she's very active
- Switches to $39.99/month Gold subscription
- ✅ Now has unlimited access

---

## Migration Path

### Existing VIP Premium Users
**Automatic Handling:**
- Existing credit holders remain on credits model
- System detects credit balance
- Grants unlimited access while credits available
- No disruption to existing users

**When Credits Run Low:**
- User sees both options
- Can buy more credits OR switch to subscription
- Smooth transition either way

---

## Database Queries

### Check User's Payment Model
```sql
SELECT payment_model, tier_name
FROM user_subscriptions
WHERE user_id = 'USER_ID';
```

### Count Users by Model
```sql
SELECT
  payment_model,
  COUNT(*) as user_count
FROM user_subscriptions
GROUP BY payment_model;
```

### Switch User to Credits
```sql
SELECT switch_to_credits_model('USER_ID');
```

### Switch User to Subscription
```sql
SELECT switch_to_subscription_model('USER_ID', 'TIER_ID');
```

### See Revenue Split
```sql
-- Subscription revenue (monthly)
SELECT
  COUNT(*) * 29.99 as estimated_monthly_revenue
FROM user_subscriptions us
JOIN subscription_tiers st ON us.tier_id = st.id
WHERE us.payment_model = 'subscription'
  AND st.tier_name != 'free';

-- Credits revenue (one-time purchases)
SELECT SUM(amount_usd) as credits_revenue
FROM payment_transactions
WHERE payment_type = 'credits'
  AND created_at >= NOW() - INTERVAL '30 days';
```

---

## Analytics to Track

### Key Metrics
1. **Conversion Rate by Model**
   - Free → Subscription %
   - Free → Credits %

2. **Revenue per User**
   - Subscription ARPU
   - Credits ARPU

3. **Model Preference**
   - % choosing subscription
   - % choosing credits

4. **Switching Behavior**
   - Credits → Subscription rate
   - Subscription → Credits rate

5. **Lifetime Value**
   - LTV by payment model
   - Retention by payment model

---

## Testing

### Test Scenarios

1. **New User Trial**
   - Sign up → Verify 15-day trial
   - Use features → Hit limits
   - See upgrade prompt with both options

2. **Choose Subscription**
   - Select subscription from prompt
   - Pick tier → Verify unlimited access
   - Check `payment_model = 'subscription'`

3. **Choose Credits**
   - Select credits from prompt
   - Buy package → Verify credits added
   - Check `payment_model = 'credits'`
   - Verify unlimited access

4. **Switch Models**
   - Start with credits
   - Switch to subscription
   - Verify seamless transition
   - Switch back to credits
   - Verify credits still available

5. **Existing Credit Users**
   - User with existing credits
   - Verify unlimited access
   - Verify no disruption

---

## Success Criteria

✅ **Flexibility** - Users can choose their preferred model
✅ **Transparency** - Clear comparison of both options
✅ **Smooth Switching** - Can change models anytime
✅ **No Disruption** - Existing VIP users unaffected
✅ **Revenue Optimization** - Capture both user segments
✅ **Build Success** - All components compile correctly

---

## Summary

You now have a **best-of-both-worlds** payment system:

**For Your Business:**
- Maximize revenue from all user types
- Predictable subscription income
- High-value credit purchases
- Flexible pricing strategy

**For Your Users:**
- Choose what works best
- Switch anytime
- No locked-in commitment
- Transparent pricing

**Result:** Higher conversions, lower churn, happier users, more revenue! 🎉
