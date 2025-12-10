-- Fix user_credits table
-- This will recreate the table with the correct structure

-- Drop the trigger first if it exists
DROP TRIGGER IF EXISTS create_user_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile_on_signup();

-- Drop and recreate user_credits table
DROP TABLE IF EXISTS user_credits CASCADE;

CREATE TABLE user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer DEFAULT 0 CHECK (balance >= 0),
  lifetime_credits integer DEFAULT 0 CHECK (lifetime_credits >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;

CREATE POLICY "Users can view own credits"
  ON user_credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_credits_balance ON user_credits(user_id, balance);

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (user_id, email, full_name, first_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Give 50 free credits
  INSERT INTO user_credits (user_id, balance, lifetime_credits)
  VALUES (NEW.id, 50, 50)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER create_user_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile_on_signup();

-- For existing users without credits, add them
INSERT INTO user_credits (user_id, balance, lifetime_credits)
SELECT id, 50, 50
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_credits)
ON CONFLICT (user_id) DO NOTHING;

SELECT 'user_credits table fixed!' as status;
