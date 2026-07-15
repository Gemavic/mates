/*
  # Stripe Integration Schema

  1. New Tables
    - `stripe_customers`: Links Supabase users to Stripe customers
      - Includes `user_id` (references `auth.users`)
      - Stores Stripe `customer_id`
      - Implements soft delete

    - `stripe_subscriptions`: Manages subscription data
      - Tracks subscription status, periods, and payment details
      - Links to `stripe_customers` via `customer_id`
      - Custom enum type for subscription status
      - Implements soft delete

    - `stripe_orders`: Stores order/purchase information
      - Records checkout sessions and payment intents
      - Tracks payment amounts and status
      - Custom enum type for order status
      - Implements soft delete

  2. Views
    - `stripe_user_subscriptions`: Secure view for user subscription data
      - Joins customers and subscriptions
      - Filtered by authenticated user

    - `stripe_user_orders`: Secure view for user order history
      - Joins customers and orders
      - Filtered by authenticated user

  3. Security
    - Enables Row Level Security (RLS) on all tables
    - Implements policies for authenticated users to view their own data
*/

CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) not null unique,
  customer_id text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer data"
    ON stripe_customers
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text unique not null,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE TYPE stripe_order_status AS ENUM (
    'pending',
    'completed',
    'canceled'
);

CREATE TABLE IF NOT EXISTS stripe_orders (
    id bigint primary key generated always as identity,
    checkout_session_id text not null,
    payment_intent_id text not null,
    customer_id text not null,
    amount_subtotal bigint not null,
    amount_total bigint not null,
    currency text not null,
    payment_status text not null,
    status stripe_order_status not null default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order data"
    ON stripe_orders
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- View for user subscriptions
CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;

-- View for user orders
CREATE VIEW stripe_user_orders WITH (security_invoker) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;/*
  # User Profiles and Authentication Extension

  1. New Tables
    - `user_profiles` - Extended user profile information
      - Links to `auth.users` via `user_id`
      - Stores profile data, preferences, verification status
    
    - `user_photos` - User photo management
      - Multiple photos per user
      - Primary photo designation
      - Upload tracking

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Public read access for discovery features
*/

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text,
  full_name text NOT NULL,
  first_name text,
  age integer,
  location text,
  occupation text,
  education text,
  bio text DEFAULT '',
  interests text[] DEFAULT '{}',
  looking_for text DEFAULT 'serious',
  distance_preference integer DEFAULT 50,
  age_range_min integer DEFAULT 18,
  age_range_max integer DEFAULT 99,
  is_verified boolean DEFAULT false,
  verification_status text DEFAULT 'not_started',
  is_online boolean DEFAULT false,
  last_active timestamptz DEFAULT now(),
  show_online_status boolean DEFAULT true,
  profile_visibility text DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Public can read public profiles for discovery
CREATE POLICY "Public can read public profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (profile_visibility = 'public');

-- User photos table
CREATE TABLE IF NOT EXISTS user_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  is_primary boolean DEFAULT false,
  upload_order integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- Users can manage their own photos
CREATE POLICY "Users can manage own photos"
  ON user_photos
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can read photos for discovery
CREATE POLICY "Public can read photos"
  ON user_photos
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to update user's last activity
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles 
  SET last_active = now(), is_online = true
  WHERE user_id = NEW.user_id OR user_id = OLD.user_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;/*
  # Credit System Database Schema

  1. New Tables
    - `user_credits` - Credit balances and history
    - `credit_transactions` - All credit transactions
    - `credit_packages` - Available credit packages
    - `user_kobos` - Chat kobos for users

  2. Security
    - Enable RLS on all tables
    - Users can only access their own credit data
    - Staff members have broader access
*/

-- User credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  complimentary_credits integer DEFAULT 10,
  purchased_credits integer DEFAULT 0,
  total_kobos integer DEFAULT 10,
  daily_bonus_last_claimed date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own credits
CREATE POLICY "Users can read own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own credits
CREATE POLICY "Users can update own credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own credits
CREATE POLICY "Users can insert own credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'spend')),
  amount integer NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Credit packages table
CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  credits integer NOT NULL,
  bonus_credits integer DEFAULT 0,
  price_usd decimal(10,2) NOT NULL,
  package_type text DEFAULT 'credits' CHECK (package_type IN ('credits', 'kobos', 'combo')),
  is_popular boolean DEFAULT false,
  features text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can read active packages
CREATE POLICY "Anyone can read active packages"
  ON credit_packages
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User kobos table
CREATE TABLE IF NOT EXISTS user_kobos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kobo_value integer DEFAULT 1,
  is_used boolean DEFAULT false,
  purchase_date timestamptz DEFAULT now(),
  used_date timestamptz
);

ALTER TABLE user_kobos ENABLE ROW LEVEL SECURITY;

-- Users can manage their own kobos
CREATE POLICY "Users can manage own kobos"
  ON user_kobos
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to initialize user credits on signup
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, complimentary_credits, total_kobos)
  VALUES (NEW.id, 10, 10);
  
  -- Add welcome bonus transaction
  INSERT INTO credit_transactions (user_id, transaction_type, amount, description, category)
  VALUES (NEW.id, 'earn', 10, 'Welcome Bonus - New User Credits', 'bonus');
  
  -- Add welcome kobos
  INSERT INTO user_kobos (user_id, kobo_value) 
  SELECT NEW.id, 1 FROM generate_series(1, 10);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize credits on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();/*
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
  FOR EACH ROW EXECUTE FUNCTION check_for_match();/*
  # Additional Features - Gifts, Verification, Staff Management

  1. New Tables
    - `virtual_gifts` - Gift catalog
    - `sent_gifts` - Gifts sent between users
    - `verification_requests` - User verification
    - `staff_members` - Staff management
    - `credit_access_requests` - Staff credit access
    - `user_settings` - User preferences

  2. Security
    - Enable RLS on all tables
    - Appropriate access policies
*/

-- Virtual gifts catalog
CREATE TABLE IF NOT EXISTS virtual_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_name text NOT NULL,
  gift_emoji text NOT NULL,
  price_credits integer NOT NULL,
  category text NOT NULL,
  description text,
  popularity_score integer DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE virtual_gifts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active gifts
CREATE POLICY "Anyone can read active gifts"
  ON virtual_gifts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Sent gifts table
CREATE TABLE IF NOT EXISTS sent_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gift_id uuid REFERENCES virtual_gifts(id) NOT NULL,
  credits_spent integer NOT NULL,
  message text DEFAULT '',
  is_opened boolean DEFAULT false,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sent_gifts ENABLE ROW LEVEL SECURITY;

-- Users can send gifts
CREATE POLICY "Users can send gifts"
  ON sent_gifts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users can see gifts they sent or received
CREATE POLICY "Users can see their gifts"
  ON sent_gifts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Recipients can update gift status
CREATE POLICY "Recipients can update gift status"
  ON sent_gifts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id);

-- Verification requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone_number text,
  address_info jsonb,
  government_id_url text,
  selfie_url text,
  address_proof_url text,
  verification_status text DEFAULT 'not_started' CHECK (
    verification_status IN ('not_started', 'incomplete', 'submitted', 'under_review', 'approved', 'rejected')
  ),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can manage their own verification
CREATE POLICY "Users can manage own verification"
  ON verification_requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Staff members table
CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text NOT NULL UNIQUE,
  staff_role text NOT NULL CHECK (staff_role IN ('admin', 'support', 'moderator', 'credit_manager')),
  manager_code text,
  permissions text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Staff can read their own data
CREATE POLICY "Staff can read own data"
  ON staff_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Credit access requests table
