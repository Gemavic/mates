/*
  # Fix Unindexed Foreign Keys - Part 1 (Performance Critical)

  This migration adds indexes to all foreign key columns that are missing them.
  Foreign key indexes are critical for:
  - JOIN performance
  - CASCADE operations
  - Foreign key constraint checks
  - Query optimization

  ## Tables Being Indexed (Part 1 - A through G)
  
  1. algorithm_feedback - match_id
  2. biometric_data - user_id
  3. blog_articles - author_id
  4. blog_comments - article_id, user_id
  5. chat_messages - sender_id, thread_id
  6. comment_likes - comment_id
  7. conversation_members - profile_id
  8. conversations - created_by
  9. counselling_bookings - user_id
  10. credit_access_requests - approved_by, staff_id, target_user_id
  11. error_logs - user_id
  12. forum_posts - user_id
  13. forum_replies - post_id, user_id
  14. gift_transactions - from_user_id, gift_id, to_user_id

  ## Performance Impact
  - Significantly improves query performance for JOINs
  - Speeds up foreign key constraint validation
  - Reduces table scan operations
*/

-- algorithm_feedback
CREATE INDEX IF NOT EXISTS idx_algorithm_feedback_match_id 
ON public.algorithm_feedback(match_id);

-- biometric_data
CREATE INDEX IF NOT EXISTS idx_biometric_data_user_id 
ON public.biometric_data(user_id);

-- blog_articles
CREATE INDEX IF NOT EXISTS idx_blog_articles_author_id 
ON public.blog_articles(author_id);

-- blog_comments
CREATE INDEX IF NOT EXISTS idx_blog_comments_article_id 
ON public.blog_comments(article_id);

CREATE INDEX IF NOT EXISTS idx_blog_comments_user_id 
ON public.blog_comments(user_id);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id 
ON public.chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id 
ON public.chat_messages(thread_id);

-- comment_likes
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id 
ON public.comment_likes(comment_id);

-- conversation_members
CREATE INDEX IF NOT EXISTS idx_conversation_members_profile_id 
ON public.conversation_members(profile_id);

-- conversations
CREATE INDEX IF NOT EXISTS idx_conversations_created_by 
ON public.conversations(created_by);

-- counselling_bookings
CREATE INDEX IF NOT EXISTS idx_counselling_bookings_user_id 
ON public.counselling_bookings(user_id);

-- credit_access_requests
CREATE INDEX IF NOT EXISTS idx_credit_access_requests_approved_by 
ON public.credit_access_requests(approved_by);

CREATE INDEX IF NOT EXISTS idx_credit_access_requests_staff_id 
ON public.credit_access_requests(staff_id);

CREATE INDEX IF NOT EXISTS idx_credit_access_requests_target_user_id 
ON public.credit_access_requests(target_user_id);

-- error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id 
ON public.error_logs(user_id);

-- forum_posts
CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id 
ON public.forum_posts(user_id);

-- forum_replies
CREATE INDEX IF NOT EXISTS idx_forum_replies_post_id 
ON public.forum_replies(post_id);

CREATE INDEX IF NOT EXISTS idx_forum_replies_user_id 
ON public.forum_replies(user_id);

-- gift_transactions
CREATE INDEX IF NOT EXISTS idx_gift_transactions_from_user_id 
ON public.gift_transactions(from_user_id);

CREATE INDEX IF NOT EXISTS idx_gift_transactions_gift_id 
ON public.gift_transactions(gift_id);

CREATE INDEX IF NOT EXISTS idx_gift_transactions_to_user_id 
ON public.gift_transactions(to_user_id);
