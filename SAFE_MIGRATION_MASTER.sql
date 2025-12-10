-- ============================================
-- DATES APP - SAFE MASTER MIGRATION
-- ============================================
-- This migration safely handles existing objects
-- Run this in Supabase SQL Editor

-- Drop existing types if they exist (safe because we recreate them)
DO $$ BEGIN
  DROP TYPE IF EXISTS stripe_subscription_status CASCADE;
  DROP TYPE IF EXISTS subscription_tier CASCADE;
  DROP TYPE IF EXISTS payment_status CASCADE;
  DROP TYPE IF EXISTS gift_status CASCADE;
  DROP TYPE IF EXISTS verification_status CASCADE;
  DROP TYPE IF EXISTS booking_status CASCADE;
  DROP TYPE IF EXISTS message_type CASCADE;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create enum types
CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid', 'trialing');
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'vip');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE gift_status AS ENUM ('sent', 'received', 'opened');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE message_type AS ENUM ('text', 'image', 'gift', 'audio', 'video');

-- ============================================
-- CORE USER TABLES
-- ============================================

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  first_name text,
  age integer CHECK (age >= 18 AND age <= 120),
  location text,
  occupation text,
  education text,
  bio text,
  interests jsonb DEFAULT '[]'::jsonb,
  profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'verified_only')),
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Create policies
CREATE POLICY "Users can view public profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (profile_visibility = 'public' OR user_id = auth.uid());

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_visibility ON user_profiles(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);

-- User Photos Table
CREATE TABLE IF NOT EXISTS user_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view photos of visible profiles" ON user_photos;
DROP POLICY IF EXISTS "Users can manage their own photos" ON user_photos;

CREATE POLICY "Users can view photos of visible profiles"
  ON user_photos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = user_photos.user_id
      AND (user_profiles.profile_visibility = 'public' OR user_profiles.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage their own photos"
  ON user_photos FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON user_photos(user_id);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_gender text,
  min_age integer DEFAULT 18,
  max_age integer DEFAULT 100,
  max_distance integer DEFAULT 50,
  interests jsonb DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;

CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User Blocked Table
CREATE TABLE IF NOT EXISTS user_blocked (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, blocked_user_id)
);

ALTER TABLE user_blocked ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own blocked list" ON user_blocked;

CREATE POLICY "Users can manage their own blocked list"
  ON user_blocked FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- CREDIT SYSTEM TABLES
-- ============================================

-- User Credits Table
CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer DEFAULT 0 CHECK (balance >= 0),
  total_earned integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own credits" ON user_credits;

CREATE POLICY "Users can view their own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Credit Packages Table
CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  price_usd numeric(10,2) NOT NULL,
  popular boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view credit packages" ON credit_packages;

CREATE POLICY "Anyone can view credit packages"
  ON credit_packages FOR SELECT
  TO authenticated
  USING (true);

-- Credit Transactions Table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'spend', 'earn', 'refund')),
  description text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON credit_transactions;

CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);

-- ============================================
-- MATCHING SYSTEM TABLES
-- ============================================

-- Likes Table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create likes" ON likes;
DROP POLICY IF EXISTS "Users can view likes they sent or received" ON likes;

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can view likes they sent or received"
  ON likes FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_likes_from_user ON likes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_likes_to_user ON likes(to_user_id);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_at timestamptz DEFAULT now(),
  last_message_at timestamptz,
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own matches" ON matches;

CREATE POLICY "Users can view their own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_matches_user1 ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON matches(user2_id);

-- Match Conversations Table
CREATE TABLE IF NOT EXISTS match_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE match_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their matches" ON match_conversations;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON match_conversations;

CREATE POLICY "Users can view messages in their matches"
  ON match_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_conversations.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their matches"
  ON match_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_conversations.match_id
      AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_match_conversations_match_id ON match_conversations(match_id);

-- ============================================
-- MESSAGING SYSTEM TABLES
-- ============================================

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type message_type DEFAULT 'text',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

CREATE POLICY "Users can view their own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_messages_from_user ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user ON messages(to_user_id);

-- ============================================
-- GIFTS AND VERIFICATION TABLES
-- ============================================

-- Virtual Gifts Table
CREATE TABLE IF NOT EXISTS virtual_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL,
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE virtual_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active gifts" ON virtual_gifts;

CREATE POLICY "Anyone can view active gifts"
  ON virtual_gifts FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Gift Transactions Table
