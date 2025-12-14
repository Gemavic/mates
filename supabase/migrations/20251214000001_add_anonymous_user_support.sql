/*
  # Add Anonymous User Support with RLS Policies

  1. Overview
    - Adds comprehensive RLS policies to support anonymous users
    - Anonymous users can view content but cannot perform actions that create/modify data
    - Permanent users have full access based on ownership and permissions

  2. Policy Strategy
    - SELECT policies: Allow both anonymous and permanent users to view content
    - INSERT/UPDATE/DELETE policies: Restrict to permanent (non-anonymous) users only
    - Additional checks for ownership and permissions where applicable

  3. Tables Updated
    - user_profiles: Anonymous users can view profiles
    - matches: Only permanent users can create matches
    - messages: Only permanent users can send messages
    - user_likes: Only permanent users can like profiles
    - blog_articles: Anonymous users can view, only permanent can post
    - blog_comments: Only permanent users can comment
    - forum_posts: Anonymous users can view, only permanent can post
    - forum_replies: Only permanent users can reply
    - user_gifts: Only permanent users can send gifts
    - verification_requests: Only permanent users can verify
    - bookings: Only permanent users can book services
    - credit_transactions: Only permanent users can purchase credits
    - newsletter_subscribers: Only permanent users can subscribe

  4. Helper Function
    - Creates a helper function to check if a user is permanent (not anonymous)

  5. Security Notes
    - Anonymous users are read-only across the platform
    - All write operations require permanent user status
    - Ownership checks still apply for permanent users
*/

-- Create helper function to check if user is permanent (not anonymous)
CREATE OR REPLACE FUNCTION auth.is_permanent_user()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false;
$$;

-- ============================================================================
-- USER PROFILES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile data" ON user_profiles;

CREATE POLICY "All authenticated users can view profiles"
ON user_profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only permanent users can update own profile"
ON user_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND auth.is_permanent_user())
WITH CHECK (auth.uid() = user_id AND auth.is_permanent_user());

-- ============================================================================
-- MATCHES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own matches" ON matches;
DROP POLICY IF EXISTS "Users can create own matches" ON matches;
DROP POLICY IF EXISTS "Users can update own matches" ON matches;

