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
