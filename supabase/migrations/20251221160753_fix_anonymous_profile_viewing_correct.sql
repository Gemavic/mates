/*
  # Fix Anonymous Profile Viewing and Add is_public Column
  
  1. Changes
    - Add is_public column to user_photos table (defaults to true for discovery)
    - Add RLS policies to allow anonymous (unauthenticated) users to view public profiles
    - Add RLS policies to allow anonymous users to view public photos
    - This ensures Discovery page works for users who are browsing without signing in
    
  2. Security
    - Anonymous users can only view profiles marked as 'public'
    - Anonymous users can only view photos that are marked as public
    - No write access is granted to anonymous users
*/

-- Add is_public column to user_photos if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_photos' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE user_photos ADD COLUMN is_public boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Update existing photos to be public by default
UPDATE user_photos SET is_public = true WHERE is_public IS NULL;

-- Drop existing anonymous policies if they exist (to avoid conflicts)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anonymous users can view public profiles" ON user_profiles;
  DROP POLICY IF EXISTS "Anonymous users can view public photos" ON user_photos;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Add policy to allow anonymous (anon) users to view public profiles for browsing
CREATE POLICY "Anonymous users can view public profiles"
  ON user_profiles
  FOR SELECT
  TO anon
  USING (profile_visibility = 'public');

-- Add policy to allow anonymous users to view public photos
CREATE POLICY "Anonymous users can view public photos"
  ON user_photos
  FOR SELECT
  TO anon
  USING (
    is_public = true 
    AND EXISTS (
      SELECT 1 
      FROM user_profiles 
      WHERE user_profiles.user_id = user_photos.user_id 
      AND user_profiles.profile_visibility = 'public'
    )
  );
