/*
  # Optimize RLS Policies for Performance
  
  1. Performance Optimization
    - Fixes RLS policies that re-evaluate auth functions for each row
    - Uses `(select auth.uid())` pattern for better performance at scale
    - Prevents repeated function calls during row-by-row evaluation
  
  2. Policies Updated
    - staff_members: "Only staff can view staff list"
    - credit_transactions: "Users view own transactions only"
  
  3. Impact
    - No functional changes
    - Significant performance improvement for large result sets
    - Reduces CPU usage during policy evaluation
  
  4. Safety
    - Backward compatible
    - Same security guarantees
    - Recommended by Supabase best practices
*/

-- Optimize staff_members policy
DROP POLICY IF EXISTS "Only staff can view staff list" ON public.staff_members;
CREATE POLICY "Only staff can view staff list"
  ON public.staff_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.id = (select auth.uid()) AND sm.is_active = true
    )
    OR id = (select auth.uid())
  );

-- Optimize credit_transactions policy (remove duplicate)
DROP POLICY IF EXISTS "Users view own transactions only" ON public.credit_transactions;
CREATE POLICY "Users view own transactions only"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));