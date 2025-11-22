/*
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
ON CONFLICT DO NOTHING;