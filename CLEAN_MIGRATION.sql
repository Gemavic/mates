-- CLEAN DATABASE SETUP
-- Drop everything and recreate from scratch

DROP TABLE IF EXISTS counselling_sessions CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS booking_services CASCADE;
DROP TABLE IF EXISTS forum_comments CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS blog_articles CASCADE;
DROP TABLE IF EXISTS user_verification CASCADE;
DROP TABLE IF EXISTS sent_gifts CASCADE;
DROP TABLE IF EXISTS virtual_gifts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS swipes CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS user_credits CASCADE;
DROP TABLE IF EXISTS credit_packages CASCADE;
DROP TABLE IF EXISTS user_photos CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS staff_accounts CASCADE;
DROP TABLE IF EXISTS newsletter_subscriptions CASCADE;

DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_on_signup();

DROP TYPE IF EXISTS message_type CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS gift_status CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;

CREATE TYPE message_type AS ENUM ('text', 'image', 'gift', 'audio', 'video');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE gift_status AS ENUM ('sent', 'received', 'opened');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  first_name text,
  age integer CHECK (age >= 18 AND age <= 120),
  location text,
  bio text,
  interests jsonb DEFAULT '[]'::jsonb,
  profile_visibility text DEFAULT 'public',
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  complimentary_credits integer DEFAULT 0 CHECK (complimentary_credits >= 0),
  purchased_credits integer DEFAULT 0 CHECK (purchased_credits >= 0),
  total_kobos integer DEFAULT 0 CHECK (total_kobos >= 0),
  daily_bonus_last_claimed timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "own_profile_update" ON user_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "own_credits_view" ON user_credits FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT DO NOTHING;

  INSERT INTO user_credits (user_id, complimentary_credits)
  VALUES (NEW.id, 50)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_user_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

SELECT 'Setup complete!' as status;