CREATE TABLE IF NOT EXISTS gift_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_id uuid NOT NULL REFERENCES virtual_gifts(id) ON DELETE CASCADE,
  status gift_status DEFAULT 'sent',
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gift_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view gifts they sent or received" ON gift_transactions;
DROP POLICY IF EXISTS "Users can send gifts" ON gift_transactions;

CREATE POLICY "Users can view gifts they sent or received"
  ON gift_transactions FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can send gifts"
  ON gift_transactions FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- Verification Requests Table
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_url text NOT NULL,
  selfie_url text NOT NULL,
  status verification_status DEFAULT 'pending',
  admin_notes text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own verification requests" ON verification_requests;
DROP POLICY IF EXISTS "Users can submit verification requests" ON verification_requests;

CREATE POLICY "Users can view their own verification requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can submit verification requests"
  ON verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- COMMUNITY AND SERVICES TABLES
-- ============================================

-- Blog Articles Table
CREATE TABLE IF NOT EXISTS blog_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cover_image text,
  published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published articles" ON blog_articles;

CREATE POLICY "Anyone can view published articles"
  ON blog_articles FOR SELECT
  TO authenticated
  USING (published = true);

CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);

-- Blog Comments Table
CREATE TABLE IF NOT EXISTS blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON blog_comments;
DROP POLICY IF EXISTS "Authenticated users can post comments" ON blog_comments;

CREATE POLICY "Anyone can view comments"
  ON blog_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can post comments"
  ON blog_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Forum Posts Table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON forum_posts;

CREATE POLICY "Anyone can view forum posts"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Forum Replies Table
CREATE TABLE IF NOT EXISTS forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view replies" ON forum_replies;
DROP POLICY IF EXISTS "Authenticated users can post replies" ON forum_replies;

CREATE POLICY "Anyone can view replies"
  ON forum_replies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can post replies"
  ON forum_replies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Counselling Bookings Table
CREATE TABLE IF NOT EXISTS counselling_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  status booking_status DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE counselling_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bookings" ON counselling_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON counselling_bookings;

CREATE POLICY "Users can view their own bookings"
  ON counselling_bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create bookings"
  ON counselling_bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- STAFF AND NEWSLETTER TABLES
-- ============================================

-- Staff Members Table
CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'counsellor')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view all staff members" ON staff_members;

CREATE POLICY "Staff can view all staff members"
  ON staff_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.email = auth.jwt()->>'email'
      AND staff_members.is_active = true
    )
  );

-- Newsletter Subscribers Table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  subscribed_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON newsletter_subscribers;

CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default credit packages (only if not exists)
INSERT INTO credit_packages (name, credits, price_usd, popular, description)
SELECT 'Starter Pack', 100, 9.99, false, 'Perfect for getting started'
WHERE NOT EXISTS (SELECT 1 FROM credit_packages WHERE name = 'Starter Pack');

INSERT INTO credit_packages (name, credits, price_usd, popular, description)
SELECT 'Popular Pack', 500, 39.99, true, 'Most popular choice'
WHERE NOT EXISTS (SELECT 1 FROM credit_packages WHERE name = 'Popular Pack');

INSERT INTO credit_packages (name, credits, price_usd, popular, description)
SELECT 'Premium Pack', 1200, 79.99, false, 'Best value for money'
WHERE NOT EXISTS (SELECT 1 FROM credit_packages WHERE name = 'Premium Pack');

-- Insert default virtual gifts (only if not exists)
INSERT INTO virtual_gifts (name, description, icon, credit_cost)
SELECT 'Rose', 'Send a beautiful rose', '🌹', 10
WHERE NOT EXISTS (SELECT 1 FROM virtual_gifts WHERE name = 'Rose');

INSERT INTO virtual_gifts (name, description, icon, credit_cost)
SELECT 'Heart', 'Show your love', '❤️', 15
WHERE NOT EXISTS (SELECT 1 FROM virtual_gifts WHERE name = 'Heart');

INSERT INTO virtual_gifts (name, description, icon, credit_cost)
SELECT 'Diamond', 'A precious gift', '💎', 50
WHERE NOT EXISTS (SELECT 1 FROM virtual_gifts WHERE name = 'Diamond');

-- ============================================
-- CREATE PROFILE TRIGGER
-- ============================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_on_signup();

-- Create function to automatically create profile
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, full_name, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_credits (user_id, balance)
  VALUES (NEW.id, 50)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER create_user_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- DONE!
-- ============================================

SELECT 'Migration completed successfully!' as status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables_created,
       (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as policies_created;
