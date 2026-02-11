/*
  # Add Missing Foreign Key Indexes
  
  1. Performance Improvement
    - Adds indexes on foreign key columns that were missing covering indexes
    - Improves query performance for joins and foreign key lookups
    - Reduces database load during cascade operations
  
  2. Tables Affected
    - next_auth.accounts (userId)
    - next_auth.sessions (userId)
    - public.abuse_reports (assigned_to)
    - public.moderation_actions (related_report_id)
    - public.moderation_queue (reviewed_by, user_id)
    - public.user_moderation_strikes (action_id)
  
  3. Security
    - No data access changes
    - Performance improvement only
*/

-- Add index for next_auth.accounts foreign key
CREATE INDEX IF NOT EXISTS idx_accounts_userId 
  ON next_auth.accounts("userId");

-- Add index for next_auth.sessions foreign key
CREATE INDEX IF NOT EXISTS idx_sessions_userId 
  ON next_auth.sessions("userId");

-- Add index for abuse_reports foreign key
CREATE INDEX IF NOT EXISTS idx_abuse_reports_assigned_to 
  ON public.abuse_reports(assigned_to);

-- Add index for moderation_actions foreign key
CREATE INDEX IF NOT EXISTS idx_moderation_actions_related_report_id 
  ON public.moderation_actions(related_report_id);

-- Add indexes for moderation_queue foreign keys
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reviewed_by 
  ON public.moderation_queue(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_user_id_fk 
  ON public.moderation_queue(user_id);

-- Add index for user_moderation_strikes foreign key
CREATE INDEX IF NOT EXISTS idx_user_moderation_strikes_action_id 
  ON public.user_moderation_strikes(action_id);