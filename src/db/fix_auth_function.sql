-- Drop and recreate the check_user_password function with fixed variable naming

DROP FUNCTION IF EXISTS public.check_user_password(character varying, character varying);

CREATE OR REPLACE FUNCTION public.check_user_password(
  p_username character varying,
  p_password character varying
)
RETURNS TABLE(
  id text,
  username character varying,
  role character varying,
  token text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_token TEXT;
  v_jwt_secret TEXT;
BEGIN
  -- Get JWT secret from environment or use default
  v_jwt_secret := coalesce(
    current_setting('app.jwt_secret', true),
    'super-secret-jwt-token-with-at-least-32-characters-long'
  );

  -- Find user and verify password using table alias to avoid ambiguity
  SELECT u.id, u.username, u.role, u.password
  INTO v_user
  FROM public.users u
  WHERE u.username = p_username;

  -- Check if user exists and password is correct
  IF v_user.id IS NOT NULL AND crypt(p_password, v_user.password) = v_user.password THEN
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
      v_user.id::text,
      v_user.username,
      v_user.role,
      v_token;
  ELSE
    -- Return empty result for invalid credentials
    RETURN;
  END IF;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.check_user_password(character varying, character varying) TO anon;
GRANT EXECUTE ON FUNCTION public.check_user_password(character varying, character varying) TO authenticated;