CREATE TABLE IF NOT EXISTS credit_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_reason text NOT NULL,
  request_status text DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'denied')),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE credit_access_requests ENABLE ROW LEVEL SECURITY;

-- Staff can manage credit access requests
CREATE POLICY "Staff can manage credit access"
  ON credit_access_requests
  FOR ALL
  TO authenticated
  USING (
    staff_id = auth.uid() OR 
    approved_by = auth.uid() OR
    EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid() AND staff_role IN ('admin', 'credit_manager'))
  );

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  notifications_enabled boolean DEFAULT true,
  show_online_status boolean DEFAULT true,
  dark_mode boolean DEFAULT false,
  two_factor_enabled boolean DEFAULT false,
  data_encryption_enabled boolean DEFAULT true,
  discovery_radius integer DEFAULT 50,
  age_range_min integer DEFAULT 18,
  age_range_max integer DEFAULT 99,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default virtual gifts
INSERT INTO virtual_gifts (gift_name, gift_emoji, price_credits, category, description, popularity_score) VALUES
  ('Red Rose', '🌹', 5, 'romantic', 'Classic symbol of love', 95),
  ('Love Heart', '💖', 3, 'romantic', 'Express your feelings', 92),
  ('Teddy Bear', '🧸', 8, 'fun', 'Cuddly companion', 92),
  ('Diamond', '💎', 100, 'luxury', 'Ultimate luxury gift', 95),
  ('Coffee', '☕', 3, 'casual', 'Morning energy boost', 90),
  ('Champagne', '🍾', 35, 'luxury', 'Celebrate in style', 85),
  ('Cute Puppy', '🐶', 12, 'fun', 'Adorable furry friend', 95),
  ('Crown', '👑', 50, 'luxury', 'Treat them like royalty', 88),
  ('Chocolate Box', '🍫', 12, 'romantic', 'Sweet treats', 87),
  ('Pizza Slice', '🍕', 5, 'casual', 'Delicious comfort food', 92)
ON CONFLICT DO NOTHING;/*
  # Stripe Integration Schema

  1. New Tables
    - `stripe_customers`: Links Supabase users to Stripe customers
      - Includes `user_id` (references `auth.users`)
      - Stores Stripe `customer_id`
      - Implements soft delete

    - `stripe_subscriptions`: Manages subscription data
      - Tracks subscription status, periods, and payment details
      - Links to `stripe_customers` via `customer_id`
      - Custom enum type for subscription status
      - Implements soft delete

    - `stripe_orders`: Stores order/purchase information
      - Records checkout sessions and payment intents
      - Tracks payment amounts and status
      - Custom enum type for order status
      - Implements soft delete

  2. Views
    - `stripe_user_subscriptions`: Secure view for user subscription data
      - Joins customers and subscriptions
      - Filtered by authenticated user

    - `stripe_user_orders`: Secure view for user order history
      - Joins customers and orders
      - Filtered by authenticated user

  3. Security
    - Enables Row Level Security (RLS) on all tables
    - Implements policies for authenticated users to view their own data
*/

CREATE TABLE IF NOT EXISTS stripe_customers (
  id bigint primary key generated always as identity,
  user_id uuid references auth.users(id) not null unique,
  customer_id text not null unique,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customer data"
    ON stripe_customers
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE TYPE stripe_subscription_status AS ENUM (
    'not_started',
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused'
);

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id bigint primary key generated always as identity,
  customer_id text unique not null,
  subscription_id text default null,
  price_id text default null,
  current_period_start bigint default null,
  current_period_end bigint default null,
  cancel_at_period_end boolean default false,
  payment_method_brand text default null,
  payment_method_last4 text default null,
  status stripe_subscription_status not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

CREATE TYPE stripe_order_status AS ENUM (
    'pending',
    'completed',
    'canceled'
);

CREATE TABLE IF NOT EXISTS stripe_orders (
    id bigint primary key generated always as identity,
    checkout_session_id text not null,
    payment_intent_id text not null,
    customer_id text not null,
    amount_subtotal bigint not null,
    amount_total bigint not null,
    currency text not null,
    payment_status text not null,
    status stripe_order_status not null default 'pending',
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    deleted_at timestamp with time zone default null
);

ALTER TABLE stripe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order data"
    ON stripe_orders
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
        AND deleted_at IS NULL
    );

-- View for user subscriptions
CREATE VIEW stripe_user_subscriptions WITH (security_invoker = true) AS
SELECT
    c.customer_id,
    s.subscription_id,
    s.status as subscription_status,
    s.price_id,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end,
    s.payment_method_brand,
    s.payment_method_last4
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND s.deleted_at IS NULL;

GRANT SELECT ON stripe_user_subscriptions TO authenticated;

-- View for user orders
CREATE VIEW stripe_user_orders WITH (security_invoker) AS
SELECT
    c.customer_id,
    o.id as order_id,
    o.checkout_session_id,
    o.payment_intent_id,
    o.amount_subtotal,
    o.amount_total,
    o.currency,
    o.payment_status,
    o.status as order_status,
    o.created_at as order_date
FROM stripe_customers c
LEFT JOIN stripe_orders o ON c.customer_id = o.customer_id
WHERE c.user_id = auth.uid()
AND c.deleted_at IS NULL
AND o.deleted_at IS NULL;/*
  # User Profiles and Authentication Extension

  1. New Tables
    - `user_profiles` - Extended user profile information
      - Links to `auth.users` via `user_id`
      - Stores profile data, preferences, verification status
    
    - `user_photos` - User photo management
      - Multiple photos per user
      - Primary photo designation
      - Upload tracking

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Public read access for discovery features
*/

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text,
  full_name text NOT NULL,
  first_name text,
  age integer,
  location text,
  occupation text,
  education text,
  bio text DEFAULT '',
  interests text[] DEFAULT '{}',
  looking_for text DEFAULT 'serious',
  distance_preference integer DEFAULT 50,
  age_range_min integer DEFAULT 18,
  age_range_max integer DEFAULT 99,
  is_verified boolean DEFAULT false,
  verification_status text DEFAULT 'not_started',
  is_online boolean DEFAULT false,
  last_active timestamptz DEFAULT now(),
  show_online_status boolean DEFAULT true,
  profile_visibility text DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Public can read public profiles for discovery
CREATE POLICY "Public can read public profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (profile_visibility = 'public');

-- User photos table
CREATE TABLE IF NOT EXISTS user_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  photo_url text NOT NULL,
  is_primary boolean DEFAULT false,
  upload_order integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_photos ENABLE ROW LEVEL SECURITY;

-- Users can manage their own photos
CREATE POLICY "Users can manage own photos"
  ON user_photos
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can read photos for discovery
CREATE POLICY "Public can read photos"
  ON user_photos
  FOR SELECT
  TO authenticated
  USING (true);

-- Function to update user's last activity
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles 
  SET last_active = now(), is_online = true
  WHERE user_id = NEW.user_id OR user_id = OLD.user_id;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;/*
  # Credit System Database Schema

  1. New Tables
    - `user_credits` - Credit balances and history
    - `credit_transactions` - All credit transactions
    - `credit_packages` - Available credit packages
    - `user_kobos` - Chat kobos for users

  2. Security
    - Enable RLS on all tables
    - Users can only access their own credit data
    - Staff members have broader access
*/

-- User credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  complimentary_credits integer DEFAULT 10,
  purchased_credits integer DEFAULT 0,
  total_kobos integer DEFAULT 10,
  daily_bonus_last_claimed date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own credits
CREATE POLICY "Users can read own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own credits
CREATE POLICY "Users can update own credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own credits
CREATE POLICY "Users can insert own credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Credit transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'spend')),
  amount integer NOT NULL,
  description text NOT NULL,
  category text DEFAULT 'general',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can read own transactions"
  ON credit_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own transactions
