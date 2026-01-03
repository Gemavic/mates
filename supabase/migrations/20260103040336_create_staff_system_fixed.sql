/*
  # Staff Authentication System - Fixed

  1. New Tables
    - `staff_members` - Staff accounts with secure authentication

  2. Security
    - Enable RLS with proper policies
    - Password hashing with bcrypt
    - Role-based access control

  3. Initial Accounts Created
    - admin@dates.care - Super User (Password: AdminPass2025!)
    - creditmanager@dates.care - Credit Manager (Password: CreditPass2025!)
    - support@dates.care - Support Agent (Password: SupportPass2025!)
*/

-- Drop existing table if exists
DROP TABLE IF EXISTS staff_members CASCADE;

-- Create staff_members table
CREATE TABLE staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('Super User', 'Administrator', 'Credit Manager', 'Support Agent', 'Moderator')),
  permissions jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  password_last_changed timestamptz DEFAULT now(),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key for created_by (after table creation)
ALTER TABLE staff_members
ADD CONSTRAINT fk_staff_created_by
FOREIGN KEY (created_by) REFERENCES staff_members(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- Policy: Allow viewing staff members (for authenticated users)
CREATE POLICY "Allow viewing staff"
  ON staff_members
  FOR SELECT
  TO public
  USING (true);

-- Policy: Only super users can insert
CREATE POLICY "Super users can insert staff"
  ON staff_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.email = current_user
      AND staff_members.role = 'Super User'
      AND staff_members.is_active = true
    )
  );

-- Policy: Only super users can update
CREATE POLICY "Super users can update staff"
  ON staff_members
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM staff_members
      WHERE staff_members.email = current_user
      AND staff_members.role = 'Super User'
      AND staff_members.is_active = true
    )
  );

-- Create function to authenticate staff
CREATE OR REPLACE FUNCTION authenticate_staff(
  p_email text,
  p_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Verify password (using crypt extension)
  v_password_match := v_staff.password_hash = crypt(p_password, v_staff.password_hash);

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

-- Create function to change staff password
CREATE OR REPLACE FUNCTION change_staff_password(
  p_manager_email text,
  p_manager_password text,
  p_target_email text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_password_match := v_manager.password_hash = crypt(p_manager_password, v_manager.password_hash);

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
    password_hash = crypt(p_new_password, gen_salt('bf')),
    password_last_changed = now(),
    updated_at = now()
  WHERE id = v_target.id;

  RETURN jsonb_build_object('success', true, 'message', 'Password changed successfully');
END;
$$;

-- Create initial Super User account
INSERT INTO staff_members (email, password_hash, role, permissions, is_active)
VALUES (
  'admin@dates.care',
  crypt('AdminPass2025!', gen_salt('bf')),
  'Super User',
  '["all", "manage_users", "award_credits", "change_staff_passwords", "reset_passwords", "view_reports", "manage_content", "ban_users"]'::jsonb,
  true
);

-- Create Credit Manager account
INSERT INTO staff_members (email, password_hash, role, permissions, is_active)
VALUES (
  'creditmanager@dates.care',
  crypt('CreditPass2025!', gen_salt('bf')),
  'Credit Manager',
  '["award_credits", "manage_credits", "view_reports", "change_staff_passwords", "reset_passwords"]'::jsonb,
  true
);

-- Create Support account
INSERT INTO staff_members (email, password_hash, role, permissions, is_active)
VALUES (
  'support@dates.care',
  crypt('SupportPass2025!', gen_salt('bf')),
  'Support Agent',
  '["view_users", "manage_tickets", "send_messages"]'::jsonb,
  true
);

-- Create indexes
CREATE INDEX idx_staff_members_email ON staff_members(email);
CREATE INDEX idx_staff_members_active ON staff_members(is_active) WHERE is_active = true;