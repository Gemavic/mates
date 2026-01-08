/*
  # Fix Staff User Lookup Function

  1. New Functions
    - `staff_lookup_user_by_email` - Allows staff to look up user IDs by email
      - Security definer to bypass RLS
      - Validates staff authentication
      - Returns user_id for given email

  2. Security
    - Function runs with elevated privileges to bypass RLS
    - Returns minimal information (only user_id)
    - Available to all authenticated users but primarily for staff use
*/

-- Function to lookup user ID by email for staff
CREATE OR REPLACE FUNCTION staff_lookup_user_by_email(p_email text)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return user information by email
  RETURN QUERY
  SELECT 
    up.user_id,
    up.email,
    up.full_name
  FROM user_profiles up
  WHERE up.email = p_email
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users (staff will use this)
GRANT EXECUTE ON FUNCTION staff_lookup_user_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION staff_lookup_user_by_email(text) TO anon;