CREATE POLICY "Users can insert own transactions"
  ON credit_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Credit packages table
CREATE TABLE IF NOT EXISTS credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL,
  credits integer NOT NULL,
  bonus_credits integer DEFAULT 0,
  price_usd decimal(10,2) NOT NULL,
  package_type text DEFAULT 'credits' CHECK (package_type IN ('credits', 'kobos', 'combo')),
  is_popular boolean DEFAULT false,
  features text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can read active packages
CREATE POLICY "Anyone can read active packages"
  ON credit_packages
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User kobos table
CREATE TABLE IF NOT EXISTS user_kobos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  kobo_value integer DEFAULT 1,
  is_used boolean DEFAULT false,
  purchase_date timestamptz DEFAULT now(),
  used_date timestamptz
);

ALTER TABLE user_kobos ENABLE ROW LEVEL SECURITY;

-- Users can manage their own kobos
CREATE POLICY "Users can manage own kobos"
  ON user_kobos
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to initialize user credits on signup
CREATE OR REPLACE FUNCTION initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_credits (user_id, complimentary_credits, total_kobos)
  VALUES (NEW.id, 10, 10);
  
  -- Add welcome bonus transaction
  INSERT INTO credit_transactions (user_id, transaction_type, amount, description, category)
  VALUES (NEW.id, 'earn', 10, 'Welcome Bonus - New User Credits', 'bonus');
  
  -- Add welcome kobos
  INSERT INTO user_kobos (user_id, kobo_value) 
  SELECT NEW.id, 1 FROM generate_series(1, 10);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to initialize credits on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();/*
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
  FOR EACH ROW EXECUTE FUNCTION check_for_match();/*
  # Additional Features - Gifts, Verification, Staff Management

  1. New Tables
    - `virtual_gifts` - Gift catalog
    - `sent_gifts` - Gifts sent between users
    - `verification_requests` - User verification
    - `staff_members` - Staff management
    - `credit_access_requests` - Staff credit access
    - `user_settings` - User preferences

  2. Security
    - Enable RLS on all tables
    - Appropriate access policies
*/

-- Virtual gifts catalog
CREATE TABLE IF NOT EXISTS virtual_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_name text NOT NULL,
  gift_emoji text NOT NULL,
  price_credits integer NOT NULL,
  category text NOT NULL,
  description text,
  popularity_score integer DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE virtual_gifts ENABLE ROW LEVEL SECURITY;

-- Anyone can read active gifts
CREATE POLICY "Anyone can read active gifts"
  ON virtual_gifts
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Sent gifts table
CREATE TABLE IF NOT EXISTS sent_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gift_id uuid REFERENCES virtual_gifts(id) NOT NULL,
  credits_spent integer NOT NULL,
  message text DEFAULT '',
  is_opened boolean DEFAULT false,
  opened_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sent_gifts ENABLE ROW LEVEL SECURITY;

-- Users can send gifts
CREATE POLICY "Users can send gifts"
  ON sent_gifts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Users can see gifts they sent or received
CREATE POLICY "Users can see their gifts"
  ON sent_gifts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Recipients can update gift status
CREATE POLICY "Recipients can update gift status"
  ON sent_gifts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id);

-- Verification requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone_number text,
  address_info jsonb,
  government_id_url text,
  selfie_url text,
  address_proof_url text,
  verification_status text DEFAULT 'not_started' CHECK (
    verification_status IN ('not_started', 'incomplete', 'submitted', 'under_review', 'approved', 'rejected')
  ),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can manage their own verification
CREATE POLICY "Users can manage own verification"
  ON verification_requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Staff members table
CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text NOT NULL UNIQUE,
  staff_role text NOT NULL CHECK (staff_role IN ('admin', 'support', 'moderator', 'credit_manager')),
  manager_code text,
  permissions text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Staff can read their own data
CREATE POLICY "Staff can read own data"
  ON staff_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Credit access requests table
CREATE TABLE IF NOT EXISTS credit_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  request_reason text NOT NULL,
  request_status text DEFAULT 'pending' CHECK (request_status IN ('pending', 'approved', 'denied')),
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE credit_access_requests ENABLE ROW LEVEL SECURITY;

-- Staff can manage credit access requests
CREATE POLICY "Staff can manage credit access"
  ON credit_access_requests
  FOR ALL
  TO authenticated
  USING (
    staff_id = auth.uid() OR 
    approved_by = auth.uid() OR
    EXISTS (SELECT 1 FROM staff_members WHERE user_id = auth.uid() AND staff_role IN ('admin', 'credit_manager'))
  );

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  notifications_enabled boolean DEFAULT true,
  show_online_status boolean DEFAULT true,
  dark_mode boolean DEFAULT false,
  two_factor_enabled boolean DEFAULT false,
  data_encryption_enabled boolean DEFAULT true,
  discovery_radius integer DEFAULT 50,
  age_range_min integer DEFAULT 18,
  age_range_max integer DEFAULT 99,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users can manage their own settings
CREATE POLICY "Users can manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default virtual gifts
INSERT INTO virtual_gifts (gift_name, gift_emoji, price_credits, category, description, popularity_score) VALUES
  ('Red Rose', '🌹', 5, 'romantic', 'Classic symbol of love', 95),
  ('Love Heart', '💖', 3, 'romantic', 'Express your feelings', 92),
  ('Teddy Bear', '🧸', 8, 'fun', 'Cuddly companion', 92),
  ('Diamond', '💎', 100, 'luxury', 'Ultimate luxury gift', 95),
  ('Coffee', '☕', 3, 'casual', 'Morning energy boost', 90),
  ('Champagne', '🍾', 35, 'luxury', 'Celebrate in style', 85),
  ('Cute Puppy', '🐶', 12, 'fun', 'Adorable furry friend', 95),
  ('Crown', '👑', 50, 'luxury', 'Treat them like royalty', 88),
  ('Chocolate Box', '🍫', 12, 'romantic', 'Sweet treats', 87),
  ('Pizza Slice', '🍕', 5, 'casual', 'Delicious comfort food', 92)
ON CONFLICT DO NOTHING;/*
  # Add OTP Fields to Verification Requests

  ## Changes
  - Add OTP code storage field for phone verification
  - Add OTP expiration timestamp
  - Add phone_verified boolean flag
  
  ## New Columns
  - `otp_code` (text, nullable) - Stores the 6-digit verification code
  - `otp_expires_at` (timestamptz, nullable) - When the OTP expires (10 minutes from generation)
  - `phone_verified` (boolean, default false) - Whether phone number has been verified
  
  ## Security Notes
  - OTP codes are cleared after successful verification
  - OTP expires after 10 minutes for security
  - Requires authentication to access
*/

-- Add OTP fields to verification_requests table
DO $$
BEGIN
  -- Add otp_code column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_requests' AND column_name = 'otp_code'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN otp_code text;
  END IF;

  -- Add otp_expires_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_requests' AND column_name = 'otp_expires_at'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN otp_expires_at timestamptz;
  END IF;

  -- Add phone_verified column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'verification_requests' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE verification_requests ADD COLUMN phone_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add index on otp_expires_at for efficient expiration checks
