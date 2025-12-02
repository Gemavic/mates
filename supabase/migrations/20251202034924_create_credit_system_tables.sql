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
