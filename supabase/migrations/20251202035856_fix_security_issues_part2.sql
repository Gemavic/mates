/*
  # Fix Critical Security Issues - Part 2
  
  Drop more unused indexes and fix function search paths
*/

-- Drop unused indexes (batch 2)
DROP INDEX IF EXISTS public.idx_error_logs_user_id;
DROP INDEX IF EXISTS public.idx_error_logs_timestamp;
DROP INDEX IF EXISTS public.idx_login_attempts_user_id;
DROP INDEX IF EXISTS public.idx_login_attempts_ip_address;
DROP INDEX IF EXISTS public.idx_login_attempts_timestamp;
DROP INDEX IF EXISTS public.idx_mail_messages_sender_id;
DROP INDEX IF EXISTS public.idx_mail_messages_thread_id;
DROP INDEX IF EXISTS public.idx_mail_messages_created_at;
DROP INDEX IF EXISTS public.idx_mail_threads_participant1_id;
DROP INDEX IF EXISTS public.idx_mail_threads_participant2_id;
DROP INDEX IF EXISTS public.idx_match_scores_user_id;
DROP INDEX IF EXISTS public.idx_match_scores_potential_match_id;
DROP INDEX IF EXISTS public.idx_match_scores_overall_score;
DROP INDEX IF EXISTS public.idx_matches_user1_id;
DROP INDEX IF EXISTS public.idx_matches_user2_id;
DROP INDEX IF EXISTS public.idx_matches_matched_at;
DROP INDEX IF EXISTS public.idx_matching_interactions_user_id;
DROP INDEX IF EXISTS public.idx_matching_interactions_target_user_id;
DROP INDEX IF EXISTS public.idx_matching_interactions_created_at;
DROP INDEX IF EXISTS public.idx_newsletter_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_newsletter_subscriptions_email;
DROP INDEX IF EXISTS public.idx_photo_access_grants_photo_owner_id;
DROP INDEX IF EXISTS public.idx_photo_access_grants_granted_to_user_id;
DROP INDEX IF EXISTS public.idx_quiz_results_quiz_id;
DROP INDEX IF EXISTS public.idx_quiz_results_user_id;
DROP INDEX IF EXISTS public.idx_security_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_security_audit_log_event_type;
DROP INDEX IF EXISTS public.idx_security_audit_log_timestamp;
DROP INDEX IF EXISTS public.idx_sent_gifts_sender_id;
DROP INDEX IF EXISTS public.idx_sent_gifts_recipient_id;
DROP INDEX IF EXISTS public.idx_sent_gifts_gift_id;
DROP INDEX IF EXISTS public.idx_sent_gifts_created_at;
