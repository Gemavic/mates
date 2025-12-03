/*
  # Create Database Helper Functions
  
  Adds utility functions for common operations in the dating app.
*/

-- Function to check if two users have mutual likes
CREATE OR REPLACE FUNCTION check_mutual_like(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_likes
    WHERE user_id = user_a AND target_user_id = user_b AND like_type IN ('like', 'super_like')
  ) AND EXISTS (
    SELECT 1 FROM user_likes
    WHERE user_id = user_b AND target_user_id = user_a AND like_type IN ('like', 'super_like')
  );
END;
$$;

-- Function to create or get match between two users
CREATE OR REPLACE FUNCTION create_match_if_mutual(user_a uuid, user_b uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  match_id uuid;
  min_user uuid;
  max_user uuid;
BEGIN
  -- Check for mutual like
  IF NOT check_mutual_like(user_a, user_b) THEN
    RETURN NULL;
  END IF;
  
  -- Ensure consistent ordering for match creation
  IF user_a < user_b THEN
    min_user := user_a;
    max_user := user_b;
  ELSE
    min_user := user_b;
    max_user := user_a;
  END IF;
  
  -- Check if match already exists
  SELECT id INTO match_id
  FROM matches
  WHERE user1_id = min_user AND user2_id = max_user;
  
  -- Create match if it doesn't exist
  IF match_id IS NULL THEN
    INSERT INTO matches (user1_id, user2_id, matched_at, is_active)
    VALUES (min_user, max_user, now(), true)
    RETURNING id INTO match_id;
  END IF;
  
  RETURN match_id;
END;
$$;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO total_count
  FROM chat_messages cm
  JOIN chat_threads ct ON ct.id = cm.thread_id
  JOIN matches m ON m.id = ct.match_id
  WHERE (m.user1_id = p_user_id OR m.user2_id = p_user_id)
    AND cm.sender_id != p_user_id
    AND cm.is_read = false;
  
  RETURN COALESCE(total_count, 0);
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_thread_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE chat_messages
  SET is_read = true
  WHERE thread_id = p_thread_id
    AND sender_id != p_user_id
    AND is_read = false;
END;
$$;

-- Function to update newsfeed post counts
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE newsfeed_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE newsfeed_posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE newsfeed_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE newsfeed_posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers for automatic count updates
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON post_likes;
CREATE TRIGGER trigger_update_post_like_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON post_comments;
CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- Function to update user's last activity
CREATE OR REPLACE FUNCTION update_user_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_profiles
  SET updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_mutual_like TO authenticated;
GRANT EXECUTE ON FUNCTION create_match_if_mutual TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read TO authenticated;
