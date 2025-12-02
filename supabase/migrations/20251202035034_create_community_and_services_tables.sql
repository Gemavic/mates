/*
  # Community and Services Tables Migration
  
  1. New Tables
    - `newsfeed_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `post_type` (text: 'text', 'image', 'video', 'poll')
      - `content` (text)
      - `media_url` (text)
      - `likes_count` (integer, default 0)
      - `comments_count` (integer, default 0)
      - `is_public` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `post_likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references newsfeed_posts)
      - `user_id` (uuid, references user_profiles)
      - `created_at` (timestamptz)
      - Unique constraint on (post_id, user_id)
    
    - `post_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references newsfeed_posts)
      - `user_id` (uuid, references user_profiles)
      - `comment_text` (text)
      - `created_at` (timestamptz)
    
    - `booking_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `service_type` (text: 'counselling', 'couple_therapy', 'financial_education')
      - `session_date` (timestamptz)
      - `session_duration_minutes` (integer)
      - `status` (text: 'scheduled', 'completed', 'cancelled')
      - `payment_status` (text: 'pending', 'paid', 'refunded')
      - `notes` (text)
      - `created_at` (timestamptz)
    
    - `feedback_submissions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `feedback_type` (text: 'bug', 'feature_request', 'general', 'complaint')
      - `subject` (text)
      - `message` (text)
      - `status` (text: 'new', 'in_progress', 'resolved', 'closed')
      - `staff_response` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `quiz_results`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `quiz_type` (text)
      - `quiz_name` (text)
      - `score` (integer)
      - `total_questions` (integer)
      - `results_data` (jsonb)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Users can view public posts, manage their own content
    - Bookings and feedback restricted to user and staff
*/

CREATE TABLE IF NOT EXISTS newsfeed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  post_type text DEFAULT 'text' CHECK (post_type IN ('text', 'image', 'video', 'poll', 'link')),
  content text,
  media_url text,
  likes_count integer DEFAULT 0 CHECK (likes_count >= 0),
  comments_count integer DEFAULT 0 CHECK (comments_count >= 0),
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES newsfeed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES newsfeed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  comment_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('counselling', 'couple_therapy', 'financial_education', 'audio_chat', 'video_chat')),
  session_date timestamptz NOT NULL,
  session_duration_minutes integer DEFAULT 60 CHECK (session_duration_minutes > 0),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature_request', 'general', 'complaint', 'praise')),
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  staff_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  quiz_type text NOT NULL,
  quiz_name text NOT NULL,
  score integer NOT NULL CHECK (score >= 0),
  total_questions integer NOT NULL CHECK (total_questions > 0),
  results_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE newsfeed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public posts"
  ON newsfeed_posts FOR SELECT
  TO authenticated
  USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can create their own posts"
  ON newsfeed_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own posts"
  ON newsfeed_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own posts"
  ON newsfeed_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view post likes"
  ON post_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view post comments"
  ON post_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own comments"
  ON post_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their bookings"
  ON booking_sessions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their feedback"
  ON feedback_submissions FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their quiz results"
  ON quiz_results FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create quiz results"
  ON quiz_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_newsfeed_posts_user ON newsfeed_posts(user_id);
CREATE INDEX idx_newsfeed_posts_created ON newsfeed_posts(created_at DESC);
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_comments_post ON post_comments(post_id);
CREATE INDEX idx_booking_sessions_user ON booking_sessions(user_id);
CREATE INDEX idx_booking_sessions_date ON booking_sessions(session_date);
CREATE INDEX idx_feedback_submissions_user ON feedback_submissions(user_id);
CREATE INDEX idx_feedback_submissions_status ON feedback_submissions(status);
CREATE INDEX idx_quiz_results_user ON quiz_results(user_id);
