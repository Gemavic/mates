-- DATES APP - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- Safe to run multiple times

-- Drop and recreate enum types
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

CREATE TYPE stripe_subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid', 'trialing');
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'vip');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE gift_status AS ENUM ('sent', 'received', 'opened');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE message_type AS ENUM ('text', 'image', 'gift', 'audio', 'video');

-- USER PROFILES
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

DROP POLICY IF EXISTS "Users can view public profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

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

CREATE INDEX IF NOT EXISTS idx_user_profiles_visibility ON user_profiles(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age);
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location);

-- USER PHOTOS
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
CREATE INDEX IF NOT EXISTS idx_user_photos_primary ON user_photos(user_id, is_primary);

-- CREDIT PACKAGES
CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  price_usd numeric(10,2) NOT NULL CHECK (price_usd >= 0),
  discount_percentage integer DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  is_popular boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view credit packages" ON credit_packages;

CREATE POLICY "Anyone can view credit packages"
  ON credit_packages FOR SELECT
  TO authenticated
  USING (true);

-- USER CREDITS
CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer DEFAULT 0 CHECK (balance >= 0),
  lifetime_credits integer DEFAULT 0 CHECK (lifetime_credits >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;

CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_credits_balance ON user_credits(user_id, balance);

-- CREDIT TRANSACTIONS
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'spend', 'refund', 'bonus')),
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;

CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- USER PREFERENCES
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  min_age integer CHECK (min_age >= 18),
  max_age integer CHECK (max_age <= 120),
  preferred_location text,
  preferred_interests jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SWIPES
CREATE TABLE IF NOT EXISTS swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swiped_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  liked boolean NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(swiper_id, swiped_id)
);

ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own swipes" ON swipes;
DROP POLICY IF EXISTS "Users can create swipes" ON swipes;

CREATE POLICY "Users can view own swipes"
  ON swipes FOR SELECT
  TO authenticated
  USING (swiper_id = auth.uid());

CREATE POLICY "Users can create swipes"
  ON swipes FOR INSERT
  TO authenticated
  WITH CHECK (swiper_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped_id ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_swipes_liked ON swipes(swiper_id, liked);

-- MATCHES
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id)
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own matches" ON matches;

CREATE POLICY "Users can view own matches"
  ON matches FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at DESC);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type message_type DEFAULT 'text',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their messages" ON messages;

CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, created_at DESC);

-- VIRTUAL GIFTS
CREATE TABLE IF NOT EXISTS virtual_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  category text DEFAULT 'general',
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE virtual_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available gifts" ON virtual_gifts;

CREATE POLICY "Anyone can view available gifts"
  ON virtual_gifts FOR SELECT
  TO authenticated
  USING (is_available = true);

-- SENT GIFTS
CREATE TABLE IF NOT EXISTS sent_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gift_id uuid NOT NULL REFERENCES virtual_gifts(id) ON DELETE CASCADE,
  message text,
  status gift_status DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sent_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view gifts they sent or received" ON sent_gifts;
DROP POLICY IF EXISTS "Users can send gifts" ON sent_gifts;
DROP POLICY IF EXISTS "Users can update received gifts" ON sent_gifts;

CREATE POLICY "Users can view gifts they sent or received"
  ON sent_gifts FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send gifts"
  ON sent_gifts FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update received gifts"
  ON sent_gifts FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_sent_gifts_sender_id ON sent_gifts(sender_id);
CREATE INDEX IF NOT EXISTS idx_sent_gifts_receiver_id ON sent_gifts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_sent_gifts_created_at ON sent_gifts(created_at DESC);

-- USER VERIFICATION
CREATE TABLE IF NOT EXISTS user_verification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('photo_id', 'selfie', 'video', 'phone', 'email', 'social_media')),
  document_url text,
  status verification_status DEFAULT 'pending',
  phone_number text,
  otp_code text,
  otp_expiry timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification" ON user_verification;
DROP POLICY IF EXISTS "Users can create verification requests" ON user_verification;
DROP POLICY IF EXISTS "Users can update own verification" ON user_verification;

CREATE POLICY "Users can view own verification"
  ON user_verification FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create verification requests"
  ON user_verification FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own verification"
  ON user_verification FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_verification_user_id ON user_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verification_status ON user_verification(status);

-- BLOG ARTICLES
CREATE TABLE IF NOT EXISTS blog_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text NOT NULL,
  excerpt text,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  category text DEFAULT 'general',
  tags text[] DEFAULT '{}',
  featured_image text,
  is_published boolean DEFAULT false,
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE blog_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published articles" ON blog_articles;

CREATE POLICY "Anyone can view published articles"
  ON blog_articles FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE INDEX IF NOT EXISTS idx_blog_articles_slug ON blog_articles(slug);
