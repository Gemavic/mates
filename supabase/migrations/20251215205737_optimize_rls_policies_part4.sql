/*
  # Optimize RLS Policies - Part 4 (counselling_bookings, staff_members, user_profiles)

  Final batch of RLS policy optimizations.

  ## Tables Optimized
  1. counselling_bookings
  2. staff_members
  3. user_profiles (multiple policies)
  4. user_credits (multiple policies)

  ## Performance Impact
  - Completes RLS optimization across all tables
  - Major performance improvement for user profile queries
*/

-- ============================================================================
-- counselling_bookings - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.counselling_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.counselling_bookings;

CREATE POLICY "Users can view their own bookings"
  ON public.counselling_bookings
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create bookings"
  ON public.counselling_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- staff_members - Optimize existing policies
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view all staff members" ON public.staff_members;

CREATE POLICY "Staff can view all staff members"
  ON public.staff_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- user_profiles - Optimize ALL existing policies
-- ============================================================================

-- Drop all existing user_profiles policies
DROP POLICY IF EXISTS "allow_authenticated_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_authenticated_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "allow_authenticated_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for users own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable read access for public profiles" ON public.user_profiles;

-- Create optimized policies (consolidated to avoid duplicates)
CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (profile_visibility = 'public');

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ============================================================================
-- user_credits - Optimize ALL existing policies
-- ============================================================================

-- Drop all existing user_credits policies
DROP POLICY IF EXISTS "allow_authenticated_insert_own_credits" ON public.user_credits;
DROP POLICY IF EXISTS "allow_authenticated_select_own_credits" ON public.user_credits;
DROP POLICY IF EXISTS "allow_authenticated_update_own_credits" ON public.user_credits;
DROP POLICY IF EXISTS "Enable insert for authenticated users own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Enable read access for users own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Enable update for users own credits" ON public.user_credits;

-- Create optimized policies (consolidated to avoid duplicates)
CREATE POLICY "Users can read own credits"
  ON public.user_credits
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage own credits"
  ON public.user_credits
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