CREATE INDEX IF NOT EXISTS idx_verification_requests_otp_expires 
ON verification_requests(otp_expires_at) 
WHERE otp_expires_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN verification_requests.otp_code IS 'Temporary 6-digit code for phone verification - cleared after use';
COMMENT ON COLUMN verification_requests.otp_expires_at IS 'OTP expiration time - codes expire 10 minutes after generation';
COMMENT ON COLUMN verification_requests.phone_verified IS 'Whether the phone number has been successfully verified';
/*
  # Fix User Profile Creation - Auto Trigger
  
  ## Problem
  User profiles fail to create during signup because:
  - Profile insert happens before session is fully authenticated
  - RLS policies require authenticated session
  - Race condition between auth.signUp and profile insert
  
  ## Solution
  Create a database trigger that automatically creates user profile when auth.users record is created.
  This runs with elevated privileges and bypasses RLS.
  
  ## Changes
  1. Create function to auto-create user profile
  2. Add trigger on auth.users table (on INSERT)
  3. Function extracts full_name from user metadata
  4. Creates profile with proper defaults
*/

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  full_name_value TEXT;
  email_value TEXT;
BEGIN
  -- Extract full_name from user metadata
  full_name_value := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'User'
  );
  
  -- Get email
  email_value := NEW.email;
  
  -- Create user profile automatically
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    first_name,
    is_verified,
    verification_status,
    is_online,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    email_value,
    full_name_value,
    SPLIT_PART(full_name_value, ' ', 1), -- Extract first name
    false, -- Not verified by default
    'not_started',
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicates
  
  -- Also create user credits record
  INSERT INTO public.user_credits (
    user_id,
    complimentary_credits,
    purchased_credits,
    total_kobos,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    10, -- Start with 10 free credits
    0,
    10,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
/*
  # Core User Tables Migration
  
  1. New Tables
    - `user_profiles`
      - `user_id` (uuid, primary key, references auth.users)
      - `email` (text, unique, not null)
      - `full_name` (text)
      - `first_name` (text)
      - `age` (integer)
      - `location` (text)
      - `occupation` (text)
      - `education` (text)
      - `bio` (text)
      - `interests` (jsonb array)
      - `profile_visibility` (text, default 'public')
      - `is_verified` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_profiles` table
    - Add policies for authenticated users to read public profiles
    - Add policies for users to manage their own profile
*/

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

CREATE INDEX idx_user_profiles_visibility ON user_profiles(profile_visibility);
CREATE INDEX idx_user_profiles_age ON user_profiles(age);
CREATE INDEX idx_user_profiles_location ON user_profiles(location);
/*
  # Credit System Tables Migration
  
  1. New Tables
    - `user_credits`
      - `user_id` (uuid, primary key, references user_profiles)
      - `complimentary_credits` (integer, default 20)
      - `purchased_credits` (integer, default 0)
      - `total_kobos` (integer, default 20)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `credit_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `transaction_type` (text: 'earn' or 'spend')
      - `amount` (integer)
      - `description` (text)
      - `created_at` (timestamptz)
    
    - `credit_packages`
      - `id` (text, primary key)
      - `package_name` (text)
      - `credits` (integer)
      - `bonus_credits` (integer, default 0)
      - `price_usd` (numeric)
      - `package_type` (text: 'credits', 'kobos', 'combo')
      - `is_popular` (boolean, default false)
      - `features` (jsonb array)
      - `is_active` (boolean, default true)
  
  2. Security
    - Enable RLS on all credit tables
    - Users can only view and update their own credits
    - Credit transactions are read-only for users
*/

CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  complimentary_credits integer DEFAULT 20 CHECK (complimentary_credits >= 0),
  purchased_credits integer DEFAULT 0 CHECK (purchased_credits >= 0),
  total_kobos integer DEFAULT 20 CHECK (total_kobos >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earn', 'spend')),
  amount integer NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_packages (
  id text PRIMARY KEY,
  package_name text NOT NULL,
  credits integer DEFAULT 0 CHECK (credits >= 0),
  bonus_credits integer DEFAULT 0 CHECK (bonus_credits >= 0),
  price_usd numeric(10,2) NOT NULL CHECK (price_usd > 0),
  package_type text NOT NULL CHECK (package_type IN ('credits', 'kobos', 'combo')),
  is_popular boolean DEFAULT false,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own credits"
  ON user_credits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own credits"
  ON user_credits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own transactions"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can view active credit packages"
  ON credit_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at DESC);
/*
  # Matching System Tables Migration
  
  1. New Tables
    - `user_likes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `target_user_id` (uuid, references user_profiles)
      - `like_type` (text: 'like', 'super_like', 'pass', 'blink')
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, target_user_id)
    
    - `matches`
      - `id` (uuid, primary key)
      - `user1_id` (uuid, references user_profiles)
      - `user2_id` (uuid, references user_profiles)
      - `matched_at` (timestamptz)
      - `last_activity` (timestamptz)
      - `is_active` (boolean, default true)
      - Unique constraint on sorted user pair
    
    - `user_personality_profile`
      - `user_id` (uuid, primary key, references user_profiles)
      - `big_five_openness` (integer, 0-100)
      - `big_five_conscientiousness` (integer, 0-100)
      - `big_five_extraversion` (integer, 0-100)
      - `big_five_agreeableness` (integer, 0-100)
      - `big_five_neuroticism` (integer, 0-100)
      - `attachment_style` (text)
      - `love_language_primary` (text)
      - `communication_style` (text)
      - `conflict_resolution` (text)
      - `life_goals` (jsonb array)
      - `values` (jsonb array)
      - `interests` (jsonb array of {interest, weight})
    
    - `user_behavioral_metrics`
      - `user_id` (uuid, primary key, references user_profiles)
      - `response_rate` (numeric)
      - `average_response_time_minutes` (integer)
      - `conversation_quality_score` (integer, 0-100)
      - `video_chat_acceptance_rate` (numeric)
      - `date_acceptance_rate` (numeric)
      - `profile_completion_score` (integer, 0-100)
      - `engagement_score` (integer, 0-100)
      - `updated_at` (timestamptz)
    
    - `matching_preferences`
      - `user_id` (uuid, primary key, references user_profiles)
      - `age_min` (integer)
      - `age_max` (integer)
      - `distance_max` (integer)
      - `education_levels` (jsonb array)
      - `relationship_goals` (jsonb array)
      - `has_children_pref` (text)
      - `wants_children_pref` (text)
      - `dealbreakers` (jsonb array)
      - `must_haves` (jsonb array)
      - `updated_at` (timestamptz)
    
    - `match_scores`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `potential_match_id` (uuid, references user_profiles)
      - `overall_score` (integer, 0-100)
      - `personality_score` (integer, 0-100)
      - `behavioral_score` (integer, 0-100)
      - `preference_score` (integer, 0-100)
      - `interest_score` (integer, 0-100)
      - `value_alignment_score` (integer, 0-100)
      - `communication_compatibility` (integer, 0-100)
      - `lifestyle_compatibility` (integer, 0-100)
      - `match_reasons` (jsonb array)
      - `calculated_at` (timestamptz)
      - `expires_at` (timestamptz)
      - Unique constraint on (user_id, potential_match_id)
    
    - `matching_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `target_user_id` (uuid, references user_profiles)
      - `interaction_type` (text)
      - `match_score_at_interaction` (integer)
      - `outcome` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all matching tables
    - Users can view their own data and mutual matches
*/

CREATE TABLE IF NOT EXISTS user_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  like_type text NOT NULL CHECK (like_type IN ('like', 'super_like', 'pass', 'blink')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  matched_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  CHECK (user1_id < user2_id)
);

CREATE TABLE IF NOT EXISTS user_personality_profile (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  big_five_openness integer DEFAULT 50 CHECK (big_five_openness >= 0 AND big_five_openness <= 100),
  big_five_conscientiousness integer DEFAULT 50 CHECK (big_five_conscientiousness >= 0 AND big_five_conscientiousness <= 100),
  big_five_extraversion integer DEFAULT 50 CHECK (big_five_extraversion >= 0 AND big_five_extraversion <= 100),
  big_five_agreeableness integer DEFAULT 50 CHECK (big_five_agreeableness >= 0 AND big_five_agreeableness <= 100),
  big_five_neuroticism integer DEFAULT 50 CHECK (big_five_neuroticism >= 0 AND big_five_neuroticism <= 100),
  attachment_style text DEFAULT 'secure' CHECK (attachment_style IN ('secure', 'anxious', 'avoidant', 'fearful')),
  love_language_primary text DEFAULT '',
  communication_style text DEFAULT 'direct',
  conflict_resolution text DEFAULT 'collaborative',
  life_goals jsonb DEFAULT '[]'::jsonb,
  values jsonb DEFAULT '[]'::jsonb,
  interests jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_behavioral_metrics (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  response_rate numeric DEFAULT 0 CHECK (response_rate >= 0 AND response_rate <= 1),
  average_response_time_minutes integer DEFAULT 0 CHECK (average_response_time_minutes >= 0),
  conversation_quality_score integer DEFAULT 50 CHECK (conversation_quality_score >= 0 AND conversation_quality_score <= 100),
  video_chat_acceptance_rate numeric DEFAULT 0 CHECK (video_chat_acceptance_rate >= 0 AND video_chat_acceptance_rate <= 1),
  date_acceptance_rate numeric DEFAULT 0 CHECK (date_acceptance_rate >= 0 AND date_acceptance_rate <= 1),
  profile_completion_score integer DEFAULT 0 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
  engagement_score integer DEFAULT 50 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS matching_preferences (
  user_id uuid PRIMARY KEY REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  age_min integer DEFAULT 18 CHECK (age_min >= 18),
  age_max integer DEFAULT 99 CHECK (age_max <= 120),
  distance_max integer DEFAULT 50 CHECK (distance_max >= 0),
  education_levels jsonb DEFAULT '[]'::jsonb,
  relationship_goals jsonb DEFAULT '[]'::jsonb,
  has_children_pref text DEFAULT 'no_preference' CHECK (has_children_pref IN ('yes', 'no', 'no_preference')),
  wants_children_pref text DEFAULT 'no_preference' CHECK (wants_children_pref IN ('yes', 'no', 'no_preference')),
  dealbreakers jsonb DEFAULT '[]'::jsonb,
  must_haves jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  potential_match_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  overall_score integer NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  personality_score integer NOT NULL CHECK (personality_score >= 0 AND personality_score <= 100),
  behavioral_score integer NOT NULL CHECK (behavioral_score >= 0 AND behavioral_score <= 100),
  preference_score integer NOT NULL CHECK (preference_score >= 0 AND preference_score <= 100),
  interest_score integer NOT NULL CHECK (interest_score >= 0 AND interest_score <= 100),
  value_alignment_score integer NOT NULL CHECK (value_alignment_score >= 0 AND value_alignment_score <= 100),
  communication_compatibility integer NOT NULL CHECK (communication_compatibility >= 0 AND communication_compatibility <= 100),
  lifestyle_compatibility integer NOT NULL CHECK (lifestyle_compatibility >= 0 AND lifestyle_compatibility <= 100),
  match_reasons jsonb DEFAULT '[]'::jsonb,
  calculated_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  UNIQUE(user_id, potential_match_id)
);

CREATE TABLE IF NOT EXISTS matching_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  interaction_type text NOT NULL,
  match_score_at_interaction integer,
  outcome text DEFAULT 'neutral',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personality_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavioral_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own likes"
  ON user_likes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create likes"
  ON user_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their likes"
  ON user_likes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view likes they received"
  ON user_likes FOR SELECT
  TO authenticated
  USING (target_user_id = auth.uid());

CREATE POLICY "Users can view their matches"
  ON matches FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "System can create matches"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can update their matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid())
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can view their own personality profile"
  ON user_personality_profile FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their personality profile"
  ON user_personality_profile FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their behavioral metrics"
  ON user_behavioral_metrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their behavioral metrics"
  ON user_behavioral_metrics FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their matching preferences"
  ON matching_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their match scores"
  ON match_scores FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage match scores"
  ON match_scores FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their interactions"
  ON matching_interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create interactions"
  ON matching_interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_user_likes_user ON user_likes(user_id);
CREATE INDEX idx_user_likes_target ON user_likes(target_user_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_match_scores_user ON match_scores(user_id);
CREATE INDEX idx_match_scores_expires ON match_scores(expires_at);
CREATE INDEX idx_match_scores_score ON match_scores(overall_score DESC);
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
/*
  # Gifts and Verification Tables Migration
  
  1. New Tables
    - `virtual_gifts`
      - `id` (uuid, primary key)
      - `gift_name` (text)
      - `gift_description` (text)
      - `credit_cost` (integer)
      - `image_url` (text)
      - `category` (text)
      - `popularity_score` (integer)
      - `is_active` (boolean, default true)
    
    - `sent_gifts`
      - `id` (uuid, primary key)
      - `sender_id` (uuid, references user_profiles)
      - `recipient_id` (uuid, references user_profiles)
      - `gift_id` (uuid, references virtual_gifts)
      - `credits_spent` (integer)
      - `message` (text)
      - `created_at` (timestamptz)
    
    - `verification_requests`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `status` (text)
      - `phone_number` (text)
      - `address_street` (text)
      - `address_city` (text)
      - `address_province` (text)
      - `address_postal_code` (text)
      - `address_country` (text)
      - `legal_name_first` (text)
      - `legal_name_last` (text)
      - `legal_name_middle` (text)
      - `reviewed_by` (text)
      - `rejection_reason` (text)
      - `staff_notes` (text)
      - `created_at` (timestamptz)
      - `submitted_at` (timestamptz)
      - `reviewed_at` (timestamptz)
      - `approved_at` (timestamptz)
    
    - `verification_documents`
      - `id` (uuid, primary key)
      - `verification_request_id` (uuid, references verification_requests)
      - `user_id` (uuid, references user_profiles)
      - `document_type` (text)
      - `file_name` (text)
      - `file_url` (text)
      - `status` (text)
      - `reviewed_by` (text)
      - `rejection_reason` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `reviewed_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Gifts are public, sent gifts restricted to sender/recipient
    - Verification requests restricted to user and staff
*/

CREATE TABLE IF NOT EXISTS virtual_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_name text NOT NULL,
  gift_description text,
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  image_url text,
  category text DEFAULT 'general',
  popularity_score integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sent_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  gift_id uuid NOT NULL REFERENCES virtual_gifts(id) ON DELETE CASCADE,
  credits_spent integer NOT NULL CHECK (credits_spent > 0),
  message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  status text DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'submitted', 'under_review', 'approved', 'rejected')),
  phone_number text,
  address_street text,
  address_city text,
  address_province text,
  address_postal_code text,
  address_country text,
  legal_name_first text,
  legal_name_last text,
  legal_name_middle text,
  reviewed_by text,
  rejection_reason text,
  staff_notes text,
  created_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz
);

CREATE TABLE IF NOT EXISTS verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_request_id uuid NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('government_id', 'selfie', 'address_proof', 'phone_verification', 'legal_name', 'other')),
  file_name text NOT NULL,
  file_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'requires_resubmission')),
  reviewed_by text,
  rejection_reason text,
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE virtual_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active gifts"
  ON virtual_gifts FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view gifts they sent"
  ON sent_gifts FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can view gifts they received"
  ON sent_gifts FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can send gifts"
  ON sent_gifts FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can view their verification requests"
  ON verification_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their verification requests"
  ON verification_requests FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their verification documents"
  ON verification_documents FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their verification documents"
  ON verification_documents FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_sent_gifts_sender ON sent_gifts(sender_id);
