/*
  # Fix Always-True RLS Policy
  
  1. Security Fix
    - Fixes moderation_queue INSERT policy that allows unrestricted access
    - Previous policy had WITH CHECK (true), effectively bypassing RLS
    - New policy restricts INSERT to staff members only
  
  2. Impact
    - Prevents unauthorized users from adding items to moderation queue
    - Only active staff members can insert into moderation_queue
    - System functions running as service role are not affected
  
  3. Safety
    - Backward compatible with existing staff workflows
    - Does not affect SELECT, UPDATE, or DELETE policies
    - Maintains data integrity
*/

-- Fix moderation_queue policy that allows unrestricted access
DROP POLICY IF EXISTS "System can add to queue" ON public.moderation_queue;
CREATE POLICY "System can add to queue"
  ON public.moderation_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only staff members can add to moderation queue
    EXISTS (
      SELECT 1 FROM public.staff_members 
      WHERE id = (select auth.uid()) AND is_active = true
    )
  );