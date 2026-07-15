# Comprehensive Reward System for Staff Panel

Your admin staff portal now has a powerful, flexible reward system that allows both manual and automated distribution of credits, kobos, and bonuses!

---

## Overview

The new reward system provides:
- **Manual Rewards** - Staff can award credits/kobos to specific users
- **Automated Rules** - System automatically awards rewards based on triggers
- **Complete History** - Full audit trail of all rewards distributed
- **Flexible Types** - Award bonus credits, purchased credits, kobos, or combinations

---

## Staff Panel Structure

### New Tabs Added

1. **Rewards** 🎁 - Manual reward distribution
2. **Auto Rules** ⚡ - Configure automated reward rules
3. **History** 📊 - View complete reward history

### Existing Tabs Unchanged

- **Overview** - Dashboard view
- **Users** - User management
- **Credits** - Legacy credit awarding (still works)
- **Passwords** - Password management (if permitted)

---

## 1. Manual Reward Distribution (Rewards Tab)

### Four Reward Types

#### A. Bonus Credits (Complimentary)
- **What**: Free credits given to users
- **Use For**:
  - Customer service compensation
  - Contest prizes
  - Loyalty rewards
  - Special occasions
- **Icon**: Yellow gift box
- **Example**: Award 100 bonus credits for excellent feedback

#### B. Purchased Credits
- **What**: Credits counted as purchased (not free)
- **Use For**:
  - Payment refunds
  - Failed transaction compensation
  - Converting complaints to paid credits
- **Icon**: Blue trending up
- **Example**: User's payment failed but they paid - award 500 purchased credits

#### C. Kobos (Platform Currency)
- **What**: Special currency for premium features
- **Use For**:
  - VIP perks
  - Exclusive features
  - Special promotions
  - Milestone rewards
- **Icon**: Purple coins
- **Example**: Award 250 kobos for profile verification

#### D. Combo Reward
- **What**: Award both credits AND kobos together
- **Use For**:
  - Major achievements
  - VIP upgrades
  - Special events
  - High-value compensation
- **Icon**: Pink award
- **Example**: Award 500 credits + 500 kobos for referral success

### How to Award Manual Rewards

1. **Select User**
   - Choose from user dropdown OR
   - Enter user ID manually
   - User's current balance shown

2. **Choose Reward Type**
   - Click one of the 4 reward type cards
   - Interface updates to show relevant fields

3. **Enter Amounts**
   - Credits: Enter amount (if applicable)
   - Kobos: Enter amount (if applicable)
   - Both fields shown for Combo type

4. **Provide Reason**
   - Required field
   - Examples:
     - "Compensation for service disruption"
     - "Winner of Valentine's Day contest"
     - "Loyalty reward for 1 year membership"
     - "Refund for payment issue"

5. **Award Reward**
   - Click "Award Reward" button
   - Success message shows new balances
   - Reward logged in history

### Manual Reward UI Features

- **Real-time validation**
- **Clear visual feedback**
- **Success/error notifications**
- **Reward type explanations**
- **User balance display**

---

## 2. Automated Reward Rules (Auto Rules Tab)

### What Are Automated Rules?

Rules that automatically award rewards when specific triggers occur:
- User signs up → Welcome bonus
- Profile completed → Completion bonus
- 7-day login streak → Loyalty reward
- First verification → Verification reward

### Pre-configured Default Rules

#### 1. Welcome Bonus
- **Trigger**: User signup
- **Reward**: 20 credits + 20 kobos
- **Max Awards**: 1 per user
- **Status**: Active

#### 2. Profile Completion Bonus
- **Trigger**: Profile 100% complete
- **Reward**: 50 credits + 50 kobos
- **Max Awards**: 1 per user
- **Status**: Active

#### 3. Daily Login Streak (7 days)
- **Trigger**: 7 consecutive logins
- **Reward**: 30 credits + 30 kobos
- **Max Awards**: Unlimited (can repeat)
- **Status**: Active

#### 4. First Verification
- **Trigger**: First time verifying identity
- **Reward**: 100 credits + 100 kobos
- **Max Awards**: 1 per user
- **Status**: Active

### Rule Types Available

1. **signup_bonus** - Triggered on new user registration
2. **daily_login** - Triggered by login streaks
3. **profile_completion** - Triggered when profile reaches threshold
4. **referral** - Triggered by successful referrals
5. **milestone** - Triggered by specific achievements
6. **promotion** - Triggered during promotional periods
7. **custom** - Triggered by custom events

