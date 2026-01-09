/*
  # Create helper function to get user ID by email
  
  1. New Functions
    - `get_user_id_by_email`: Look up user_id from auth.users by email
  
  2. Purpose
    - Allow staff panel to accept email addresses instead of just UUIDs
    - Makes it easier for staff to award credits by email
  
  3. Security
    - This function is meant for staff use only
    - Uses SECURITY DEFINER to bypass RLS and query auth.users
*/

-- Function to get user_id by email
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Look up user_id from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email
  LIMIT 1;
  
  RETURN v_user_id;
END;
$$;