CREATE INDEX IF NOT EXISTS idx_blog_articles_published ON blog_articles(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_articles_category ON blog_articles(category);

-- FORUM POSTS
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'general',
  tags text[] DEFAULT '{}',
  likes_count integer DEFAULT 0 CHECK (likes_count >= 0),
  comments_count integer DEFAULT 0 CHECK (comments_count >= 0),
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can create forum posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can update own posts" ON forum_posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON forum_posts;

CREATE POLICY "Anyone can view forum posts"
  ON forum_posts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create forum posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own posts"
  ON forum_posts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON forum_posts(category);

-- FORUM COMMENTS
CREATE TABLE IF NOT EXISTS forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  likes_count integer DEFAULT 0 CHECK (likes_count >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE forum_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view comments" ON forum_comments;
DROP POLICY IF EXISTS "Users can create comments" ON forum_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON forum_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON forum_comments;

CREATE POLICY "Anyone can view comments"
  ON forum_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON forum_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments"
  ON forum_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON forum_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id ON forum_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_user_id ON forum_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_forum_comments_created_at ON forum_comments(created_at DESC);

-- BOOKING SERVICES
CREATE TABLE IF NOT EXISTS booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  credit_cost integer NOT NULL CHECK (credit_cost >= 0),
  category text DEFAULT 'general',
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view available services" ON booking_services;

CREATE POLICY "Anyone can view available services"
  ON booking_services FOR SELECT
  TO authenticated
  USING (is_available = true);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status booking_status DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;

CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- COUNSELLING SESSIONS
CREATE TABLE IF NOT EXISTS counselling_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  counsellor_notes text,
  session_summary text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE counselling_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own session summaries" ON counselling_sessions;

CREATE POLICY "Users can view own session summaries"
  ON counselling_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = counselling_sessions.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- STAFF ACCOUNTS
CREATE TABLE IF NOT EXISTS staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'support')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;

-- NEWSLETTER SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  is_subscribed boolean DEFAULT true,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz
);

ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can subscribe" ON newsletter_subscriptions;

CREATE POLICY "Anyone can subscribe"
  ON newsletter_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- INSERT DEFAULT CREDIT PACKAGES
INSERT INTO credit_packages (name, credits, price_usd, discount_percentage, is_popular, description)
VALUES
  ('Starter Pack', 20, 2.99, 0, false, 'Perfect for trying out the platform'),
  ('Popular Pack', 50, 9.99, 10, true, 'Most popular choice for regular users'),
  ('Power Pack', 100, 19.99, 15, false, 'Great value for active daters'),
  ('Premium Pack', 200, 34.99, 20, false, 'Best value for serious users'),
  ('Ultimate Pack', 500, 69.99, 25, false, 'Maximum value for power users')
ON CONFLICT DO NOTHING;

-- INSERT DEFAULT VIRTUAL GIFTS
INSERT INTO virtual_gifts (name, description, image_url, credit_cost, category)
VALUES
  ('Red Rose', 'Classic symbol of romance', '/images/gifts/rose.png', 5, 'romantic'),
  ('Bouquet', 'Beautiful flower arrangement', '/images/gifts/bouquet.png', 15, 'romantic'),
  ('Chocolate Box', 'Sweet treat for your match', '/images/gifts/chocolate.png', 10, 'sweet'),
  ('Champagne', 'Celebrate your connection', '/images/gifts/champagne.png', 25, 'celebration'),
  ('Heart Balloon', 'Show your feelings', '/images/gifts/balloon.png', 8, 'cute'),
  ('Teddy Bear', 'Adorable cuddly companion', '/images/gifts/teddy.png', 12, 'cute'),
  ('Diamond Ring', 'The ultimate gesture', '/images/gifts/ring.png', 100, 'luxury'),
  ('Coffee Cup', 'Virtual coffee date', '/images/gifts/coffee.png', 5, 'casual'),
  ('Movie Tickets', 'Share a movie together', '/images/gifts/tickets.png', 20, 'experience'),
  ('Dinner Date', 'Romantic dinner invitation', '/images/gifts/dinner.png', 30, 'experience'),
  ('Love Letter', 'Heartfelt message', '/images/gifts/letter.png', 10, 'romantic'),
  ('Fireworks', 'Spark excitement', '/images/gifts/fireworks.png', 15, 'celebration')
ON CONFLICT DO NOTHING;

-- CREATE PROFILE TRIGGER FUNCTION
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

DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;

CREATE TRIGGER create_user_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- VERIFICATION QUERY
SELECT
  'Migration completed!' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables_created,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as policies_created;