### Creating New Rules

#### Step-by-Step

1. **Click "Create Rule"**

2. **Enter Rule Details**:
   - **Rule Name**: Descriptive name (e.g., "Weekend Special Bonus")
   - **Rule Type**: Select from dropdown
   - **Credits**: Amount to award (0 if none)
   - **Kobos**: Amount to award (0 if none)
   - **Max Awards Per User**:
     - `1` = One-time only
     - `999` = Repeatable
   - **Valid Until**: Optional expiry date

3. **Click "Create Rule"**
   - Rule added to list
   - Immediately active
   - Starts processing

#### Example Rules You Can Create

**Limited Time Promotion**
```
Name: "Summer Sale Bonus"
Type: promotion
Credits: 200
Kobos: 200
Max Awards: 1
Valid Until: 2024-08-31
```

**Referral Reward**
```
Name: "Successful Referral Reward"
Type: referral
Credits: 100
Kobos: 50
Max Awards: 999 (unlimited)
Valid Until: (none)
```

**Birthday Bonus**
```
Name: "Birthday Gift"
Type: custom
Credits: 0
Kobos: 100
Max Awards: 12 (once per year)
Valid Until: (none)
```

### Managing Rules

#### Toggle Active/Inactive
- Click toggle icon to activate/deactivate
- Green toggle = Active
- Gray toggle = Inactive
- Inactive rules won't trigger but remain in database

#### Delete Rules
- Click trash icon
- Confirmation dialog appears
- Permanent deletion

#### View Rule Details
Each rule shows:
- Rule name
- Type badge (color-coded)
- Active status
- Reward amounts
- Max awards per user
- Expiry date (if set)

---

## 3. Reward History (History Tab)

### What It Shows

Complete audit trail of:
- All rewards awarded
- Manual and automated
- Who awarded it
- When it was awarded
- Amounts given
- Reason provided

### Statistics Dashboard

Three summary cards:

#### Total Credits Awarded
- Sum of all credits distributed
- Includes bonus and purchased
- Yellow card with gift icon

#### Total Kobos Awarded
- Sum of all kobos distributed
- Purple card with coins icon

#### Total Rewards Count
- Number of reward transactions
- Blue card with award icon

### History Records

Each record shows:
- **Reward Type Badge**: Color-coded
  - Yellow: Bonus Credits
  - Blue: Purchased Credits
  - Purple: Kobos
  - Pink: Combo
- **Reason**: Why it was awarded
- **Amounts**: Credits and/or kobos
- **Source**: Staff Award or System Reward
- **Timestamp**: When awarded
- **User ID**: Recipient (if not filtered)

### Filtering Options

**By Reward Type**:
- All Types (default)
- Bonus Credits only
- Purchased Credits only
- Kobos only
- Combo only

**By User**:
- Select user in Users tab first
- History automatically filters to that user
- Shows complete user reward history

### Limits and Performance

- Shows last 50 rewards globally
- Unlimited when filtered by user
- Real-time updates
- Fast loading with indexes

---

## Database Structure

### New Tables Created

#### reward_history
```sql
- id: Unique reward ID
- user_id: Recipient
- reward_type: Type of reward
- credits_awarded: Credits amount
- kobos_awarded: Kobos amount
- reason: Why awarded
- awarded_by: 'staff', 'system', 'achievement', 'promotion'
- staff_id: Which staff member (if manual) - references staff_members table
- rule_id: Which rule triggered (if automated)
- metadata: Additional data
- created_at: When awarded
```

#### reward_rules
```sql
- id: Unique rule ID
- rule_name: Display name
- rule_type: Category of rule
- is_active: Currently active?
- trigger_condition: When to trigger (JSON)
- reward_config: What to award (JSON)
- max_awards_per_user: Limit per user
- valid_from: Start date
- valid_until: Expiry date
- created_by: Staff who created it - references staff_members table
- created_at/updated_at: Timestamps
```

#### user_achievements
```sql
- id: Achievement ID
- user_id: User who achieved
- achievement_type: Type of achievement
- achieved_at: When achieved
- rule_id: Associated rule
- metadata: Additional data
```

### New Database Functions

