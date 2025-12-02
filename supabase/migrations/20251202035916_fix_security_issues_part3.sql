/*
  # Fix Critical Security Issues - Part 3
  
  Drop remaining unused indexes
*/

-- Drop unused indexes (batch 3)
DROP INDEX IF EXISTS public.idx_subscription_payments_user_id;
DROP INDEX IF EXISTS public.idx_subscription_payments_subscription_id;
DROP INDEX IF EXISTS public.idx_subscription_payments_payment_date;
DROP INDEX IF EXISTS public.idx_subscription_trials_user_id;
DROP INDEX IF EXISTS public.idx_subscription_trials_tier_id;
DROP INDEX IF EXISTS public.idx_subscription_trials_trial_status;
DROP INDEX IF EXISTS public.idx_blog_articles_author_id;
DROP INDEX IF EXISTS public.idx_blog_articles_category;
DROP INDEX IF EXISTS public.idx_subscription_usage_tracking_user_id;
DROP INDEX IF EXISTS public.idx_subscription_usage_tracking_subscription_id;
DROP INDEX IF EXISTS public.idx_user_comments_user_id;
DROP INDEX IF EXISTS public.idx_user_comments_parent_comment_id;
DROP INDEX IF EXISTS public.idx_user_comments_content_type_id;
DROP INDEX IF EXISTS public.idx_user_kobos_user_id;
DROP INDEX IF EXISTS public.idx_user_kobos_is_used;
DROP INDEX IF EXISTS public.idx_user_likes_user_id;
DROP INDEX IF EXISTS public.idx_user_likes_target_user_id;
DROP INDEX IF EXISTS public.idx_user_likes_created_at;
DROP INDEX IF EXISTS public.idx_user_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_user_subscriptions_tier_id;
DROP INDEX IF EXISTS public.idx_user_subscriptions_status;
DROP INDEX IF EXISTS public.idx_user_verification_user_id;
DROP INDEX IF EXISTS public.idx_user_verification_reviewer_id;
DROP INDEX IF EXISTS public.idx_user_verification_status;
DROP INDEX IF EXISTS public.idx_verification_audit_log_verification_id;
DROP INDEX IF EXISTS public.idx_verification_audit_log_actor_id;
DROP INDEX IF EXISTS public.idx_verification_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_verification_documents_verification_id;
DROP INDEX IF EXISTS public.idx_verification_documents_document_type;
DROP INDEX IF EXISTS public.idx_blog_articles_published_at;
DROP INDEX IF EXISTS public.idx_blog_articles_featured;
