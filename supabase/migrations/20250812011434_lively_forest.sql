/*
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
$$ LANGUAGE plpgsql SECURITY DEFINER;