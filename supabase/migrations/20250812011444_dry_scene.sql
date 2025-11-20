/*
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
  FOR EACH ROW EXECUTE FUNCTION initialize_user_credits();