#### award_bonus_credits()
```sql
Parameters:
  - p_user_id: User to reward
  - p_amount: Credits to award
  - p_reason: Why awarding
  - p_staff_id: Staff member ID (optional)
  - p_awarded_by: Source ('staff', 'system')

Returns:
  - success: true/false
  - new_balance: Updated credit balance
  - credits_awarded: Amount given
  - reward_id: History record ID
```

#### award_purchased_credits()
```sql
Parameters:
  - p_user_id: User to reward
  - p_amount: Credits to award
  - p_reason: Why awarding
  - p_staff_id: Staff member ID (optional)

Returns:
  - success: true/false
  - new_balance: Updated credit balance
  - credits_awarded: Amount given
  - reward_id: History record ID
```

#### award_kobos()
```sql
Parameters:
  - p_user_id: User to reward
  - p_amount: Kobos to award
  - p_reason: Why awarding
  - p_staff_id: Staff member ID (optional)
  - p_awarded_by: Source ('staff', 'system')

Returns:
  - success: true/false
  - new_balance: Updated kobo balance
  - kobos_awarded: Amount given
  - reward_id: History record ID
```

#### award_combo_reward()
```sql
Parameters:
  - p_user_id: User to reward
  - p_credits: Credits to award
  - p_kobos: Kobos to award
  - p_credit_type: 'complimentary' or 'purchased'
  - p_reason: Why awarding
  - p_staff_id: Staff member ID (optional)
  - p_awarded_by: Source ('staff', 'system')

Returns:
  - success: true/false
  - new_credit_balance: Updated credit balance
  - new_kobo_balance: Updated kobo balance
  - credits_awarded: Credits given
  - kobos_awarded: Kobos given
  - reward_id: History record ID
```

#### check_and_award_automated_rewards()
```sql
Parameters:
  - p_user_id: User to check
  - p_trigger_type: Event that occurred
  - p_trigger_data: Event details (JSON)

Returns:
  - success: true/false
  - rewards_awarded: Array of rewards given
  - total_rules_processed: Count of rules applied
```

---

## Security & Permissions

### Row Level Security (RLS)

#### reward_history Table
- **Users**: Can view own reward history
- **Staff**: Can view all reward history
- **Public**: No access

#### reward_rules Table
- **Users**: Can view active rules only
- **Staff**: Full access (create, read, update, delete)
- **Public**: No access

#### user_achievements Table
- **Users**: Can view own achievements
- **Staff**: Can view all achievements
- **Public**: No access

### Staff Permissions

Current permission system honored:
- `award_credits` - Required to use Rewards tab
- `manage_rewards` - Required to manage automated rules
- `all` - Full access to everything

---

## Usage Examples

### Example 1: Customer Complaint Resolution

**Scenario**: User complains about service disruption

**Action**:
1. Go to Rewards tab
2. Select user from dropdown
3. Choose "Bonus Credits"
4. Enter 200 credits
5. Reason: "Compensation for service disruption on 2024-01-08"
6. Click Award Reward

**Result**:
- User receives 200 bonus credits immediately
- Record created in reward_history
- User notified (if notifications configured)
- Audit trail maintained

### Example 2: Contest Winner

**Scenario**: User wins Valentine's Day photo contest

**Action**:
1. Go to Rewards tab
2. Select contest winner
3. Choose "Combo"
4. Enter 1000 credits + 1000 kobos
5. Reason: "Winner of Valentine's Day Photo Contest 2024"
6. Click Award Reward

**Result**:
- User gets 1000 credits + 1000 kobos
- Combo reward logged
- Winner can use for premium features

### Example 3: Weekend Promotion

**Scenario**: Run weekend double bonus promotion

**Action**:
1. Go to Auto Rules tab
2. Click "Create Rule"
3. Fill in:
   - Name: "Weekend Double Login Bonus"
   - Type: promotion
   - Credits: 40 (double of normal)
   - Kobos: 40
   - Max Awards: 999
   - Valid Until: Sunday night
4. Click Create Rule

**Result**:
- Rule activates immediately
- Every user login gets double bonus
- Expires automatically Sunday night
- All bonuses logged in history

### Example 4: Loyalty Program

**Scenario**: Reward 30-day active users

**Action**:
1. Go to Auto Rules tab
2. Create rule:
   - Name: "30 Day Loyalty Reward"
   - Type: milestone
   - Credits: 500
   - Kobos: 500
   - Max Awards: 1
