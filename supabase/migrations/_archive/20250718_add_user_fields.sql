-- Add missing columns to admin_users table
-- This migration adds company, position, level, and display_name columns

-- Add display_name column if it doesn't exist
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Add company column if it doesn't exist
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- Add staff_position column if it doesn't exist
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS staff_position VARCHAR(100);

-- Add staff_level column if it doesn't exist
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS staff_level VARCHAR(100);

-- Update existing users to have display_name same as username if null
UPDATE admin_users 
SET display_name = username 
WHERE display_name IS NULL;

-- Create or replace the users view for compatibility
CREATE OR REPLACE VIEW users AS
SELECT 
  id,
  username,
  display_name,
  password_hash as password,
  role,
  company,
  staff_position as position,
  staff_level as level,
  created_at,
  updated_at
FROM admin_users;

-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS check_user_password(VARCHAR, VARCHAR);

-- Update the check_user_password function to return display_name
CREATE OR REPLACE FUNCTION check_user_password(
  p_username VARCHAR,
  p_password VARCHAR
) RETURNS TABLE (
  id UUID,
  username VARCHAR,
  display_name VARCHAR,
  role VARCHAR,
  token TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user admin_users;
  v_token TEXT;
  v_jwt_secret TEXT;
BEGIN
  -- Find user by username
  SELECT * INTO v_user FROM admin_users WHERE admin_users.username = p_username;
  
  -- Check if user exists and password matches
  IF v_user.id IS NOT NULL AND 
     crypt(p_password, v_user.password_hash) = v_user.password_hash THEN
    
    -- Get JWT secret from database
    SELECT value INTO v_jwt_secret FROM secrets WHERE name = 'jwt_secret';
    
    -- Generate JWT token (simplified - in production use proper JWT library)
    v_token := 'jwt_' || encode(digest(v_user.id::text || v_user.username || v_user.role || extract(epoch from now()), 'sha256'), 'hex');
    
    -- Return user info with token
    RETURN QUERY SELECT 
      v_user.id,
      v_user.username,
      v_user.display_name,
      v_user.role,
      v_token;
  END IF;
  
  -- Return empty if authentication failed
  RETURN;
END;
$$;

-- Update the update_user_password function to work with admin_users table
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id INTEGER,
  p_new_password TEXT
)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  role TEXT,
  updated_at TIMESTAMP
) AS $$
BEGIN
  -- Convert INTEGER to UUID for compatibility
  DECLARE
    v_user_uuid UUID;
  BEGIN
    -- Try to find user by converting integer ID to UUID lookup
    -- This is a workaround for the ID type mismatch
    SELECT admin_users.id INTO v_user_uuid 
    FROM admin_users 
    WHERE admin_users.id::text = p_user_id::text
    OR admin_users.username = p_user_id::text;
    
    -- If no user found, return empty
    IF v_user_uuid IS NULL THEN
      RETURN;
    END IF;

    -- Update password with hash
    UPDATE admin_users 
    SET 
      password_hash = crypt(p_new_password, gen_salt('bf')),
      updated_at = NOW()
    WHERE admin_users.id = v_user_uuid;

    -- Return updated user info
    RETURN QUERY
    SELECT 
      admin_users.id,
      admin_users.username,
      admin_users.display_name,
      admin_users.role,
      admin_users.updated_at
    FROM admin_users
    WHERE admin_users.id = v_user_uuid;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
