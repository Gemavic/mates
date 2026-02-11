/*
  # Remove Unused Indexes
  
  1. Performance Optimization
    - Removes indexes that have not been used
    - Reduces storage overhead
    - Reduces write operation costs
    - Reduces index maintenance overhead
  
  2. Impact
    - No negative performance impact (indexes are unused)
    - Reduces database size
    - Improves insert/update/delete performance
  
  3. Safety
    - All indexes being removed are confirmed unused by database advisor
    - Can be recreated if needed in the future
*/

-- Mail and messaging indexes
DROP INDEX IF EXISTS public.idx_mail_messages_thread_created;
DROP INDEX IF EXISTS public.idx_mail_messages_unread;
DROP INDEX IF EXISTS public.idx_mail_threads_participants;
DROP INDEX IF EXISTS public.idx_typing_indicators_active;
DROP INDEX IF EXISTS public.idx_typing_indicators_thread;

-- Reward system indexes
DROP INDEX IF EXISTS public.idx_reward_history_staff_id;
DROP INDEX IF EXISTS public.idx_reward_rules_created_by;
DROP INDEX IF EXISTS public.idx_user_achievements_rule_id;
DROP INDEX IF EXISTS public.idx_reward_history_user_id;

-- Staff indexes
DROP INDEX IF EXISTS public.idx_staff_members_created_by;

-- Algorithm and biometric indexes
DROP INDEX IF EXISTS public.idx_algorithm_feedback_match_id;
DROP INDEX IF EXISTS public.idx_algorithm_feedback_user_id;
DROP INDEX IF EXISTS public.idx_biometric_data_user_id;

-- Blog and content indexes
DROP INDEX IF EXISTS public.idx_blog_comments_user_id;
DROP INDEX IF EXISTS public.idx_blog_articles_author_id;
DROP INDEX IF EXISTS public.idx_blog_comments_article_id;
DROP INDEX IF EXISTS public.idx_content_tags_tag_id;
DROP INDEX IF EXISTS public.idx_comment_likes_comment_id;

-- Chat indexes
DROP INDEX IF EXISTS public.idx_chat_messages_sender_id;
DROP INDEX IF EXISTS public.idx_chat_messages_thread_id;

-- Moderation indexes
DROP INDEX IF EXISTS public.idx_content_moderation_logs_user_id;
DROP INDEX IF EXISTS public.idx_content_moderation_logs_created_at;
DROP INDEX IF EXISTS public.idx_content_moderation_logs_action;
DROP INDEX IF EXISTS public.idx_abuse_reports_reporter_id;
DROP INDEX IF EXISTS public.idx_abuse_reports_reported_user_id;
DROP INDEX IF EXISTS public.idx_abuse_reports_status;
DROP INDEX IF EXISTS public.idx_abuse_reports_priority;
DROP INDEX IF EXISTS public.idx_abuse_reports_created_at;
DROP INDEX IF EXISTS public.idx_abuse_reports_terrorism;
DROP INDEX IF EXISTS public.idx_abuse_reports_cyberbullying;
DROP INDEX IF EXISTS public.idx_moderation_queue_status;
DROP INDEX IF EXISTS public.idx_moderation_queue_severity;
DROP INDEX IF EXISTS public.idx_moderation_queue_created_at;
DROP INDEX IF EXISTS public.idx_moderation_actions_staff_id;
DROP INDEX IF EXISTS public.idx_moderation_actions_target_user_id;
DROP INDEX IF EXISTS public.idx_moderation_actions_created_at;
DROP INDEX IF EXISTS public.idx_user_strikes_user_id;

-- Counselling and service indexes
DROP INDEX IF EXISTS public.idx_counselling_bookings_user_id;
DROP INDEX IF EXISTS public.idx_credit_access_requests_approved_by;
DROP INDEX IF EXISTS public.idx_credit_access_requests_staff_id;
DROP INDEX IF EXISTS public.idx_credit_access_requests_target_user_id;

-- Error and logging indexes
DROP INDEX IF EXISTS public.idx_error_logs_user_id;
DROP INDEX IF EXISTS public.idx_security_audit_log_user_id;

-- Forum indexes
DROP INDEX IF EXISTS public.idx_forum_posts_user_id;
DROP INDEX IF EXISTS public.idx_forum_replies_post_id;
DROP INDEX IF EXISTS public.idx_forum_replies_user_id;

-- Gift and transaction indexes
DROP INDEX IF EXISTS public.idx_gift_transactions_from_user_id;
DROP INDEX IF EXISTS public.idx_gift_transactions_gift_id;
DROP INDEX IF EXISTS public.idx_gift_transactions_to_user_id;

-- Like and interaction indexes
DROP INDEX IF EXISTS public.idx_likes_to_user_id;
DROP INDEX IF EXISTS public.idx_user_likes_target_user_id;

-- Login and security indexes
DROP INDEX IF EXISTS public.idx_login_attempts_user_id;

-- Match and conversation indexes
DROP INDEX IF EXISTS public.idx_match_conversations_match_id;
DROP INDEX IF EXISTS public.idx_match_conversations_user_id;
DROP INDEX IF EXISTS public.idx_match_scores_potential_match_id;
DROP INDEX IF EXISTS public.idx_matches_user2_id;
DROP INDEX IF EXISTS public.idx_matching_interactions_target_user_id;
DROP INDEX IF EXISTS public.idx_matching_interactions_user_id;

-- Media and content indexes
DROP INDEX IF EXISTS public.idx_media_content_author_id;
DROP INDEX IF EXISTS public.idx_media_content_source_id;
DROP INDEX IF EXISTS public.idx_news_fetch_log_source_id;

-- Message indexes
DROP INDEX IF EXISTS public.idx_messages_from_user_id;
DROP INDEX IF EXISTS public.idx_messages_to_user_id;

-- Photo access indexes
DROP INDEX IF EXISTS public.idx_photo_access_grants_granted_to_user_id;

-- Quiz indexes
DROP INDEX IF EXISTS public.idx_quiz_results_quiz_id;
DROP INDEX IF EXISTS public.idx_quiz_results_user_id;

-- Subscription indexes
DROP INDEX IF EXISTS public.idx_subscription_payments_subscription_id;
DROP INDEX IF EXISTS public.idx_subscription_payments_user_id;
DROP INDEX IF EXISTS public.idx_subscription_trials_tier_id;
DROP INDEX IF EXISTS public.idx_subscription_trials_user_id;
DROP INDEX IF EXISTS public.idx_subscription_usage_tracking_subscription_id;
DROP INDEX IF EXISTS public.idx_user_subscriptions_tier_id;

-- User interaction indexes
DROP INDEX IF EXISTS public.idx_user_blocked_blocked_user_id;
DROP INDEX IF EXISTS public.idx_user_comments_parent_comment_id;
DROP INDEX IF EXISTS public.idx_user_comments_user_id;
DROP INDEX IF EXISTS public.idx_user_kobos_user_id;

-- Verification indexes
DROP INDEX IF EXISTS public.idx_verification_audit_log_actor_id;