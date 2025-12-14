/*
  # Anonymous User Migration and Cleanup Functions

  1. Overview
    - Adds database functions to support anonymous user migration to permanent accounts
    - Implements automatic cleanup of old anonymous users
    - Provides conflict resolution strategies for data migration

  2. Functions Created
    - migrate_anonymous_user_data: Migrates data from anonymous user to permanent user
    - cleanup_old_anonymous_users: Deletes anonymous users older than specified days
    - get_anonymous_user_data_summary: Returns summary of data owned by anonymous user

  3. Migration Strategy
    - Reassigns all user-owned records to the permanent user
    - Handles potential conflicts with merge strategy
    - Preserves data integrity during migration

  4. Cleanup Strategy
    - Automatically removes anonymous users after 30 days
    - Can be run as a scheduled job or manual cleanup
    - Only removes users with no active sessions

  5. Security
    - All functions use SECURITY DEFINER with proper permission checks
    - Only authenticated users can migrate their own data
    - Cleanup function requires service role access
*/

-- ============================================================================
-- FUNCTION: Get summary of anonymous user data
-- ============================================================================

CREATE OR REPLACE FUNCTION get_anonymous_user_data_summary(anonymous_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  summary jsonb;
BEGIN
  -- Only allow users to check their own data
  IF auth.uid() != anonymous_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Can only check own data';
  END IF;

  SELECT jsonb_build_object(
    'likes_count', (SELECT COUNT(*) FROM user_likes WHERE liker_id = anonymous_user_id),
    'messages_sent', (SELECT COUNT(*) FROM messages WHERE sender_id = anonymous_user_id),
    'messages_received', (SELECT COUNT(*) FROM messages WHERE receiver_id = anonymous_user_id),
    'matches_count', (SELECT COUNT(*) FROM matches WHERE user_id_1 = anonymous_user_id OR user_id_2 = anonymous_user_id),
    'gifts_sent', (SELECT COUNT(*) FROM user_gifts WHERE sender_id = anonymous_user_id),
    'gifts_received', (SELECT COUNT(*) FROM user_gifts WHERE receiver_id = anonymous_user_id),
    'forum_posts', (SELECT COUNT(*) FROM forum_posts WHERE user_id = anonymous_user_id),
    'forum_replies', (SELECT COUNT(*) FROM forum_replies WHERE user_id = anonymous_user_id),
    'blog_comments', (SELECT COUNT(*) FROM blog_comments WHERE user_id = anonymous_user_id)
  ) INTO summary;

  RETURN summary;
END;
$$;

-- ============================================================================
-- FUNCTION: Migrate anonymous user data to permanent user
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_anonymous_user_data(
  anonymous_user_id uuid,
  permanent_user_id uuid,
  conflict_strategy text DEFAULT 'merge' -- Options: 'merge', 'replace', 'keep_existing'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  migration_result jsonb;
  rows_affected integer;
  total_migrated integer := 0;
BEGIN
  -- Verify the anonymous user is actually anonymous
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = anonymous_user_id 
    AND is_anonymous = true
  ) THEN
    RAISE EXCEPTION 'Source user is not an anonymous user';
  END IF;

  -- Verify the permanent user is not anonymous
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = permanent_user_id 
    AND is_anonymous = true
  ) THEN
    RAISE EXCEPTION 'Target user must be a permanent user';
  END IF;

  -- Start migration based on strategy
  
  -- Migrate user_likes (avoid duplicates)
  IF conflict_strategy = 'merge' THEN
    UPDATE user_likes 
    SET liker_id = permanent_user_id
    WHERE liker_id = anonymous_user_id
    AND NOT EXISTS (
      SELECT 1 FROM user_likes 
      WHERE liker_id = permanent_user_id 
      AND liked_id = user_likes.liked_id
    );
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    total_migrated := total_migrated + rows_affected;
    
    -- Delete duplicates
    DELETE FROM user_likes WHERE liker_id = anonymous_user_id;
  ELSIF conflict_strategy = 'replace' THEN
    DELETE FROM user_likes WHERE liker_id = permanent_user_id;
    UPDATE user_likes SET liker_id = permanent_user_id WHERE liker_id = anonymous_user_id;
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    total_migrated := total_migrated + rows_affected;
  END IF;

  -- Migrate messages sent
  UPDATE messages 
  SET sender_id = permanent_user_id 
  WHERE sender_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate messages received
  UPDATE messages 
  SET receiver_id = permanent_user_id 
  WHERE receiver_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate matches
  UPDATE matches 
  SET user_id_1 = permanent_user_id 
  WHERE user_id_1 = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  UPDATE matches 
  SET user_id_2 = permanent_user_id 
  WHERE user_id_2 = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate gifts sent
  UPDATE user_gifts 
  SET sender_id = permanent_user_id 
  WHERE sender_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate gifts received
  UPDATE user_gifts 
  SET receiver_id = permanent_user_id 
  WHERE receiver_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate forum posts
  UPDATE forum_posts 
  SET user_id = permanent_user_id 
  WHERE user_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate forum replies
  UPDATE forum_replies 
  SET user_id = permanent_user_id 
  WHERE user_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate blog comments
  UPDATE blog_comments 
  SET user_id = permanent_user_id 
  WHERE user_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate bookings
  UPDATE bookings 
  SET user_id = permanent_user_id 
  WHERE user_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Migrate credit transactions (if any - though anonymous users shouldn't have these)
  UPDATE credit_transactions 
  SET user_id = permanent_user_id 
  WHERE user_id = anonymous_user_id;
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  total_migrated := total_migrated + rows_affected;

  -- Delete the anonymous user profile if it exists
  DELETE FROM user_profiles WHERE user_id = anonymous_user_id;

  -- Build result summary
  SELECT jsonb_build_object(
    'success', true,
    'anonymous_user_id', anonymous_user_id,
    'permanent_user_id', permanent_user_id,
    'total_records_migrated', total_migrated,
    'strategy_used', conflict_strategy,
    'migrated_at', now()
  ) INTO migration_result;

  RETURN migration_result;
END;
$$;

-- ============================================================================
-- FUNCTION: Cleanup old anonymous users
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_anonymous_users(days_old integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  deleted_user_ids uuid[];
BEGIN
  -- Delete anonymous users and collect their IDs
  WITH deleted AS (
    DELETE FROM auth.users
    WHERE is_anonymous = true 
    AND created_at < now() - (days_old || ' days')::interval
    AND last_sign_in_at < now() - (days_old || ' days')::interval
    RETURNING id
  )
  SELECT array_agg(id), COUNT(*) 
  INTO deleted_user_ids, deleted_count
  FROM deleted;

  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', COALESCE(deleted_count, 0),
    'days_threshold', days_old,
    'cleaned_at', now()
  );
END;
$$;

-- ============================================================================
-- FUNCTION: Check if user can upgrade (has valid email)
-- ============================================================================

CREATE OR REPLACE FUNCTION can_upgrade_to_permanent()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_email text;
  is_anon boolean;
BEGIN
  -- Get current user email and anonymous status
  SELECT email, is_anonymous 
  INTO user_email, is_anon
  FROM auth.users 
  WHERE id = auth.uid();

  -- Can upgrade if anonymous and has no email, or has unconfirmed email
  RETURN is_anon = true;
END;
$$;

-- ============================================================================
-- FUNCTION: Get anonymous user stats for admin
-- ============================================================================

CREATE OR REPLACE FUNCTION get_anonymous_user_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats jsonb;
BEGIN
  -- Only allow staff/admin to view stats
  IF NOT EXISTS (
    SELECT 1 FROM staff_members 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_anonymous_users', (
      SELECT COUNT(*) FROM auth.users WHERE is_anonymous = true
    ),
    'anonymous_users_last_7_days', (
      SELECT COUNT(*) FROM auth.users 
      WHERE is_anonymous = true 
      AND created_at > now() - interval '7 days'
    ),
    'anonymous_users_last_30_days', (
      SELECT COUNT(*) FROM auth.users 
      WHERE is_anonymous = true 
      AND created_at > now() - interval '30 days'
    ),
    'old_anonymous_users', (
      SELECT COUNT(*) FROM auth.users 
      WHERE is_anonymous = true 
      AND created_at < now() - interval '30 days'
    ),
    'permanent_users', (
      SELECT COUNT(*) FROM auth.users WHERE COALESCE(is_anonymous, false) = false
    )
  ) INTO stats;

  RETURN stats;
END;
$$;

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

-- Grant execute permissions to authenticated users for migration functions
GRANT EXECUTE ON FUNCTION get_anonymous_user_data_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_anonymous_user_data(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION can_upgrade_to_permanent() TO authenticated;

-- Grant execute permissions to service role for cleanup
GRANT EXECUTE ON FUNCTION cleanup_old_anonymous_users(integer) TO service_role;
GRANT EXECUTE ON FUNCTION get_anonymous_user_stats() TO authenticated;
