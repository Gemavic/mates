/*
  # Fix Virtual Gifts RLS for Public Access

  1. Security Updates
    - Add policy for anonymous users to view active gifts
    - Ensure both authenticated and anonymous users can browse gifts
    
  2. Changes
    - Add public SELECT policy for virtual_gifts table
    - Anyone (including anonymous users) can view active gifts
*/

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active gifts" ON virtual_gifts;

-- Create new policy allowing both authenticated and anonymous users to view gifts
CREATE POLICY "Public can view active gifts"
  ON virtual_gifts
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);