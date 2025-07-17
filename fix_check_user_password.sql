-- Fix ambiguous column reference in check_user_password
CREATE OR REPLACE FUNCTION public.check_user_password(
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
  -- Find user by username (qualify column name)
  SELECT * INTO v_user FROM admin_users WHERE admin_users.username = p_username;

  IF v_user.id IS NOT NULL AND crypt(p_password, v_user.password_hash) = v_user.password_hash THEN
    SELECT value INTO v_jwt_secret FROM secrets WHERE name = 'jwt_secret';
    IF v_jwt_secret IS NULL THEN
      v_jwt_secret := 'super-secret-jwt-token-with-at-least-32-characters-long';
    END IF;

    v_token := extensions.sign(
      json_build_object(
        'role', v_user.role,
        'user_id', v_user.id::TEXT,
        'username', v_user.username,
        'exp', extract(epoch FROM now() + interval '24 hours')::integer
      ),
      v_jwt_secret
    );

    RETURN QUERY SELECT v_user.id, v_user.username, v_user.role, v_token;
  ELSE
    RETURN;
  END IF;
END;
$$;
