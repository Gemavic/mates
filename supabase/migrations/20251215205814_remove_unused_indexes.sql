/*
  # Remove Unused Indexes

  This migration removes indexes that are not being used by queries.
  Unused indexes consume storage and slow down INSERT/UPDATE/DELETE operations.

  ## Indexes Being Removed
  
  These indexes were created but analysis shows they are not used by any queries:
  - User profile indexes (age, location - not used for filtering yet)
  - Likes indexes (superseded by foreign key indexes)
  - Matches indexes (redundant with primary key)
  - Blog article slug index (not used in queries)
  - Chat threads match_id (not used)
  - Algorithm feedback user_id (not used)
  - NextAuth indexes (table not in use)

  ## Performance Impact
  - Reduces storage usage
  - Speeds up write operations (INSERT, UPDATE, DELETE)
  - Maintains query performance (these weren't being used)

  ## Note
  These can be recreated later if usage patterns change and queries start using them.
*/

-- User profiles - These aren't used because queries don't filter by age/location yet
DROP INDEX IF EXISTS public.idx_user_profiles_age;
DROP INDEX IF EXISTS public.idx_user_profiles_location;

-- Likes - Superseded by foreign key indexes we just created
DROP INDEX IF EXISTS public.idx_likes_from_user;
DROP INDEX IF EXISTS public.idx_likes_to_user;

-- Matches - Redundant indexes
DROP INDEX IF EXISTS public.idx_matches_user1;
DROP INDEX IF EXISTS public.idx_matches_user2;
DROP INDEX IF EXISTS public.idx_matches_id;
DROP INDEX IF EXISTS public.idx_matches_user1_user2;

-- Messages - Superseded by foreign key indexes
DROP INDEX IF EXISTS public.idx_messages_from_user;
DROP INDEX IF EXISTS public.idx_messages_to_user;

-- Match conversations
DROP INDEX IF EXISTS public.idx_match_conversations_match_id;

-- Blog articles
DROP INDEX IF EXISTS public.idx_blog_articles_slug;

-- Chat threads
DROP INDEX IF EXISTS public.idx_chat_threads_match_id;

-- Profiles (duplicate table)
DROP INDEX IF EXISTS public.idx_profiles_auth_user_id;

-- Conversation members
DROP INDEX IF EXISTS public.idx_conversation_members_conversation;

-- Algorithm feedback
DROP INDEX IF EXISTS public.idx_algorithm_feedback_user_id;

-- NextAuth tables (not being used in this app)
DROP INDEX IF EXISTS next_auth.idx_accounts_userid;
DROP INDEX IF EXISTS next_auth.idx_sessions_userid;
