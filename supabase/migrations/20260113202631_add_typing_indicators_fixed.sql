/*
  # Add Typing Indicators

  1. New Table
    - `typing_indicators` - Tracks who is currently typing in which thread
      - `user_id` (uuid, references user_profiles)
      - `thread_id` (uuid, references mail_threads)
      - `is_typing` (boolean)
      - `updated_at` (timestamp)

  2. Purpose
    - Show real-time "User is typing..." indicators
    - Automatically clear stale typing indicators after 5 seconds
    - Improve chat UX by showing when someone is composing a message

  3. Security
    - Enable RLS
    - Users can update their own typing status
    - Users can view typing status in threads they're part of
*/

-- Create typing indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES mail_threads(id) ON DELETE CASCADE,
  is_typing boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, thread_id)
);

-- Enable RLS
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Users can update their own typing status
CREATE POLICY "Users can update own typing status"
  ON typing_indicators FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view typing status in their threads
CREATE POLICY "Users can view typing in their threads"
  ON typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mail_threads
      WHERE mail_threads.id = typing_indicators.thread_id
      AND (mail_threads.participant1_id = auth.uid() OR mail_threads.participant2_id = auth.uid())
    )
  );

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_typing_indicators_thread 
ON typing_indicators(thread_id, is_typing);

-- Function to auto-clear stale typing indicators
CREATE OR REPLACE FUNCTION clear_stale_typing_indicators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE typing_indicators
  SET is_typing = false
  WHERE is_typing = true
  AND updated_at < now() - interval '10 seconds';
END;
$$;

COMMENT ON TABLE typing_indicators IS 'Real-time typing status for chat threads';
