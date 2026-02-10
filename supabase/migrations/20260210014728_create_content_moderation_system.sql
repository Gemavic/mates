/*
  # Create Content Moderation System

  1. New Tables
    - `content_moderation_logs`: Tracks all content scans (images, videos, text)
    - `abuse_reports`: Enhanced reporting system for user violations
    - `moderation_queue`: Queue for manual review by staff
    - `moderation_actions`: Log of all moderation actions taken

  2. Security
    - RLS enabled on all tables
    - Staff-only access for moderation tools
    - Users can view their own reports and moderation logs

  3. Purpose
    - Compliance with payment processor requirements
    - AI-based content scanning before upload
    - Report and review mechanism for encrypted content
    - Audit trail for all moderation actions
*/

-- Content Moderation Logs Table
CREATE TABLE IF NOT EXISTS public.content_moderation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('image', 'video', 'text', 'profile', 'bio')),
  content_id uuid,
  scan_result jsonb NOT NULL DEFAULT '{}',
  risk_score decimal(5,2) DEFAULT 0,
  has_nudity boolean DEFAULT false,
  has_violence boolean DEFAULT false,
  has_explicit_content boolean DEFAULT false,
  action_taken text CHECK (action_taken IN ('approved', 'rejected', 'flagged', 'manual_review')),
  scanner_service text DEFAULT 'hive_moderation',
  created_at timestamptz DEFAULT now()
);

-- Abuse Reports Table
CREATE TABLE IF NOT EXISTS public.abuse_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('harassment', 'nudity', 'solicitation', 'fraud', 'underage', 'violence', 'hate_speech', 'spam', 'other')),
  description text,
  context_type text CHECK (context_type IN ('message', 'profile', 'photo', 'call', 'other')),
  context_id uuid,
  evidence_data jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed', 'escalated')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to uuid REFERENCES auth.users(id),
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Moderation Queue Table
CREATE TABLE IF NOT EXISTS public.moderation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id uuid,
  content_url text,
  content_preview text,
  reason text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Moderation Actions Table
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES auth.users(id),
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('warning', 'content_removal', 'temporary_ban', 'permanent_ban', 'account_suspension', 'verification_revoked', 'manual_review')),
  reason text NOT NULL,
  related_report_id uuid REFERENCES public.abuse_reports(id),
  related_content_id uuid,
  duration_days integer,
  expires_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- User Strikes Table (Three strikes system)
CREATE TABLE IF NOT EXISTS public.user_moderation_strikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strike_number integer NOT NULL DEFAULT 1,
  reason text NOT NULL,
  action_id uuid REFERENCES public.moderation_actions(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, strike_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_moderation_logs_user_id ON public.content_moderation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_logs_created_at ON public.content_moderation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_moderation_logs_action ON public.content_moderation_logs(action_taken);

CREATE INDEX IF NOT EXISTS idx_abuse_reports_reporter_id ON public.abuse_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_reported_user_id ON public.abuse_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON public.abuse_reports(status);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_priority ON public.abuse_reports(priority);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_created_at ON public.abuse_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_severity ON public.moderation_queue(severity);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_created_at ON public.moderation_queue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_staff_id ON public.moderation_actions(staff_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target_user_id ON public.moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created_at ON public.moderation_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_strikes_user_id ON public.user_moderation_strikes(user_id);

-- Enable RLS
ALTER TABLE public.content_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_moderation_strikes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for content_moderation_logs
CREATE POLICY "Users can view own moderation logs"
  ON public.content_moderation_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Staff can view all moderation logs"
  ON public.content_moderation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "System can insert moderation logs"
  ON public.content_moderation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- RLS Policies for abuse_reports
CREATE POLICY "Users can view own reports"
  ON public.abuse_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = (select auth.uid()) OR reported_user_id = (select auth.uid()));

CREATE POLICY "Staff can view all reports"
  ON public.abuse_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Users can create reports"
  ON public.abuse_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));

CREATE POLICY "Staff can update reports"
  ON public.abuse_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

-- RLS Policies for moderation_queue
CREATE POLICY "Staff can view moderation queue"
  ON public.moderation_queue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "System can add to queue"
  ON public.moderation_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Staff can update queue items"
  ON public.moderation_queue
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

-- RLS Policies for moderation_actions
CREATE POLICY "Users can view actions against them"
  ON public.moderation_actions
  FOR SELECT
  TO authenticated
  USING (target_user_id = (select auth.uid()));

CREATE POLICY "Staff can view all actions"
  ON public.moderation_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Staff can create actions"
  ON public.moderation_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

-- RLS Policies for user_moderation_strikes
CREATE POLICY "Users can view own strikes"
  ON public.user_moderation_strikes
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Staff can view all strikes"
  ON public.user_moderation_strikes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

CREATE POLICY "Staff can create strikes"
  ON public.user_moderation_strikes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );

-- Function to check if user is banned or suspended
CREATE OR REPLACE FUNCTION public.check_user_moderation_status(check_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  active_ban record;
  strike_count integer;
BEGIN
  -- Check for active bans or suspensions
  SELECT * INTO active_ban
  FROM moderation_actions
  WHERE target_user_id = check_user_id
  AND action_type IN ('temporary_ban', 'permanent_ban', 'account_suspension')
  AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  -- Count active strikes
  SELECT COUNT(*) INTO strike_count
  FROM user_moderation_strikes
  WHERE user_id = check_user_id
  AND (expires_at IS NULL OR expires_at > NOW());

  -- Build result
  result := jsonb_build_object(
    'is_banned', active_ban.id IS NOT NULL,
    'ban_type', active_ban.action_type,
    'ban_reason', active_ban.reason,
    'ban_expires_at', active_ban.expires_at,
    'strike_count', strike_count,
    'is_restricted', strike_count >= 2
  );

  RETURN result;
END;
$$;

-- Function to log content scan
CREATE OR REPLACE FUNCTION public.log_content_scan(
  p_user_id uuid,
  p_content_type text,
  p_content_id uuid,
  p_scan_result jsonb,
  p_risk_score decimal,
  p_action_taken text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO content_moderation_logs (
    user_id,
    content_type,
    content_id,
    scan_result,
    risk_score,
    has_nudity,
    has_violence,
    has_explicit_content,
    action_taken
  ) VALUES (
    p_user_id,
    p_content_type,
    p_content_id,
    p_scan_result,
    p_risk_score,
    (p_scan_result->>'has_nudity')::boolean,
    (p_scan_result->>'has_violence')::boolean,
    (p_scan_result->>'has_explicit_content')::boolean,
    p_action_taken
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

COMMENT ON TABLE public.content_moderation_logs IS 'Tracks all AI-based content scans for compliance';
COMMENT ON TABLE public.abuse_reports IS 'User-submitted reports of violations';
COMMENT ON TABLE public.moderation_queue IS 'Queue for manual staff review';
COMMENT ON TABLE public.moderation_actions IS 'Audit trail of all moderation actions';
COMMENT ON FUNCTION public.check_user_moderation_status IS 'Returns current moderation status of a user';
COMMENT ON FUNCTION public.log_content_scan IS 'Logs content moderation scan results';
