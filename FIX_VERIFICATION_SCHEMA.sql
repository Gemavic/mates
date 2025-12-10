/*
  # Fix Verification System Schema

  1. Create verification_requests table with all required columns
    - user_id (foreign key to auth.users)
    - phone_number
    - phone_verified
    - otp_code
    - otp_expires_at
    - selfie_url
    - government_id_url
    - address_proof_url
    - full_name
    - verification_status
    - submitted_at
    - created_at
    - updated_at

  2. Add RLS policies
    - Users can view and update their own verification requests
    - Staff can view all verification requests

  3. Create verification_requests bucket if not exists
*/

-- Create verification_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number text,
  phone_verified boolean DEFAULT false,
  otp_code text,
  otp_expires_at timestamptz,
  selfie_url text,
  government_id_url text,
  address_proof_url text,
  full_name text,
  verification_status text DEFAULT 'incomplete',
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE verification_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own verification" ON verification_requests;
DROP POLICY IF EXISTS "Users can insert own verification" ON verification_requests;
DROP POLICY IF EXISTS "Users can update own verification" ON verification_requests;

-- Create RLS policies
CREATE POLICY "Users can view own verification"
  ON verification_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own verification"
  ON verification_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own verification"
  ON verification_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add missing columns to user_profiles if they don't exist
DO $$
BEGIN
  -- Add verification_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN verification_status text DEFAULT 'unverified';
  END IF;

  -- Add other optional columns that may be missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'occupation'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN occupation text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'education'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN education text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'looking_for'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN looking_for text DEFAULT 'relationship';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'distance_preference'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN distance_preference integer DEFAULT 50;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'age_range_min'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN age_range_min integer DEFAULT 18;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'age_range_max'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN age_range_max integer DEFAULT 99;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN is_online boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_active'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_active timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'show_online_status'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN show_online_status boolean DEFAULT true;
  END IF;
END $$;

-- Create storage bucket for verification documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-documents', 'verification-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification documents
DROP POLICY IF EXISTS "Users can upload own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view verification docs" ON storage.objects;

CREATE POLICY "Users can upload own verification docs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own verification docs"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'verification-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view verification docs"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'verification-documents');

SELECT 'Verification schema fixed!' as status;
