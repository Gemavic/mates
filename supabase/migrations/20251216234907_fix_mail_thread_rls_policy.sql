/*
  # Fix Mail Thread Creation RLS Policy
  
  1. Problem
    - Current RLS policy blocks users from creating mail threads
    - Policy requires user to be participant BEFORE thread exists (catch-22)
    - Constraint requires participant1_id < participant2_id
  
  2. Solution
    - Drop existing overly restrictive policy
    - Create new policy that allows creating threads with ANY other authenticated user
    - Ensure users can only create threads where they are one of the participants
  
  3. Security
    - Users can ONLY create threads they're part of
    - Cannot create threads between two other users
    - Maintains data integrity with CHECK constraint
*/

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can create mail threads" ON mail_threads;

-- Create new policy that allows thread creation with proper checks
CREATE POLICY "Users can create mail threads with others"
  ON mail_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User must be one of the participants
    (participant1_id = auth.uid() OR participant2_id = auth.uid())
    AND
    -- Ensure both participants exist and are not the same
    participant1_id != participant2_id
    AND
    -- Ensure ordering constraint
    participant1_id < participant2_id
  );

-- Also ensure the select policy allows users to see their threads
DROP POLICY IF EXISTS "Users can view their mail threads" ON mail_threads;

CREATE POLICY "Users can view their mail threads"
  ON mail_threads FOR SELECT
  TO authenticated
  USING (participant1_id = auth.uid() OR participant2_id = auth.uid());