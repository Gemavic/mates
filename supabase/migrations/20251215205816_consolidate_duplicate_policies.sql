/*
  # Consolidate Duplicate RLS Policies

  This migration removes duplicate RLS policies that were flagged by the security advisor.
  Multiple permissive policies for the same action create unnecessary complexity.

  ## Tables Cleaned Up
  1. verification_requests - Remove duplicate INSERT/SELECT/UPDATE policies
  2. user_credits - Already consolidated in previous migration
  3. user_profiles - Already consolidated in previous migration
  4. algorithm_feedback - Remove duplicates
  5. staff_members - Remove duplicates

  ## Impact
  - Simplifies policy management
  - Maintains same security level
  - Slightly improves policy evaluation performance
*/

-- ============================================================================
-- verification_requests - Remove remaining duplicates
-- ============================================================================

-- Keep only the optimized policies, remove any legacy ones
DROP POLICY IF EXISTS "Users can manage own verification" ON public.verification_requests;

-- The optimized policies from previous migration are now the only ones

-- ============================================================================
-- algorithm_feedback - Consolidate policies
-- ============================================================================

DROP POLICY IF EXISTS "feedback_insert_own" ON public.algorithm_feedback;
DROP POLICY IF EXISTS "feedback_select_own" ON public.algorithm_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.algorithm_feedback;
DROP POLICY IF EXISTS "Users can view own feedback" ON public.algorithm_feedback;

-- Create single consolidated policy for each action
CREATE POLICY "Users can manage own feedback"
  ON public.algorithm_feedback
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- staff_members - Remove duplicate SELECT policy
-- ============================================================================

DROP POLICY IF EXISTS "Staff can read own data" ON public.staff_members;

-- Keep only "Staff can view all staff members" policy (already optimized)
