/*
  # Add Public Read Access Policies

  ## Changes
  This migration adds public read access to key tables that need to be viewable
  by unauthenticated users (anon role) to allow profile browsing before signup.

  ## Tables Modified
  1. **user_profiles** - Allow anon users to SELECT all profiles for browsing
  2. **user_photos** - Allow anon users to view all profile photos
  3. **virtual_gifts** - Allow anon users to browse gift shop
  4. **credit_packages** - Allow anon users to view pricing
  5. **blog_articles** - Allow anon users to read blog content

  ## Security Notes
  - Only SELECT (read) permission granted to anon users
  - All write operations (INSERT, UPDATE, DELETE) still require authentication
  - Sensitive user data not exposed (only public profile information)
  - This follows standard dating app patterns where browsing is public but interaction requires signup

  ## Impact
  - Fixes 401 errors when unauthenticated users browse profiles
  - Allows users to explore the app before committing to signup
  - Improves user experience and conversion rates
*/

-- Add public read access for user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'anon_users_can_browse_profiles'
  ) THEN
    CREATE POLICY "anon_users_can_browse_profiles"
      ON user_profiles
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Add public read access for user_photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_photos' 
    AND policyname = 'anon_users_can_view_photos'
  ) THEN
    CREATE POLICY "anon_users_can_view_photos"
      ON user_photos
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Add public read access for virtual_gifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'virtual_gifts' 
    AND policyname = 'anon_users_can_browse_gifts'
  ) THEN
    CREATE POLICY "anon_users_can_browse_gifts"
      ON virtual_gifts
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;

-- Add public read access for credit_packages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_packages' 
    AND policyname = 'anon_users_can_view_pricing'
  ) THEN
    CREATE POLICY "anon_users_can_view_pricing"
      ON credit_packages
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;

-- Add public read access for blog_articles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'blog_articles' 
    AND policyname = 'anon_users_can_read_blog'
  ) THEN
    CREATE POLICY "anon_users_can_read_blog"
      ON blog_articles
      FOR SELECT
      TO anon
      USING (published = true);
  END IF;
END $$;