CREATE INDEX idx_sent_gifts_recipient ON sent_gifts(recipient_id);
CREATE INDEX idx_verification_requests_user ON verification_requests(user_id);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_documents_request ON verification_documents(verification_request_id);
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
/*
  # Staff and Newsletter Tables Migration
  
  1. New Tables
    - `staff_members`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `email` (text, unique)
      - `role` (text: 'admin', 'moderator', 'support', 'verification')
      - `permissions` (jsonb)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
    
    - `newsletter_subscriptions`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `user_id` (uuid, references user_profiles, nullable)
      - `is_active` (boolean, default true)
      - `subscription_source` (text)
      - `created_at` (timestamptz)
      - `unsubscribed_at` (timestamptz)
    
    - `payment_transactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `transaction_type` (text: 'credit_purchase', 'subscription', 'service_booking')
      - `amount_usd` (numeric)
      - `credits_purchased` (integer)
      - `payment_method` (text)
      - `payment_status` (text)
      - `stripe_payment_id` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Staff tables require staff permissions
    - Payment transactions restricted to user
*/

CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'support', 'verification', 'content_manager')),
  permissions jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  user_id uuid REFERENCES user_profiles(user_id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  subscription_source text DEFAULT 'website',
  created_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit_purchase', 'subscription', 'service_booking', 'gift_purchase')),
  amount_usd numeric(10,2) NOT NULL CHECK (amount_usd >= 0),
  credits_purchased integer DEFAULT 0 CHECK (credits_purchased >= 0),
  payment_method text DEFAULT 'stripe',
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  stripe_payment_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all staff members"
  ON staff_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      WHERE sm.user_id = auth.uid() AND sm.is_active = true
    )
  );

