-- Create secrets table for application settings
CREATE TABLE IF NOT EXISTS secrets (
  name VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store JWT secret in database settings (permanently)
INSERT INTO secrets (name, value) VALUES ('jwt_secret', 'super-secret-jwt-token-with-at-least-32-characters-long')
ON CONFLICT (name) DO UPDATE SET value = 'super-secret-jwt-token-with-at-least-32-characters-long';

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS (Row Level Security) policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create policy for service role only
CREATE POLICY "Service role can manage all users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to check password
CREATE OR REPLACE FUNCTION check_user_password(
  p_username VARCHAR,
  p_password VARCHAR
) RETURNS TABLE (
  id UUID,
  username VARCHAR,
  role VARCHAR,
  token TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user admin_users;
  v_token TEXT;
  v_jwt_secret TEXT;
BEGIN
  -- Find user by username
  SELECT * INTO v_user FROM admin_users WHERE username = p_username;
  
  -- Check if user exists and password matches
  IF v_user.id IS NOT NULL AND 
     crypt(p_password, v_user.password_hash) = v_user.password_hash THEN
    
    -- Get JWT secret from secrets table or use default
    SELECT value INTO v_jwt_secret FROM secrets WHERE name = 'jwt_secret';
    IF v_jwt_secret IS NULL THEN
      v_jwt_secret := 'super-secret-jwt-token-with-at-least-32-characters-long';
    END IF;
    
    -- Generate JWT token
    v_token := extensions.sign(
      json_build_object(
        'role', v_user.role,
        'user_id', v_user.id::TEXT,
        'username', v_user.username,
        'exp', extract(epoch from now() + interval '24 hours')::integer
      ),
      v_jwt_secret
    );
    
    RETURN QUERY SELECT 
      v_user.id, 
      v_user.username, 
      v_user.role, 
      v_token;
  ELSE
    -- Return empty result for invalid credentials
    RETURN;
  END IF;
END;
$$;

-- Create function to verify password
CREATE OR REPLACE FUNCTION verify_password(
  password TEXT,
  hash TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$;

-- Create initial admin user (username: admin, password: admin123)
INSERT INTO admin_users (username, password_hash, role)
VALUES ('admin', crypt('admin123', gen_salt('bf')), 'admin'),
       ('staff', crypt('staff456', gen_salt('bf')), 'staff')
ON CONFLICT (username) DO NOTHING;
