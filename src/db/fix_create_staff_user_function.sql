-- Drop and recreate the create_staff_user function with correct table name

DROP FUNCTION IF EXISTS public.create_staff_user(character varying, character varying, character varying);

CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_username character varying,
  p_password character varying,
  p_name character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- ユーザー名が既に存在するか確認
  IF EXISTS (SELECT 1 FROM users WHERE username = p_username) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ユーザー名が既に存在します'
    );
  END IF;

  -- スタッフユーザーを作成
  INSERT INTO users (id, username, password, role, display_name, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    p_username,
    crypt(p_password, gen_salt('bf')),
    'staff',
    p_name,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_user_id;

  -- 成功レスポンスを返す
  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', v_user_id,
      'username', p_username,
      'password', p_password,
      'display_name', p_name,
      'role', 'staff'
    )
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.create_staff_user(character varying, character varying, character varying) TO anon;
GRANT EXECUTE ON FUNCTION public.create_staff_user(character varying, character varying, character varying) TO authenticated;
