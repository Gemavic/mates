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