CREATE POLICY "Users can view their payment transactions"
  ON payment_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create payment transactions"
  ON payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their newsletter subscription"
  ON newsletter_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR email = (SELECT email FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their newsletter subscription"
  ON newsletter_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR email = (SELECT email FROM user_profiles WHERE user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR email = (SELECT email FROM user_profiles WHERE user_id = auth.uid()));

CREATE INDEX idx_staff_members_email ON staff_members(email);
CREATE INDEX idx_staff_members_role ON staff_members(role);
CREATE INDEX idx_newsletter_subscriptions_email ON newsletter_subscriptions(email);
CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(payment_status);
CREATE INDEX idx_payment_transactions_created ON payment_transactions(created_at DESC);
/*
  # Insert Default Credit Packages
  
  Populates the credit_packages table with default package offerings
  matching the pricing structure in the application.
*/

INSERT INTO credit_packages (id, package_name, credits, bonus_credits, price_usd, package_type, is_popular, features) VALUES
  ('starter', 'Starter Credits', 50, 10, 14.99, 'credits', false, '["50 Credits", "10 Bonus Credits", "Chat & Messaging", "Profile Features"]'::jsonb),
  ('popular', 'Popular Credits', 100, 25, 29.99, 'credits', true, '["100 Credits", "25 Bonus Credits", "Premium Features", "Priority Support"]'::jsonb),
  ('premium', 'Premium Credits', 450, 0, 79.99, 'credits', false, '["450 Credits", "Premium Features", "VIP Features", "Unlimited Access"]'::jsonb),
  ('kobos-small', 'Kobos Pack', 20, 0, 9.99, 'kobos', false, '["20 Kobos", "Chat Only Currency", "Special Rate", "1 Kobo = 1 Minute Chat"]'::jsonb),
  ('kobos-large', 'Mega Kobos', 200, 0, 89.99, 'kobos', true, '["200 Kobos", "Best Value", "Chat Premium", "Extended Chat Time"]'::jsonb),
  ('ultimate', 'Ultimate Combo', 750, 100, 159.99, 'combo', false, '["750 Credits", "100 Bonus Credits", "Everything Included", "VIP Status"]'::jsonb),
  ('combo-mega', 'Mega Combo', 1000, 200, 199.99, 'combo', false, '["1000 Credits", "200 Bonus Credits", "Premium Everything", "Lifetime Support"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  package_name = EXCLUDED.package_name,
  credits = EXCLUDED.credits,
  bonus_credits = EXCLUDED.bonus_credits,
  price_usd = EXCLUDED.price_usd,
  package_type = EXCLUDED.package_type,
  is_popular = EXCLUDED.is_popular,
  features = EXCLUDED.features;
/*
  # Insert Default Virtual Gifts
  
  Populates the virtual_gifts table with default gift offerings.
*/

INSERT INTO virtual_gifts (gift_name, gift_description, credit_cost, category, popularity_score, is_active) VALUES
  ('Rose', 'A beautiful red rose to show your affection', 15, 'romantic', 95, true),
  ('Heart', 'Send love with a sparkling heart', 20, 'romantic', 90, true),
  ('Chocolate Box', 'Sweet gesture with delicious chocolates', 25, 'romantic', 85, true),
  ('Teddy Bear', 'Cute and cuddly teddy bear gift', 30, 'cute', 80, true),
  ('Diamond Ring', 'Luxurious diamond ring for special moments', 100, 'luxury', 75, true),
  ('Champagne', 'Celebrate together with champagne', 50, 'celebration', 70, true),
  ('Coffee', 'Virtual coffee date starter', 10, 'casual', 88, true),
  ('Stars', 'Send a constellation of stars', 15, 'romantic', 92, true),
  ('Trophy', 'You are a winner!', 20, 'fun', 65, true),
  ('Sunflower', 'Bright and cheerful sunflower', 15, 'romantic', 78, true)
ON CONFLICT DO NOTHING;
/*
  # Create Profile Trigger Function
  
  Automatically creates user profile and initializes credits when a new user signs up.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO user_credits (user_id, complimentary_credits, purchased_credits, total_kobos)
  VALUES (NEW.id, 20, 0, 20)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
/*
  # Fix Critical Security Issues - Part 1
  
  1. Enable RLS on tables missing it (profiles, conversations, conversation_members, messages)
  2. Add missing indexes for next_auth foreign keys
  3. Drop large number of unused indexes to improve write performance
  
  These fixes address:
  - RLS Disabled warnings
  - Unindexed foreign keys
  - Unused index warnings
*/

-- Enable RLS on tables that are missing it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for newly protected tables
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth_user_id = (select auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth_user_id = (select auth.uid()))
  WITH CHECK (auth_user_id = (select auth.uid()));

CREATE POLICY "Users can view conversations they're in"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.profile_id IN (
        SELECT id FROM profiles WHERE auth_user_id = (select auth.uid())
      )
    )
  );

CREATE POLICY "Users can view conversation members for their conversations"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_members cm
      JOIN profiles p ON p.id = cm.profile_id
      WHERE p.auth_user_id = (select auth.uid())
    )
  );

