/*
  # Matches and Messaging System

  1. New Tables
    - `user_likes` - Track user likes/passes
    - `matches` - Mutual likes become matches
    - `chat_threads` - Chat conversations
    - `chat_messages` - Individual messages
    - `mail_threads` - Mail conversations
    - `mail_messages` - Mail messages

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Match participants can see shared data
*/

-- User likes/swipes table
CREATE TABLE IF NOT EXISTS user_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  like_type text NOT NULL CHECK (like_type IN ('like', 'pass', 'super_like', 'blink')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own likes
CREATE POLICY "Users can manage own likes"
  ON user_likes
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can see likes they received
CREATE POLICY "Users can see received likes"
  ON user_likes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

-- Matches table (mutual likes)
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  matched_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  last_activity timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Match participants can see their matches
CREATE POLICY "Users can see their matches"
  ON matches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Chat threads table
CREATE TABLE IF NOT EXISTS chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;

-- Chat participants can see their threads
CREATE POLICY "Users can see their chat threads"
  ON chat_threads
  FOR SELECT
  TO authenticated
  USING (
    match_id IN (
      SELECT id FROM matches 
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES chat_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_text text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'emoji', 'image', 'video', 'audio')),
  media_url text,
  credits_spent integer DEFAULT 0,
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat participants can manage messages
CREATE POLICY "Users can manage chat messages"
  ON chat_messages
  FOR ALL
  TO authenticated
  USING (
    thread_id IN (
      SELECT ct.id FROM chat_threads ct
      JOIN matches m ON ct.match_id = m.id
      WHERE m.user1_id = auth.uid() OR m.user2_id = auth.uid()
    )
  );

-- Mail threads table
CREATE TABLE IF NOT EXISTS mail_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  participant2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(participant1_id, participant2_id)
);

ALTER TABLE mail_threads ENABLE ROW LEVEL SECURITY;

-- Mail participants can see their threads
CREATE POLICY "Users can see their mail threads"
  ON mail_threads
  FOR ALL
  TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Mail messages table
CREATE TABLE IF NOT EXISTS mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES mail_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject text,
  message_text text NOT NULL,
  has_photos boolean DEFAULT false,
  photo_urls text[] DEFAULT '{}',
  credits_spent integer DEFAULT 0,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;

-- Mail participants can manage messages
CREATE POLICY "Users can manage mail messages"
  ON mail_messages
  FOR ALL
  TO authenticated
  USING (
    thread_id IN (
      SELECT id FROM mail_threads
      WHERE participant1_id = auth.uid() OR participant2_id = auth.uid()
    )
  );

-- Function to create match when mutual like occurs
CREATE OR REPLACE FUNCTION check_for_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process 'like' or 'super_like' actions
  IF NEW.like_type IN ('like', 'super_like') THEN
    -- Check if target user has also liked this user
    IF EXISTS (
      SELECT 1 FROM user_likes 
      WHERE user_id = NEW.target_user_id 
      AND target_user_id = NEW.user_id 
      AND like_type IN ('like', 'super_like')
    ) THEN
      -- Create match (ensure user1_id < user2_id for uniqueness)
      INSERT INTO matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.user_id, NEW.target_user_id),
        GREATEST(NEW.user_id, NEW.target_user_id)
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check for matches on new likes
CREATE TRIGGER on_user_like_created
  AFTER INSERT ON user_likes
  FOR EACH ROW EXECUTE FUNCTION check_for_match();