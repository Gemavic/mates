/*
  # Fix Staff Authentication - Schema Path Issue

  Updates the authentication functions to use the correct schema path for pgcrypto functions.
  The crypt() and gen_salt() functions are in the extensions schema, not public.
*/

-- Drop and recreate authenticate_staff function with correct schema
DROP FUNCTION IF EXISTS authenticate_staff(text, text);

CREATE OR REPLACE FUNCTION authenticate_staff(
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_staff staff_members;
  v_password_match boolean;
BEGIN
  -- Get staff member
  SELECT * INTO v_staff
  FROM staff_members
  WHERE email = p_email
  AND is_active = true;

  -- Check if staff exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email or password'
    );
  END IF;

  -- Verify password (using crypt extension from extensions schema)
  v_password_match := v_staff.password_hash = extensions.crypt(p_password, v_staff.password_hash);

  IF NOT v_password_match THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid email or password'
    );
  END IF;

  -- Update last login
  UPDATE staff_members
  SET last_login = now()
  WHERE id = v_staff.id;

  -- Return success with staff data
  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', v_staff.id,
      'email', v_staff.email,
      'role', v_staff.role,
      'permissions', v_staff.permissions,
      'is_active', v_staff.is_active
    )
  );
END;
$$;

-- Drop and recreate change_staff_password function with correct schema
DROP FUNCTION IF EXISTS change_staff_password(text, text, text, text);

CREATE OR REPLACE FUNCTION change_staff_password(
  p_manager_email text,
  p_manager_password text,
  p_target_email text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_manager staff_members;
  v_target staff_members;
  v_password_match boolean;
  v_can_change boolean;
BEGIN
  -- Get manager
  SELECT * INTO v_manager
  FROM staff_members
  WHERE email = p_manager_email
  AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Manager authentication failed');
  END IF;

  -- Verify manager password
  v_password_match := v_manager.password_hash = extensions.crypt(p_manager_password, v_manager.password_hash);

  IF NOT v_password_match THEN
    RETURN jsonb_build_object('success', false, 'error', 'Manager authentication failed');
  END IF;

  -- Check if manager has permission
  v_can_change := v_manager.role IN ('Super User', 'Administrator', 'Credit Manager')
    OR v_manager.permissions ? 'change_staff_passwords';

  IF NOT v_can_change THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Get target staff
  SELECT * INTO v_target
  FROM staff_members
  WHERE email = p_target_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Target staff not found');
  END IF;

  -- Validate password strength
  IF length(p_new_password) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Password must be at least 8 characters');
  END IF;

  -- Update password
  UPDATE staff_members
  SET 
    password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    password_last_changed = now(),
    updated_at = now()
  WHERE id = v_target.id;

  RETURN jsonb_build_object('success', true, 'message', 'Password changed successfully');
END;
$$;

-- Update existing staff passwords to use proper hashing
UPDATE staff_members
SET password_hash = extensions.crypt('AdminPass2025!', extensions.gen_salt('bf'))
WHERE email = 'admin@dates.care';

UPDATE staff_members
SET password_hash = extensions.crypt('CreditPass2025!', extensions.gen_salt('bf'))
WHERE email = 'creditmanager@dates.care';

UPDATE staff_members
SET password_hash = extensions.crypt('SupportPass2025!', extensions.gen_salt('bf'))
WHERE email = 'support@dates.care';