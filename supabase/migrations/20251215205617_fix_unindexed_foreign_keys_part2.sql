/*
  # Fix Unindexed Foreign Keys - Part 2 (Performance Critical)

  Continuation of foreign key indexing for remaining tables.

  ## Tables Being Indexed (Part 2 - L through Z)
  
  1. login_attempts - user_id
  2. mail_messages - sender_id, thread_id
  3. mail_threads - participant2_id
  4. match_conversations - user_id
  5. match_scores - potential_match_id
  6. matching_interactions - target_user_id, user_id
  7. photo_access_grants - granted_to_user_id
  8. quiz_results - quiz_id, user_id
  9. security_audit_log - user_id
  10. subscription_payments - subscription_id, user_id
  11. subscription_trials - tier_id, user_id
  12. subscription_usage_tracking - subscription_id
  13. user_blocked - blocked_user_id
  14. user_comments - parent_comment_id, user_id
  15. user_kobos - user_id
  16. user_likes - target_user_id
  17. user_subscriptions - tier_id
  18. verification_audit_log - actor_id

  ## Performance Impact
  - Completes foreign key indexing across entire database
  - Ensures optimal query performance for all relationships
*/

-- login_attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id 
ON public.login_attempts(user_id);

-- mail_messages
CREATE INDEX IF NOT EXISTS idx_mail_messages_sender_id 
ON public.mail_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_mail_messages_thread_id 
ON public.mail_messages(thread_id);

-- mail_threads
CREATE INDEX IF NOT EXISTS idx_mail_threads_participant2_id 
ON public.mail_threads(participant2_id);

-- match_conversations
CREATE INDEX IF NOT EXISTS idx_match_conversations_user_id 
ON public.match_conversations(user_id);

-- match_scores
CREATE INDEX IF NOT EXISTS idx_match_scores_potential_match_id 
ON public.match_scores(potential_match_id);

-- matching_interactions
CREATE INDEX IF NOT EXISTS idx_matching_interactions_target_user_id 
ON public.matching_interactions(target_user_id);

CREATE INDEX IF NOT EXISTS idx_matching_interactions_user_id 
ON public.matching_interactions(user_id);

-- photo_access_grants
CREATE INDEX IF NOT EXISTS idx_photo_access_grants_granted_to_user_id 
ON public.photo_access_grants(granted_to_user_id);

-- quiz_results
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id 
ON public.quiz_results(quiz_id);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id 
ON public.quiz_results(user_id);

-- security_audit_log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id 
ON public.security_audit_log(user_id);

-- subscription_payments
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription_id 
ON public.subscription_payments(subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id 
ON public.subscription_payments(user_id);

-- subscription_trials
CREATE INDEX IF NOT EXISTS idx_subscription_trials_tier_id 
ON public.subscription_trials(tier_id);

CREATE INDEX IF NOT EXISTS idx_subscription_trials_user_id 
ON public.subscription_trials(user_id);

-- subscription_usage_tracking
CREATE INDEX IF NOT EXISTS idx_subscription_usage_tracking_subscription_id 
ON public.subscription_usage_tracking(subscription_id);

-- user_blocked
CREATE INDEX IF NOT EXISTS idx_user_blocked_blocked_user_id 
ON public.user_blocked(blocked_user_id);

-- user_comments
CREATE INDEX IF NOT EXISTS idx_user_comments_parent_comment_id 
ON public.user_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_user_comments_user_id 
ON public.user_comments(user_id);

-- user_kobos
CREATE INDEX IF NOT EXISTS idx_user_kobos_user_id 
ON public.user_kobos(user_id);

-- user_likes
CREATE INDEX IF NOT EXISTS idx_user_likes_target_user_id 
ON public.user_likes(target_user_id);

-- user_subscriptions
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier_id 
ON public.user_subscriptions(tier_id);

-- verification_audit_log
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_actor_id 
ON public.verification_audit_log(actor_id);