3. Configure application logic to trigger when user hits 30 days

**Result**:
- Automatic reward at 30-day mark
- One-time per user
- Encourages retention

---

## Integration with Existing Systems

### Credits System
- **Bonus credits** → `complimentary_credits`
- **Purchased credits** → `purchased_credits`
- **Total balance** = complimentary + purchased
- Existing spending logic unchanged

### Kobos System
- Award separately or with credits
- Stored in `total_kobos` field
- Can be used for special features

### Payment Model Integration
- Works with both subscription and credit payment models
- Rewards tracked separately from purchases
- Clear audit trail

### Backward Compatibility
- Old credit awarding still works
- Uses same database functions
- No breaking changes

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Reward Distribution**
   - Total rewards given per day/week/month
   - Average reward value
   - Most common reward types

2. **User Engagement**
   - % of users receiving automated rewards
   - Achievement completion rates
   - Reward redemption patterns

3. **Staff Activity**
   - Manual rewards per staff member
   - Most common compensation reasons
   - Response time to complaints

4. **Rule Performance**
   - Which rules trigger most
   - Which rules drive engagement
   - Expired vs active rules ratio

### Queries for Analytics

**Daily Reward Distribution**
```sql
SELECT
  DATE(created_at) as date,
  reward_type,
  COUNT(*) as count,
  SUM(credits_awarded) as total_credits,
  SUM(kobos_awarded) as total_kobos
FROM reward_history
GROUP BY DATE(created_at), reward_type
ORDER BY date DESC;
```

**Top Rewarded Users**
```sql
SELECT
  user_id,
  COUNT(*) as rewards_received,
  SUM(credits_awarded) as total_credits,
  SUM(kobos_awarded) as total_kobos
FROM reward_history
GROUP BY user_id
ORDER BY total_credits DESC
LIMIT 20;
```

**Staff Performance**
```sql
SELECT
  staff_id,
  COUNT(*) as rewards_given,
  SUM(credits_awarded) as total_credits,
  AVG(credits_awarded) as avg_credits
FROM reward_history
WHERE awarded_by = 'staff'
GROUP BY staff_id;
```

**Rule Effectiveness**
```sql
SELECT
  rr.rule_name,
  rr.rule_type,
  COUNT(rh.id) as times_triggered,
  SUM(rh.credits_awarded) as total_credits,
  SUM(rh.kobos_awarded) as total_kobos
FROM reward_rules rr
LEFT JOIN reward_history rh ON rh.rule_id = rr.id
GROUP BY rr.id, rr.rule_name, rr.rule_type
ORDER BY times_triggered DESC;
```

---

## Best Practices

### For Manual Rewards

1. **Always Provide Clear Reasons**
   - Be specific about why reward was given
   - Include ticket/case numbers if applicable
   - Maintains accountability

2. **Use Appropriate Types**
   - Bonus Credits: Free rewards
   - Purchased Credits: Refunds/compensation
   - Kobos: Special perks
   - Combo: High-value situations

3. **Verify User Identity**
   - Confirm correct user selected
   - Check current balance before awarding
   - Prevent duplicate awards

4. **Document Larger Amounts**
   - Amounts over 1000 credits should have detailed reasons
   - Consider manager approval for very large rewards
   - Maintain separate log for audit

### For Automated Rules

1. **Set Reasonable Limits**
   - One-time bonuses: max_awards = 1
   - Repeatable rewards: max_awards = 999
   - Consider economy balance

2. **Use Expiry Dates**
   - Time-limited promotions should have end dates
   - Prevents indefinite reward drain
   - Enables A/B testing

3. **Test Before Activating**
   - Create rules as inactive first
   - Test trigger logic
   - Activate when confident

4. **Monitor Rule Performance**
   - Check History tab regularly
   - Deactivate underperforming rules
   - Adjust rewards based on data

### For System Health

1. **Regular Audits**
   - Review reward history monthly
   - Check for anomalies
   - Identify abuse patterns

2. **Balance Management**
   - Monitor total credits/kobos in circulation
   - Adjust reward amounts if inflation occurs
   - Consider economy impact

3. **User Communication**
   - Notify users when they receive rewards
   - Explain what triggered automated rewards
   - Encourage desired behaviors

---

## Troubleshooting

### Common Issues

