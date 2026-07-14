# Anonymous Authentication Implementation

## Overview

This document describes the complete implementation of anonymous user support in the dating app. Anonymous users can browse the platform without creating an account, and can later upgrade to a permanent account while preserving their activity data.

## Features Implemented

### 1. Database RLS Policies for Anonymous Users

**Migration:** `20251214000001_add_anonymous_user_support.sql`

**Key Features:**
- **Helper Function:** `auth.is_permanent_user()` - Checks if a user is permanent (not anonymous)
- **Read-Only Access:** Anonymous users can view most content (profiles, articles, forum posts, etc.)
- **Write Restrictions:** Only permanent users can perform actions like:
  - Sending messages
  - Liking profiles
  - Creating matches
  - Sending gifts
  - Posting in forums
  - Purchasing credits
  - Booking services
  - Subscribing to newsletter

**Tables Protected:**
- user_profiles
- matches
- messages
- user_likes
- blog_articles
- blog_comments
- forum_posts
- forum_replies
- user_gifts
- verification_requests
- bookings
- credit_transactions
- newsletter_subscribers

### 2. User Migration and Cleanup Functions

**Migration:** `20251214000002_anonymous_user_migration_cleanup.sql`

**Database Functions:**

#### `get_anonymous_user_data_summary(anonymous_user_id)`
Returns a summary of all data associated with an anonymous user:
- Likes count
- Messages sent/received
- Matches count
- Gifts sent/received
- Forum posts/replies
- Blog comments

#### `migrate_anonymous_user_data(anonymous_user_id, permanent_user_id, conflict_strategy)`
Migrates all data from an anonymous user to a permanent user account.

**Conflict Strategies:**
- `merge`: Combines data, avoiding duplicates
- `replace`: Overwrites existing permanent user data
- `keep_existing`: Keeps permanent user data, discards anonymous data

**Data Migration Includes:**
- User likes
- Messages (sent and received)
- Matches
- Gifts (sent and received)
- Forum posts and replies
- Blog comments
- Bookings
- Credit transactions

#### `cleanup_old_anonymous_users(days_old)`
Automatically deletes anonymous users older than specified days (default: 30).
- Only removes users who haven't signed in recently
- Returns count of deleted users
- Can be scheduled as a cron job

#### `can_upgrade_to_permanent()`
Checks if current user can upgrade from anonymous to permanent status.

#### `get_anonymous_user_stats()`
Admin function to view statistics about anonymous users:
- Total anonymous users
- Anonymous users in last 7/30 days
- Old anonymous users (>30 days)
- Total permanent users

### 3. Frontend Authentication Library

**File:** `src/lib/anonymousAuth.ts`

**Main Functions:**

#### `anonymousAuth.signInAnonymously()`
Signs in a user anonymously without requiring email/password.

#### `anonymousAuth.upgradeToEmailPassword(email, password, options)`
Upgrades an anonymous user to a permanent account.

**Options:**
- `conflictStrategy`: How to handle data conflicts
- `onConflict`: Callback when email already exists

**Handles Two Scenarios:**
1. **New Email:** Creates new permanent account and converts anonymous user
2. **Existing Email:** Signs into existing account and migrates anonymous data

#### `anonymousAuth.getAnonymousUserDataSummary(userId)`
Retrieves summary of anonymous user's activity.

#### `anonymousAuth.getUpgradePromptMessage(dataSummary)`
Generates personalized message encouraging upgrade based on user activity.

### 4. Authentication Hook Updates

**File:** `src/hooks/useAuth.ts`

**New State:**
- `isAnonymous`: Boolean flag indicating if current user is anonymous

**New Methods:**
- `signInAnonymously()`: Initiate anonymous session
- `upgradeToEmailPassword(email, password)`: Convert to permanent account
- `getAnonymousUserData()`: Get summary of anonymous user's data

### 5. Anonymous Upgrade Prompt Component

**File:** `src/components/AnonymousUpgradePrompt.tsx`

**Features:**
- Modal dialog prompting anonymous users to create account
- Shows activity summary (matches, messages, likes, gifts)
- Email/password form with validation
- Handles both new accounts and existing account linking
- Customizable prompt reason
- Beautiful gradient design matching app theme

**Hook:** `useAnonymousUpgradePrompt()`
Provides easy state management for showing/hiding the prompt:
```typescript
const { isOpen, showPrompt, hidePrompt, reason } = useAnonymousUpgradePrompt();
```

### 6. Welcome Screen Updates

