/*
  # Fix update_user_activity trigger function

  The function has an empty search_path which prevents it from finding user_profiles table.
  This migration fixes the search path to include public schema.
*/

-- Drop and recreate the function with correct search path
DROP FUNCTION IF EXISTS update_user_activity() CASCADE;

CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update activity for the sender (NEW.sender_id exists in mail_messages)
  UPDATE user_profiles 
  SET last_active = now(), is_online = true
  WHERE user_id = NEW.sender_id;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_user_activity_on_mail_message ON mail_messages;

CREATE TRIGGER update_user_activity_on_mail_message
  AFTER INSERT ON mail_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_user_activity();