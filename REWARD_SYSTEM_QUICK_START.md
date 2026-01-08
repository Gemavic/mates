# Reward System Quick Start

## Setup (One-Time)

1. **Apply Database Migration**
   - Open Supabase Dashboard → SQL Editor
   - Run: `REWARD_SYSTEM_MIGRATION.sql`
   - Verify tables created: `reward_history`, `reward_rules`, `user_achievements`

2. **Login to Staff Panel**
   - Navigate to staff login
   - Use your staff credentials

3. **You're Ready!**
   - New tabs automatically appear
   - Start using immediately

---

## Staff Panel Tabs

### 🎁 Rewards Tab - Manual Distribution

**Award Types:**
1. **Bonus Credits** - Free credits (complimentary)
2. **Purchased Credits** - Refund/compensation credits
3. **Kobos** - Platform currency
4. **Combo** - Credits + Kobos together

**Quick Steps:**
1. Select user
2. Choose reward type
3. Enter amount(s)
4. Provide reason
5. Click "Award Reward"

### ⚡ Auto Rules Tab - Automated Rewards

**Pre-configured Rules:**
- Welcome Bonus: 20 credits + 20 kobos (signup)
- Profile Completion: 50 credits + 50 kobos (100% complete)
- Login Streak: 30 credits + 30 kobos (7 days)
- First Verification: 100 credits + 100 kobos (verify)

**Create New Rule:**
1. Click "Create Rule"
2. Enter rule name
3. Select rule type
4. Set credits/kobos amounts
5. Set max awards per user
6. Optional: Set expiry date
7. Click "Create Rule"

**Manage Rules:**
- Toggle active/inactive
- Delete unused rules
- View trigger stats

### 📊 History Tab - Audit Trail

**View:**
- All rewards distributed
- Total credits/kobos awarded
- Individual reward records
- Filter by type or user

**Statistics:**
- Total Credits Awarded
- Total Kobos Awarded
- Total Number of Rewards

---

## Common Use Cases

### Customer Service Compensation
```
Tab: Rewards
Type: Bonus Credits
Amount: 200
Reason: "Service disruption compensation"
```

### Contest Winner
```
Tab: Rewards
Type: Combo
Amount: 1000 credits + 1000 kobos
Reason: "Valentine's Day contest winner"
```

### Weekend Promotion
```
Tab: Auto Rules
Create New Rule:
  Name: "Weekend Double Bonus"
  Type: promotion
  Credits: 40
  Kobos: 40
  Max Awards: 999
  Valid Until: Sunday night
```

### Refund Processing
```
Tab: Rewards
Type: Purchased Credits
Amount: 500
Reason: "Payment failed refund for order #12345"
```

---

## Database Functions (For Developers)

### Award Bonus Credits
```typescript
await supabaseClient.rpc('award_bonus_credits', {
  p_user_id: 'user-uuid',
  p_amount: 100,
  p_reason: 'Welcome bonus',
  p_staff_id: 'staff-uuid',
  p_awarded_by: 'staff'
});
```

### Award Kobos
```typescript
await supabaseClient.rpc('award_kobos', {
  p_user_id: 'user-uuid',
  p_amount: 50,
  p_reason: 'Achievement reward',
  p_awarded_by: 'system'
});
```

### Award Combo
```typescript
await supabaseClient.rpc('award_combo_reward', {
  p_user_id: 'user-uuid',
  p_credits: 200,
  p_kobos: 100,
  p_credit_type: 'complimentary',
  p_reason: 'Special promotion',
  p_staff_id: 'staff-uuid'
});
```

### Trigger Automated Rewards
```typescript
await supabaseClient.rpc('check_and_award_automated_rewards', {
  p_user_id: 'user-uuid',
  p_trigger_type: 'signup_bonus',
  p_trigger_data: {}
});
```

---

## Reward Types Explained

| Type | What | When to Use | Example |
|------|------|-------------|---------|
| **Bonus Credits** | Free complimentary credits | Gifts, loyalty, contests | "100 credits for app review" |
| **Purchased Credits** | Credits counted as purchased | Refunds, compensation | "500 credits refund for payment issue" |
| **Kobos** | Special platform currency | VIP features, exclusives | "250 kobos for verification" |
| **Combo** | Both credits and kobos | Major events, high value | "1000 each for referral success" |

---

## Rule Types Explained

| Type | Use Case | Example |
|------|----------|---------|
| **signup_bonus** | New user welcome | 20 credits on signup |
| **daily_login** | Login streaks | 30 credits for 7 days |
| **profile_completion** | Complete profiles | 50 credits at 100% |
| **referral** | Successful referrals | 100 credits per referral |
| **milestone** | User achievements | 500 credits at 30 days |
| **promotion** | Time-limited offers | Double weekend bonus |
| **custom** | Special events | Birthday bonus |

---

## Permissions Required

- **award_credits** - Use Rewards tab
- **manage_rewards** - Create/edit automated rules
- **all** - Full access to everything

---

## Troubleshooting

**Reward failed?**
- Check staff permissions
- Verify user ID is correct
- Ensure amount is greater than 0

**Rule not triggering?**
- Check rule is active (green toggle)
- Verify user hasn't hit max awards
- Check expiry date

**History not showing?**
- Verify staff permissions
- Refresh page
- Check browser console

---

## Files

- `COMPREHENSIVE_REWARD_SYSTEM_GUIDE.md` - Full documentation
- `REWARD_SYSTEM_MIGRATION.sql` - Database setup
- `src/components/RewardPanel.tsx` - Manual rewards UI
- `src/components/AutomatedRulesPanel.tsx` - Rules management UI
- `src/components/RewardHistoryViewer.tsx` - History viewer UI

---

## Support

For detailed information, see: `COMPREHENSIVE_REWARD_SYSTEM_GUIDE.md`

Built and tested successfully ✅