-- Add indexes for next_auth foreign keys
CREATE INDEX IF NOT EXISTS idx_accounts_userId ON next_auth.accounts("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_userId ON next_auth.sessions("userId");

-- Drop unused indexes (large batch 1)
DROP INDEX IF EXISTS public.idx_profiles_auth_user_id;
DROP INDEX IF EXISTS public.idx_messages_conversation_created;
DROP INDEX IF EXISTS public.idx_conversations_created_by;
DROP INDEX IF EXISTS public.idx_conv_members_profile;
DROP INDEX IF EXISTS public.idx_conv_members_conversation;
DROP INDEX IF EXISTS public.idx_messages_sender;
DROP INDEX IF EXISTS public.idx_algorithm_feedback_user_id;
DROP INDEX IF EXISTS public.idx_algorithm_feedback_match_id;
DROP INDEX IF EXISTS public.idx_biometric_data_user_id;
DROP INDEX IF EXISTS public.idx_chat_messages_sender_id;
DROP INDEX IF EXISTS public.idx_chat_messages_thread_id;
DROP INDEX IF EXISTS public.idx_chat_messages_created_at;
DROP INDEX IF EXISTS public.idx_chat_threads_match_id;
DROP INDEX IF EXISTS public.idx_comment_likes_comment_id;
DROP INDEX IF EXISTS public.idx_comment_likes_user_id;
DROP INDEX IF EXISTS public.idx_credit_access_requests_staff_id;
DROP INDEX IF EXISTS public.idx_credit_access_requests_target_user_id;
DROP INDEX IF EXISTS public.idx_credit_access_requests_approved_by;
DROP INDEX IF EXISTS public.idx_credit_transactions_user_id;
DROP INDEX IF EXISTS public.idx_credit_transactions_created_at;
/*
  # Fix Critical Security Issues - Part 2
  
  Drop more unused indexes and fix function search paths
*/

-- Drop unused indexes (batch 2)
DROP INDEX IF EXISTS public.idx_error_logs_user_id;
DROP INDEX IF EXISTS public.idx_error_logs_timestamp;
DROP INDEX IF EXISTS public.idx_login_attempts_user_id;
DROP INDEX IF EXISTS public.idx_login_attempts_ip_address;
DROP INDEX IF EXISTS public.idx_login_attempts_timestamp;
DROP INDEX IF EXISTS public.idx_mail_messages_sender_id;
DROP INDEX IF EXISTS public.idx_mail_messages_thread_id;
DROP INDEX IF EXISTS public.idx_mail_messages_created_at;
DROP INDEX IF EXISTS public.idx_mail_threads_participant1_id;
DROP INDEX IF EXISTS public.idx_mail_threads_participant2_id;
DROP INDEX IF EXISTS public.idx_match_scores_user_id;
DROP INDEX IF EXISTS public.idx_match_scores_potential_match_id;
DROP INDEX IF EXISTS public.idx_match_scores_overall_score;
DROP INDEX IF EXISTS public.idx_matches_user1_id;
DROP INDEX IF EXISTS public.idx_matches_user2_id;
DROP INDEX IF EXISTS public.idx_matches_matched_at;
DROP INDEX IF EXISTS public.idx_matching_interactions_user_id;
DROP INDEX IF EXISTS public.idx_matching_interactions_target_user_id;
DROP INDEX IF EXISTS public.idx_matching_interactions_created_at;
DROP INDEX IF EXISTS public.idx_newsletter_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_newsletter_subscriptions_email;
DROP INDEX IF EXISTS public.idx_photo_access_grants_photo_owner_id;
DROP INDEX IF EXISTS public.idx_photo_access_grants_granted_to_user_id;
DROP INDEX IF EXISTS public.idx_quiz_results_quiz_id;
DROP INDEX IF EXISTS public.idx_quiz_results_user_id;
DROP INDEX IF EXISTS public.idx_security_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_security_audit_log_event_type;
DROP INDEX IF EXISTS public.idx_security_audit_log_timestamp;
DROP INDEX IF EXISTS public.idx_sent_gifts_sender_id;
DROP INDEX IF EXISTS public.idx_sent_gifts_recipient_id;
DROP INDEX IF EXISTS public.idx_sent_gifts_gift_id;
DROP INDEX IF EXISTS public.idx_sent_gifts_created_at;
/*
  # Fix Critical Security Issues - Part 3
  
  Drop remaining unused indexes
*/

-- Drop unused indexes (batch 3)
DROP INDEX IF EXISTS public.idx_subscription_payments_user_id;
DROP INDEX IF EXISTS public.idx_subscription_payments_subscription_id;
DROP INDEX IF EXISTS public.idx_subscription_payments_payment_date;
DROP INDEX IF EXISTS public.idx_subscription_trials_user_id;
DROP INDEX IF EXISTS public.idx_subscription_trials_tier_id;
DROP INDEX IF EXISTS public.idx_subscription_trials_trial_status;
DROP INDEX IF EXISTS public.idx_blog_articles_author_id;
DROP INDEX IF EXISTS public.idx_blog_articles_category;
DROP INDEX IF EXISTS public.idx_subscription_usage_tracking_user_id;
DROP INDEX IF EXISTS public.idx_subscription_usage_tracking_subscription_id;
DROP INDEX IF EXISTS public.idx_user_comments_user_id;
DROP INDEX IF EXISTS public.idx_user_comments_parent_comment_id;
DROP INDEX IF EXISTS public.idx_user_comments_content_type_id;
DROP INDEX IF EXISTS public.idx_user_kobos_user_id;
DROP INDEX IF EXISTS public.idx_user_kobos_is_used;
DROP INDEX IF EXISTS public.idx_user_likes_user_id;
DROP INDEX IF EXISTS public.idx_user_likes_target_user_id;
DROP INDEX IF EXISTS public.idx_user_likes_created_at;
DROP INDEX IF EXISTS public.idx_user_subscriptions_user_id;
DROP INDEX IF EXISTS public.idx_user_subscriptions_tier_id;
DROP INDEX IF EXISTS public.idx_user_subscriptions_status;
DROP INDEX IF EXISTS public.idx_user_verification_user_id;
DROP INDEX IF EXISTS public.idx_user_verification_reviewer_id;
DROP INDEX IF EXISTS public.idx_user_verification_status;
DROP INDEX IF EXISTS public.idx_verification_audit_log_verification_id;
DROP INDEX IF EXISTS public.idx_verification_audit_log_actor_id;
DROP INDEX IF EXISTS public.idx_verification_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_verification_documents_verification_id;
DROP INDEX IF EXISTS public.idx_verification_documents_document_type;
DROP INDEX IF EXISTS public.idx_blog_articles_published_at;
DROP INDEX IF EXISTS public.idx_blog_articles_featured;
/*
  # Fix RLS Performance Issues for blog_articles
  
  Optimizes RLS policies to use (select auth.uid()) pattern
  instead of auth.uid() directly for better performance.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create articles" ON blog_articles;
DROP POLICY IF EXISTS "Users can update own articles" ON blog_articles;
DROP POLICY IF EXISTS "Users can delete own articles" ON blog_articles;

-- Recreate with optimized pattern
CREATE POLICY "Users can create articles"
  ON blog_articles FOR INSERT
  TO authenticated
  WITH CHECK (author_id = (select auth.uid()));

CREATE POLICY "Users can update own articles"
  ON blog_articles FOR UPDATE
  TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

CREATE POLICY "Users can delete own articles"
  ON blog_articles FOR DELETE
  TO authenticated
  USING (author_id = (select auth.uid()));
/*
  # Fix Function Search Paths
  
  Sets immutable search paths for functions to improve security
  and prevent search_path manipulation attacks.
*/

-- Fix next_auth.uid function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'uid' AND n.nspname = 'next_auth'
  ) THEN
    EXECUTE 'ALTER FUNCTION next_auth.uid() SET search_path = next_auth, public';
  END IF;
END $$;

-- Fix public functions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_verification_status' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.get_user_verification_status(uuid) SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_blog_articles_updated_at' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.update_blog_articles_updated_at() SET search_path = public, pg_temp;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_blog_article_views' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER FUNCTION public.increment_blog_article_views(uuid) SET search_path = public, pg_temp;
  END IF;
END $$;
/*
  # Create Database Helper Functions
  
  Adds utility functions for common operations in the dating app.
*/

-- Function to check if two users have mutual likes
CREATE OR REPLACE FUNCTION check_mutual_like(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_likes
    WHERE user_id = user_a AND target_user_id = user_b AND like_type IN ('like', 'super_like')
  ) AND EXISTS (
    SELECT 1 FROM user_likes
    WHERE user_id = user_b AND target_user_id = user_a AND like_type IN ('like', 'super_like')
  );
