/*
  # Fix Critical Security Issues - Part 1
  
  1. Enable RLS on tables missing it (profiles, conversations, conversation_members, messages)
  2. Add missing indexes for next_auth foreign keys
  3. Drop large number of unused indexes to improve write performance
  
  These fixes address:
  - RLS Disabled warnings
  - Unindexed foreign keys
  - Unused index warnings
*/

-- Enable RLS on tables that are missing it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for newly protected tables
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = (select auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = (select auth.uid()))
  WITH CHECK (auth_user_id = (select auth.uid()));

CREATE POLICY "Users can view conversations they're in"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.profile_id IN (
        SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "Users can view conversation members for their conversations"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

-- Add indexes for next_auth foreign keys
CREATE INDEX IF NOT EXISTS idx_accounts_userId ON next_auth.accounts("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON next_auth.sessions("userId");

-- Drop unused indexes (large batch 1)
DROP INDEX IF EXISTS public.idx_profiles_auth_user_id;
DROP INDEX IF EXISTS public.idx_messages_conversation_created;
DROP INDEX IF EXISTS public.idx_conversations_created_by;
DROP INDEX IF EXISTS public.idx_conv_members_profile;
DROP INDEX IF EXISTS public.idx_conv_members_conversation;
DROP INDEX IF EXISTS public.idx_messages_sender;
DROP INDEX IF EXISTS public.idx_algorithm_feedback_user_id;
DROP INDEX IF EXISTS public.idx_algorithm_feedback_match_id;
DROP INDEX IF EXISTS public.idx_biometric_data_user_id;
DROP INDEX IF EXISTS public.idx_chat_messages_sender_id;
DROP INDEX IF EXISTS public.idx_chat_messages_thread_id;
DROP INDEX IF EXISTS public.idx_chat_messages_created_at;
DROP INDEX IF EXISTS public.idx_chat_threads_match_id;
DROP INDEX IF EXISTS public.idx_comment_likes_comment_id;
DROP INDEX IF EXISTS public.idx_comment_likes_user_id;
DROP INDEX IF EXISTS public.idx_credit_access_requests_staff_id;
DROP INDEX IF EXISTS public.idx_credit_access_requests_target_user_id;
DROP INDEX IF EXISTS public.idx_credit_access_requests_approved_by;
DROP INDEX IF EXISTS public.idx_credit_transactions_user_id;
DROP INDEX IF EXISTS public.idx_credit_transactions_created_at;
