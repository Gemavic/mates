/*
  # Fix Mail Messaging RLS Policies

  1. Problem
    - Mail message insert fails due to incomplete RLS policy
    - Using FOR ALL with only USING clause doesn't allow INSERT
    - Need separate INSERT policy with WITH CHECK clause

  2. Solution
    - Drop existing overly-broad FOR ALL policy
    - Create separate SELECT, INSERT, UPDATE, DELETE policies
    - Properly allow authenticated users to send/manage their messages

  3. Security
    - Users can only send messages in threads they're part of
    - Users can read messages in their threads
    - Users can delete/update only their own messages
*/

-- Drop the overly-broad policy
DROP POLICY IF EXISTS "Users can manage mail messages" ON mail_messages;

-- Create separate SELECT policy for reading messages
CREATE POLICY "Users can read mail messages in their threads"
  ON mail_messages
  FOR SELECT
  TO authenticated
  USING (
    thread_id IN (
      SELECT id FROM mail_threads
      WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
    )
  );

-- Create INSERT policy for sending messages
CREATE POLICY "Users can send mail messages in their threads"
  ON mail_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    thread_id IN (
      SELECT id FROM mail_threads
      WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
    )
  );

-- Create UPDATE policy for editing messages
CREATE POLICY "Users can update own mail messages"
  ON mail_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Create DELETE policy for removing messages
CREATE POLICY "Users can delete own mail messages"
  ON mail_messages
  FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- Also fix mail_threads to use separate policies
DROP POLICY IF EXISTS "Users can see their mail threads" ON mail_threads;

CREATE POLICY "Users can read their mail threads"
  ON mail_threads
  FOR SELECT
  TO authenticated
  USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can create mail threads"
  ON mail_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can update their mail threads"
  ON mail_threads
  FOR UPDATE
  TO authenticated
  USING (participant1_id = auth.uid() OR participant2_id = auth.uid())
  WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());