**File:** `src/screens/Welcome/Welcome.tsx`

**New Features:**
- "Browse as Guest" button added between sign-up and sign-in
- Initiates anonymous authentication
- Redirects to discovery page after successful anonymous sign-in
- Loading state while processing

## Usage Examples

### Sign In Anonymously
```typescript
const { signInAnonymously } = useAuth();

const handleGuestLogin = async () => {
  const { error } = await signInAnonymously();
  if (!error) {
    // User is now signed in anonymously
    navigate('/discovery');
  }
};
```

### Check If User Is Anonymous
```typescript
const { isAnonymous, user } = useAuth();

if (isAnonymous) {
  // Show upgrade prompts for restricted features
}
```

### Upgrade Anonymous User
```typescript
const { upgradeToEmailPassword } = useAuth();

const handleUpgrade = async () => {
  const { data, error } = await upgradeToEmailPassword(
    'user@example.com',
    'password123'
  );

  if (data?.success) {
    // User upgraded successfully
    // Data migrated if needed
  }
};
```

### Show Upgrade Prompt
```typescript
const { showPrompt } = useAnonymousUpgradePrompt();

// Show when user tries to perform restricted action
const handleSendMessage = () => {
  if (isAnonymous) {
    showPrompt('Create an account to send messages');
    return;
  }
  // Send message
};
```

## Security Considerations

1. **RLS Policies:**
   - All write operations require permanent user status
   - Anonymous users have read-only access to public content
   - Ownership checks still apply for permanent users

2. **Data Migration:**
   - Only users can migrate their own data
   - Migration requires both source and target user authentication
   - Duplicate prevention built into merge strategy

3. **Cleanup:**
   - Only removes users inactive for 30+ days
   - Preserves data integrity
   - Can be run safely in production

## Deployment Steps

1. **Apply Database Migrations:**
   Both migrations will be automatically applied when you deploy:
   - `20251214000001_add_anonymous_user_support.sql`
   - `20251214000002_anonymous_user_migration_cleanup.sql`

2. **Enable Anonymous Sign-Ins in Supabase:**
   - Go to Supabase Dashboard
   - Navigate to Authentication > Settings
   - Enable "Anonymous sign-ins"
   - Save changes

3. **Set Up Cleanup Schedule (Optional):**
   Create a Supabase Edge Function or cron job to periodically run:
   ```sql
   SELECT cleanup_old_anonymous_users(30);
   ```

4. **Test the Flow:**
   - Click "Browse as Guest" on welcome screen
   - Browse profiles (should work)
   - Try sending a message (should be blocked)
   - Click upgrade prompt
   - Create account or link existing account
   - Verify data is preserved

## Best Practices

1. **Prompt at Right Time:**
   - Show upgrade prompt when users try to perform restricted actions
   - After significant engagement (multiple likes, matches)
   - Don't show immediately or too frequently

2. **Clear Communication:**
   - Explain what features require an account
   - Show value of creating account (data preservation)
   - Make it easy to upgrade

3. **Data Preservation:**
   - Always use "merge" strategy unless user explicitly requests otherwise
   - Provide clear feedback about what data will be migrated
   - Handle conflicts gracefully

4. **Cleanup:**
   - Run cleanup regularly (weekly/monthly)
   - Monitor anonymous user count
   - Adjust retention period based on usage patterns

## Future Enhancements

1. **Enhanced Tracking:**
   - Track conversion rate from anonymous to permanent
   - Identify which features drive conversion
   - A/B test different upgrade prompts

2. **Gradual Feature Access:**
   - Allow limited actions for anonymous users (e.g., 3 likes per day)
   - Progressive restrictions to encourage upgrade

3. **Social Sign-In:**
   - Link anonymous account with Google/Facebook
   - One-click upgrade experience

4. **Email Verification:**
   - Optional email verification after upgrade
   - Send confirmation with account details

## Troubleshooting

### Anonymous sign-in not working
- Check Supabase Dashboard > Authentication > Settings
- Ensure "Anonymous sign-ins" is enabled
- Verify database migrations are applied

### Data not migrating
- Check database function permissions
- Verify both users exist in auth.users
- Check conflict strategy setting

### RLS policies blocking access
- Verify `auth.is_permanent_user()` function exists
- Check policy conditions in database
- Test with both anonymous and permanent users

## Summary

The anonymous authentication system provides a frictionless way for users to explore your dating app while maintaining the ability to convert them to permanent users with full data preservation. The implementation is secure, scalable, and follows Supabase best practices.