CREATE POLICY "Permanent users can view own matches"
ON matches FOR SELECT
TO authenticated
USING (
  (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can create matches"
ON matches FOR INSERT
TO authenticated
WITH CHECK (
  user_id_1 = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can update matches"
ON matches FOR UPDATE
TO authenticated
USING (
  (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
  AND auth.is_permanent_user()
)
WITH CHECK (
  (user_id_1 = auth.uid() OR user_id_2 = auth.uid())
  AND auth.is_permanent_user()
);

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Users can create own messages" ON messages;
DROP POLICY IF EXISTS "Users can update own messages" ON messages;

CREATE POLICY "Permanent users can view own messages"
ON messages FOR SELECT
TO authenticated
USING (
  (sender_id = auth.uid() OR receiver_id = auth.uid())
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can update own messages"
ON messages FOR UPDATE
TO authenticated
USING (
  sender_id = auth.uid()
  AND auth.is_permanent_user()
)
WITH CHECK (
  sender_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- USER LIKES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own likes" ON user_likes;
DROP POLICY IF EXISTS "Users can create own likes" ON user_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON user_likes;

CREATE POLICY "Permanent users can view own likes"
ON user_likes FOR SELECT
TO authenticated
USING (
  liker_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can like profiles"
ON user_likes FOR INSERT
TO authenticated
WITH CHECK (
  liker_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can unlike profiles"
ON user_likes FOR DELETE
TO authenticated
USING (
  liker_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- BLOG ARTICLES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view published articles" ON blog_articles;
DROP POLICY IF EXISTS "Staff can manage articles" ON blog_articles;

CREATE POLICY "All authenticated users can view published articles"
ON blog_articles FOR SELECT
TO authenticated
USING (published = true);

CREATE POLICY "Only permanent staff can create articles"
ON blog_articles FOR INSERT
TO authenticated
WITH CHECK (
  auth.is_permanent_user()
  AND EXISTS (
    SELECT 1 FROM staff_members
    WHERE user_id = auth.uid() AND role IN ('admin', 'content_creator')
  )
);

CREATE POLICY "Only permanent staff can update articles"
ON blog_articles FOR UPDATE
TO authenticated
USING (
  auth.is_permanent_user()
  AND EXISTS (
    SELECT 1 FROM staff_members
    WHERE user_id = auth.uid() AND role IN ('admin', 'content_creator')
  )
)
WITH CHECK (
  auth.is_permanent_user()
  AND EXISTS (
    SELECT 1 FROM staff_members
    WHERE user_id = auth.uid() AND role IN ('admin', 'content_creator')
  )
);

-- ============================================================================
-- BLOG COMMENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view comments" ON blog_comments;
DROP POLICY IF EXISTS "Users can create comments" ON blog_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON blog_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON blog_comments;

CREATE POLICY "All authenticated users can view comments"
ON blog_comments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only permanent users can create comments"
ON blog_comments FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can update own comments"
ON blog_comments FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
)
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can delete own comments"
ON blog_comments FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- FORUM POSTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can create posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON forum_posts;

CREATE POLICY "All authenticated users can view forum posts"
ON forum_posts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only permanent users can create forum posts"
ON forum_posts FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can update own forum posts"
ON forum_posts FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
)
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can delete own forum posts"
ON forum_posts FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- FORUM REPLIES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can view replies" ON forum_replies;
DROP POLICY IF EXISTS "Users can create replies" ON forum_replies;
DROP POLICY IF EXISTS "Users can update own replies" ON forum_replies;
DROP POLICY IF EXISTS "Users can delete own replies" ON forum_replies;

CREATE POLICY "All authenticated users can view forum replies"
ON forum_replies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only permanent users can create forum replies"
ON forum_replies FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can update own forum replies"
ON forum_replies FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
)
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can delete own forum replies"
ON forum_replies FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- USER GIFTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view received gifts" ON user_gifts;
DROP POLICY IF EXISTS "Users can send gifts" ON user_gifts;

CREATE POLICY "Permanent users can view received gifts"
ON user_gifts FOR SELECT
TO authenticated
USING (
  (sender_id = auth.uid() OR receiver_id = auth.uid())
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can send gifts"
ON user_gifts FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- VERIFICATION REQUESTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own verification" ON verification_requests;
DROP POLICY IF EXISTS "Users can create verification request" ON verification_requests;
DROP POLICY IF EXISTS "Users can update own verification" ON verification_requests;

CREATE POLICY "Permanent users can view own verification"
ON verification_requests FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can create verification requests"
ON verification_requests FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can update own verification"
ON verification_requests FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
)
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- BOOKINGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;

CREATE POLICY "Permanent users can view own bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can create bookings"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can update own bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
)
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- CREDIT TRANSACTIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
DROP POLICY IF EXISTS "Users can create transactions" ON credit_transactions;

CREATE POLICY "Permanent users can view own transactions"
ON credit_transactions FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

CREATE POLICY "Only permanent users can create credit transactions"
ON credit_transactions FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND auth.is_permanent_user()
);

-- ============================================================================
-- NEWSLETTER SUBSCRIBERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can manage own subscription" ON newsletter_subscribers;

CREATE POLICY "Only permanent users can subscribe to newsletter"
ON newsletter_subscribers FOR INSERT
TO authenticated
WITH CHECK (auth.is_permanent_user());

CREATE POLICY "Permanent users can view own subscription"
ON newsletter_subscribers FOR SELECT
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND auth.is_permanent_user()
);

CREATE POLICY "Permanent users can unsubscribe"
ON newsletter_subscribers FOR DELETE
TO authenticated
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND auth.is_permanent_user()
);
