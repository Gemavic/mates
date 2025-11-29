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
