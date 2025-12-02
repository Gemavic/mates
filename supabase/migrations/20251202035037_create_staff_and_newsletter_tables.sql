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
