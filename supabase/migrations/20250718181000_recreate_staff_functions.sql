-- Recreate staff user functions after DB reset

-- スタッフユーザー作成用の関数
CREATE OR REPLACE FUNCTION create_staff_user(
  p_username VARCHAR,
  p_password VARCHAR,
  p_name VARCHAR
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- ユーザー名が既に存在するか確認
  IF EXISTS (SELECT 1 FROM admin_users WHERE username = p_username) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ユーザー名が既に存在します'
    );
  END IF;

  -- スタッフユーザーを作成
  INSERT INTO admin_users (username, password_hash, role, display_name)
  VALUES (
    p_username,
    crypt(p_password, gen_salt('bf')),
    'staff',
    p_name
  )
  RETURNING id INTO v_user_id;

  -- 成功レスポンスを返す
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id
  );
END;
$$;

-- スタッフユーザー一覧取得関数
CREATE OR REPLACE FUNCTION list_staff_users()
RETURNS TABLE (
  id UUID,
  username VARCHAR,
  display_name VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.display_name,
    u.created_at
  FROM 
    admin_users u
  WHERE 
    u.role = 'staff'
  ORDER BY 
    u.created_at DESC;
END;
$$;

-- スタッフユーザー削除関数
CREATE OR REPLACE FUNCTION delete_staff_user(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  -- ユーザーのロールを確認
  SELECT role INTO v_role FROM admin_users WHERE id = p_user_id;
  
  -- 管理者は削除できない
  IF v_role = 'admin' THEN
    RETURN FALSE;
  END IF;
  
  -- スタッフユーザーを削除
  DELETE FROM admin_users WHERE id = p_user_id AND role = 'staff';
  
  RETURN FOUND;
END;
$$;
