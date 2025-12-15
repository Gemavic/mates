/*
  # Optimize RLS Policies - Part 2 (credit_transactions, likes, matches)

  Continues RLS policy optimization for transactional tables.

  ## Tables Optimized
  1. credit_transactions
  2. likes
  3. matches
  4. match_conversations

  ## Performance Impact
  - Optimizes high-traffic tables
  - Improves query performance for user-specific data
*/

-- ============================================================================
-- credit_transactions - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.credit_transactions;

CREATE POLICY "Users can view their own transactions"
  ON public.credit_transactions
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- likes - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can create likes" ON public.likes;
DROP POLICY IF EXISTS "Users can view likes they sent or received" ON public.likes;

CREATE POLICY "Users can create likes"
  ON public.likes
  FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (SELECT auth.uid()));

CREATE POLICY "Users can view likes they sent or received"
  ON public.likes
  FOR SELECT
  TO authenticated
  USING (
    from_user_id = (SELECT auth.uid()) 
    OR to_user_id = (SELECT auth.uid())
  );

-- ============================================================================
-- matches - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own matches" ON public.matches;

CREATE POLICY "Users can view their own matches"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (
    user1_id = (SELECT auth.uid()) 
    OR user2_id = (SELECT auth.uid())
  );

-- ============================================================================
-- match_conversations - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view messages in their matches" ON public.match_conversations;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON public.match_conversations;

CREATE POLICY "Users can view messages in their matches"
  ON public.match_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_conversations.match_id
      AND (matches.user1_id = (SELECT auth.uid()) OR matches.user2_id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Users can send messages in their matches"
  ON public.match_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_conversations.match_id
      AND (matches.user1_id = (SELECT auth.uid()) OR matches.user2_id = (SELECT auth.uid()))
    )
  );