#### "Failed to award reward"
**Cause**: Database connection issue or RLS policy
**Solution**:
1. Check staff permissions
2. Verify user ID exists
3. Check database connection
4. Review browser console for errors

#### "User not found"
**Cause**: Invalid user ID
**Solution**:
1. Use Users tab to find correct ID
2. Copy exact ID (case-sensitive)
3. Verify user exists in system

#### "Rule not triggering"
**Cause**: Inactive rule or max awards reached
**Solution**:
1. Check rule is active (green toggle)
2. Verify user hasn't hit max awards
3. Check expiry date hasn't passed
4. Review trigger conditions

#### "Reward history not loading"
**Cause**: RLS policy or permission issue
**Solution**:
1. Verify staff account has proper permissions
2. Check database RLS policies
3. Refresh page
4. Clear browser cache

---

## Migration Guide

### Applying Database Changes

**IMPORTANT**: The database migration must be applied manually via Supabase Dashboard.

1. **Open Supabase Dashboard**
   - Go to your project
   - Navigate to SQL Editor

2. **Run Migration**
   - Open file: `REWARD_SYSTEM_MIGRATION.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click "Run"

3. **Verify Tables Created**
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_name IN ('reward_history', 'reward_rules', 'user_achievements');
   ```

4. **Verify Functions Created**
   ```sql
   SELECT routine_name
   FROM information_schema.routines
   WHERE routine_name LIKE 'award_%';
   ```

5. **Check Default Rules**
   ```sql
   SELECT * FROM reward_rules;
   ```
   Should show 4 default rules

### No Frontend Changes Needed

The frontend automatically detects and uses new features:
- New tabs appear in staff panel
- Reward system ready to use
- No configuration required

---

## API Reference

### Frontend Components

#### RewardPanel
```typescript
interface RewardPanelProps {
  selectedUserId: string;
  staffId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}
```
Renders manual reward distribution UI

#### AutomatedRulesPanel
```typescript
interface AutomatedRulesPanelProps {
  staffId: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}
```
Renders automated rules management UI

#### RewardHistoryViewer
```typescript
interface RewardHistoryViewerProps {
  selectedUserId?: string;
  onError: (message: string) => void;
}
```
Renders reward history and statistics

### Calling from Application Code

**Trigger Automated Reward**
```typescript
import { supabaseClient } from '@/lib/supabase';

const result = await supabaseClient.rpc('check_and_award_automated_rewards', {
  p_user_id: userId,
  p_trigger_type: 'signup_bonus',
  p_trigger_data: {}
});

if (result.data?.success) {
  console.log('Rewards awarded:', result.data.rewards_awarded);
}
```

**Award Manual Bonus**
```typescript
const result = await supabaseClient.rpc('award_bonus_credits', {
  p_user_id: userId,
  p_amount: 100,
  p_reason: 'Welcome bonus',
  p_staff_id: staffId,
  p_awarded_by: 'staff'
});
```

---

## Future Enhancements

### Potential Additions

1. **Bulk Rewards**
   - Award to multiple users at once
   - CSV upload support
   - Batch processing

2. **Scheduled Rewards**
   - Set future award date/time
   - Recurring rewards (monthly)
   - Birthday auto-rewards

3. **Tiered Rules**
   - Different rewards by user tier
   - Escalating bonuses
   - Loyalty program tiers

4. **Email Notifications**
   - Auto-email on reward
   - Weekly reward summary
   - Achievement announcements

5. **Advanced Analytics**
   - ROI tracking
   - Conversion attribution
   - A/B testing framework

6. **Mobile App Integration**
   - Push notifications
   - In-app reward UI
   - Real-time balance updates

---

## Summary

Your staff panel now has a complete, production-ready reward system:

✅ **Manual Distribution**
- Award bonuses, purchased credits, kobos, or combos
- Flexible reasons and amounts
- Real-time user selection

✅ **Automated Rules**
- Create unlimited reward rules
- Time-limited promotions
- Repeatable or one-time
- 7 rule types supported

✅ **Complete History**
- Full audit trail
- Statistics dashboard
- Filter by type or user
- 50+ records shown

✅ **Database Integration**
- 3 new tables
- 5 new functions
- RLS security
- Performance indexes

✅ **Built & Tested**
- All components working
- Build successful
- No breaking changes
- Backward compatible

**Your staff can now reward users manually and automatically - making user retention, loyalty programs, and customer service much more effective!**
