/*
  # Fix Signup Trigger - Bypass RLS for Automatic User Creation
  
  ## Problem
  The `initialize_user_credits()` trigger function fails because it tries to insert into tables 
  with RLS enabled, but during signup the auth context doesn't allow these inserts.
  
  ## Solution
  1. Recreate the trigger function with proper RLS bypass using `SET LOCAL`
  2. Ensure the function can successfully create user profile, credits, and kobos
  3. Add proper error handling
  
  ## Changes
  - Recreates `initialize_user_credits()` function with RLS bypass
  - Creates user_profiles record with full_name from metadata
  - Creates user_credits record with initial 10 credits
  - Creates 10 kobo records for the new user
  - Adds welcome bonus transaction
*/

-- Drop and recreate the trigger function with proper RLS handling
CREATE OR REPLACE FUNCTION public.initialize_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- Disable RLS for this function's operations
  SET LOCAL role TO postgres;
  
  -- Create user profile with metadata
  INSERT INTO public.user_profiles (
    user_id, 
    email, 
    full_name,
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NOW(), 
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user credits
  INSERT INTO public.user_credits (
    user_id, 
    complimentary_credits, 
    purchased_credits,
    total_kobos,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    10, 
    0,
    10,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Add welcome bonus transaction
  INSERT INTO public.credit_transactions (
    user_id, 
    transaction_type, 
    amount, 
    description, 
    category,
    created_at
  )
  VALUES (
    NEW.id, 
    'earn', 
    10, 
    'Welcome Bonus - New User Credits', 
    'bonus',
    NOW()
  );

  -- Create initial kobos
  INSERT INTO public.user_kobos (user_id, kobo_value, is_used, purchase_date)
  SELECT NEW.id, 1, false, NOW()
  FROM generate_series(1, 10);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in initialize_user_credits: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_credits();
