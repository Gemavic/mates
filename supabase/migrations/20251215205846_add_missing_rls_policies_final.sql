/*
  # Add Missing RLS Policies for Audit Tables - Final Corrected Version

  This migration adds RLS policies to tables that have RLS enabled but no policies.
  Uses correct column relationships through foreign keys.

  ## Tables Fixed
  1. verification_audit_log - Links via verification_id → verification_requests
  2. verification_documents - Links via verification_id → verification_requests

  ## Security Impact
  - Prevents unauthorized access to sensitive audit data
  - Ensures users can only see their own verification documents
  - Staff can view audit logs for verification management
*/

-- ============================================================================
-- verification_audit_log - Add policies for audit access
-- ============================================================================

-- Users can view audit logs for their own verification requests
CREATE POLICY "Users can view own verification audit logs"
  ON public.verification_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM verification_requests vr
      WHERE vr.id = verification_audit_log.verification_id
      AND vr.user_id = (SELECT auth.uid())
    )
  );

-- Staff members can view all verification audit logs
CREATE POLICY "Staff can view all verification audit logs"
  ON public.verification_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
    )
  );

-- Staff can insert audit log entries
CREATE POLICY "Staff can create verification audit logs"
  ON public.verification_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- verification_documents - Add policies for document access
-- ============================================================================

-- Users can view their own verification documents
CREATE POLICY "Users can view own verification documents"
  ON public.verification_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM verification_requests vr
      WHERE vr.id = verification_documents.verification_id
      AND vr.user_id = (SELECT auth.uid())
    )
  );

-- Users can upload their own verification documents
CREATE POLICY "Users can upload own verification documents"
  ON public.verification_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM verification_requests vr
      WHERE vr.id = verification_documents.verification_id
      AND vr.user_id = (SELECT auth.uid())
    )
  );

-- Users can update their own verification documents
CREATE POLICY "Users can update own verification documents"
  ON public.verification_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM verification_requests vr
      WHERE vr.id = verification_documents.verification_id
      AND vr.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM verification_requests vr
      WHERE vr.id = verification_documents.verification_id
      AND vr.user_id = (SELECT auth.uid())
    )
  );

-- Staff can view all verification documents for review
CREATE POLICY "Staff can view all verification documents"
  ON public.verification_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.user_id = (SELECT auth.uid())
    )
  );