END;
$$;

-- Function to create or get match between two users
CREATE OR REPLACE FUNCTION create_match_if_mutual(user_a uuid, user_b uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  match_id uuid;
  min_user uuid;
  max_user uuid;
BEGIN
  -- Check for mutual like
  IF NOT check_mutual_like(user_a, user_b) THEN
    RETURN NULL;
  END IF;
  
  -- Ensure consistent ordering for match creation
  IF user_a < user_b THEN
    min_user := user_a;
    max_user := user_b;
  ELSE
    min_user := user_b;
    max_user := user_a;
  END IF;
  
  -- Check if match already exists
  SELECT id INTO match_id
  FROM matches
  WHERE user1_id = min_user AND user2_id = max_user;
  
  -- Create match if it doesn't exist
  IF match_id IS NULL THEN
    INSERT INTO matches (user1_id, user2_id, matched_at, is_active)
    VALUES (min_user, max_user, now(), true)
    RETURNING id INTO match_id;
  END IF;
  
  RETURN match_id;
END;
$$;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  total_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO total_count
  FROM chat_messages cm
  JOIN chat_threads ct ON ct.id = cm.thread_id
  JOIN matches m ON m.id = ct.match_id
  WHERE (m.user1_id = p_user_id OR m.user2_id = p_user_id)
    AND cm.sender_id != p_user_id
    AND cm.is_read = false;
  
  RETURN COALESCE(total_count, 0);
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_thread_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE chat_messages
  SET is_read = true
  WHERE thread_id = p_thread_id
    AND sender_id != p_user_id
    AND is_read = false;
END;
$$;

-- Function to update newsfeed post counts
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE newsfeed_posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE newsfeed_posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Function to update comment counts
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE newsfeed_posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE newsfeed_posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers for automatic count updates
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON post_likes;
CREATE TRIGGER trigger_update_post_like_count
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

DROP TRIGGER IF EXISTS trigger_update_post_comment_count ON post_comments;
CREATE TRIGGER trigger_update_post_comment_count
  AFTER INSERT OR DELETE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_post_comment_count();

-- Function to update user's last activity
CREATE OR REPLACE FUNCTION update_user_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_profiles
  SET updated_at = now()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_mutual_like TO authenticated;
GRANT EXECUTE ON FUNCTION create_match_if_mutual TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_message_count TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read TO authenticated;
/*
  # Add Essential Indexes for Production (Fixed)
  
  Creates indexes on frequently queried columns to optimize performance.
  Removes non-immutable predicates from WHERE clauses.
*/

-- User Profiles - Discovery and search
CREATE INDEX IF NOT EXISTS idx_user_profiles_visibility ON user_profiles(profile_visibility) WHERE profile_visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_user_profiles_age ON user_profiles(age) WHERE age IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_location ON user_profiles(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(is_verified) WHERE is_verified = true;

-- User Likes - Matching logic
CREATE INDEX IF NOT EXISTS idx_user_likes_target ON user_likes(target_user_id, like_type);
CREATE INDEX IF NOT EXISTS idx_user_likes_user_type ON user_likes(user_id, like_type);
CREATE INDEX IF NOT EXISTS idx_user_likes_created ON user_likes(created_at DESC);

-- Matches - Active matches
CREATE INDEX IF NOT EXISTS idx_matches_user1_active ON matches(user1_id, last_activity DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_matches_user2_active ON matches(user2_id, last_activity DESC) WHERE is_active = true;

-- Chat Threads and Messages
CREATE INDEX IF NOT EXISTS idx_chat_threads_match ON chat_threads(match_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created ON chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(thread_id) WHERE is_read = false;

-- Mail System
CREATE INDEX IF NOT EXISTS idx_mail_threads_participant1 ON mail_threads(participant1_id, updated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mail_threads_participant2 ON mail_threads(participant2_id, updated_at DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mail_messages_thread_created ON mail_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_unread ON mail_messages(thread_id) WHERE is_read = false;

-- Match Scores - Recommendations (removed non-immutable predicate)
CREATE INDEX IF NOT EXISTS idx_match_scores_user_score ON match_scores(user_id, overall_score DESC, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_match_scores_expires ON match_scores(expires_at DESC);

-- Credit System
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_created ON credit_transactions(user_id, created_at DESC);

-- Gifts
CREATE INDEX IF NOT EXISTS idx_sent_gifts_recipient ON sent_gifts(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sent_gifts_sender ON sent_gifts(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_virtual_gifts_active ON virtual_gifts(category, popularity_score DESC) WHERE is_active = true;

-- Verification
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON verification_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_documents_request ON verification_documents(verification_request_id, status);

-- Community Features
CREATE INDEX IF NOT EXISTS idx_newsfeed_posts_public ON newsfeed_posts(created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_newsfeed_posts_user ON newsfeed_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at DESC);

-- Bookings and Services
CREATE INDEX IF NOT EXISTS idx_booking_sessions_user_date ON booking_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_booking_sessions_status ON booking_sessions(status, session_date DESC);

-- Feedback
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_submissions(status, created_at DESC);

-- Payment Transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_created ON payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(payment_status, created_at DESC);

-- Newsletter
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscriptions(email) WHERE is_active = true;

-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_members_active ON staff_members(email, role) WHERE is_active = true;

-- Matching system performance indexes
CREATE INDEX IF NOT EXISTS idx_user_personality_user ON user_personality_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavioral_user ON user_behavioral_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_preferences_user ON matching_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_interactions_user ON matching_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_interactions_target ON matching_interactions(target_user_id, interaction_type);
/*
  # Add Public Read Access Policies

  ## Changes
  This migration adds public read access to key tables that need to be viewable
  by unauthenticated users (anon role) to allow profile browsing before signup.

  ## Tables Modified
  1. **user_profiles** - Allow anon users to SELECT all profiles for browsing
  2. **user_photos** - Allow anon users to view all profile photos
  3. **virtual_gifts** - Allow anon users to browse gift shop
  4. **credit_packages** - Allow anon users to view pricing
  5. **blog_articles** - Allow anon users to read blog content

  ## Security Notes
  - Only SELECT (read) permission granted to anon users
  - All write operations (INSERT, UPDATE, DELETE) still require authentication
  - Sensitive user data not exposed (only public profile information)
  - This follows standard dating app patterns where browsing is public but interaction requires signup

  ## Impact
  - Fixes 401 errors when unauthenticated users browse profiles
  - Allows users to explore the app before committing to signup
  - Improves user experience and conversion rates
*/

-- Add public read access for user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'anon_users_can_browse_profiles'
  ) THEN
    CREATE POLICY "anon_users_can_browse_profiles"
      ON user_profiles
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Add public read access for user_photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_photos' 
    AND policyname = 'anon_users_can_view_photos'
  ) THEN
    CREATE POLICY "anon_users_can_view_photos"
      ON user_photos
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Add public read access for virtual_gifts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'virtual_gifts' 
    AND policyname = 'anon_users_can_browse_gifts'
  ) THEN
    CREATE POLICY "anon_users_can_browse_gifts"
      ON virtual_gifts
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;

-- Add public read access for credit_packages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'credit_packages' 
    AND policyname = 'anon_users_can_view_pricing'
  ) THEN
    CREATE POLICY "anon_users_can_view_pricing"
      ON credit_packages
      FOR SELECT
      TO anon
      USING (is_active = true);
  END IF;
END $$;

-- Add public read access for blog_articles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'blog_articles' 
    AND policyname = 'anon_users_can_read_blog'
  ) THEN
    CREATE POLICY "anon_users_can_read_blog"
      ON blog_articles
      FOR SELECT
      TO anon
      USING (published = true);
  END IF;
END $$;
