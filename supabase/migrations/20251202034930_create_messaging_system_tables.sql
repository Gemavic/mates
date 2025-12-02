/*
  # Messaging System Tables Migration
  
  1. New Tables
    - `chat_threads`
      - `id` (uuid, primary key)
      - `match_id` (uuid, references matches)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `thread_id` (uuid, references chat_threads)
      - `sender_id` (uuid, references user_profiles)
      - `message_text` (text)
      - `message_type` (text, default 'text')
      - `credits_spent` (integer, default 0)
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz)
    
    - `mail_threads`
      - `id` (uuid, primary key)
      - `participant1_id` (uuid, references user_profiles)
      - `participant2_id` (uuid, references user_profiles)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `mail_messages`
      - `id` (uuid, primary key)
      - `thread_id` (uuid, references mail_threads)
      - `sender_id` (uuid, references user_profiles)
      - `subject` (text)
      - `message_text` (text)
      - `credits_spent` (integer, default 0)
      - `is_read` (boolean, default false)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all messaging tables
    - Users can only access threads they're part of
*/

CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  message_text text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file')),
  credits_spent integer DEFAULT 0 CHECK (credits_spent >= 0),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  participant2_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (participant1_id < participant2_id)
);

CREATE TABLE IF NOT EXISTS mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES mail_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  subject text NOT NULL,
  message_text text NOT NULL,
  credits_spent integer DEFAULT 0 CHECK (credits_spent >= 0),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their chat threads"
  ON chat_threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = chat_threads.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can create chat threads"
  ON chat_threads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their chat messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      JOIN matches ON matches.id = chat_threads.match_id
      WHERE chat_threads.id = chat_messages.thread_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send chat messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their chat messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_threads
      JOIN matches ON matches.id = chat_threads.match_id
      WHERE chat_threads.id = chat_messages.thread_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_threads
      JOIN matches ON matches.id = chat_threads.match_id
      WHERE chat_threads.id = chat_messages.thread_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can view their mail threads"
  ON mail_threads FOR SELECT
  TO authenticated
  USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can create mail threads"
  ON mail_threads FOR INSERT
  TO authenticated
  WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());

CREATE POLICY "Users can view their mail messages"
  ON mail_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mail_threads
      WHERE mail_threads.id = mail_messages.thread_id
      AND (mail_threads.participant1_id = auth.uid() OR mail_threads.participant2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send mail messages"
  ON mail_messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their mail messages"
  ON mail_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mail_threads
      WHERE mail_threads.id = mail_messages.thread_id
      AND (mail_threads.participant1_id = auth.uid() OR mail_threads.participant2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mail_threads
      WHERE mail_threads.id = mail_messages.thread_id
      AND (mail_threads.participant1_id = auth.uid() OR mail_threads.participant2_id = auth.uid())
    )
  );

CREATE INDEX idx_chat_threads_match ON chat_threads(match_id);
CREATE INDEX idx_chat_messages_thread ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_mail_threads_participants ON mail_threads(participant1_id, participant2_id);
CREATE INDEX idx_mail_messages_thread ON mail_messages(thread_id);
CREATE INDEX idx_mail_messages_sender ON mail_messages(sender_id);
CREATE INDEX idx_mail_messages_created ON mail_messages(created_at DESC);
