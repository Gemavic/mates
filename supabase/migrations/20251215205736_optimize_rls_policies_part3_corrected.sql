/*
  # Optimize RLS Policies - Part 3 Corrected (messages, gift_transactions)

  Corrected to use actual column names: from_user_id/to_user_id instead of sender_id/receiver_id.

  ## Tables Optimized
  1. messages - using from_user_id/to_user_id
  2. gift_transactions
  3. blog_comments
  4. forum_posts
  5. forum_replies

  ## Performance Impact
  - Optimizes messaging system queries
  - Improves gift transaction performance
*/

-- ============================================================================
-- messages - Optimize existing policies (corrected column names)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

CREATE POLICY "Users can view their own messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    from_user_id = (SELECT auth.uid()) 
    OR to_user_id = (SELECT auth.uid())
  );

CREATE POLICY "Users can send messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (SELECT auth.uid()));

-- ============================================================================
-- gift_transactions - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view gifts they sent or received" ON public.gift_transactions;
DROP POLICY IF EXISTS "Users can send gifts" ON public.gift_transactions;

CREATE POLICY "Users can view gifts they sent or received"
  ON public.gift_transactions
  FOR SELECT
  TO authenticated
  USING (
    from_user_id = (SELECT auth.uid()) 
    OR to_user_id = (SELECT auth.uid())
  );

CREATE POLICY "Users can send gifts"
  ON public.gift_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (SELECT auth.uid()));

-- ============================================================================
-- blog_comments - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can post comments" ON public.blog_comments;

CREATE POLICY "Authenticated users can post comments"
  ON public.blog_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- forum_posts - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.forum_posts;

CREATE POLICY "Authenticated users can create posts"
  ON public.forum_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- forum_replies - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can post replies" ON public.forum_replies;

CREATE POLICY "Authenticated users can post replies"
  ON public.forum_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
