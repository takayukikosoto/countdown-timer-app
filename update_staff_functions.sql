-- 既存の関数を削除
DROP FUNCTION IF EXISTS create_staff_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS create_staff_user(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS list_staff_users();
DROP FUNCTION IF EXISTS list_all_staff_status();

-- スタッフ作成関数の更新
CREATE OR REPLACE FUNCTION create_staff_user(
  p_username VARCHAR,
  p_display_name VARCHAR,
  p_company VARCHAR DEFAULT NULL,
  p_staff_position VARCHAR DEFAULT NULL,
  p_staff_level VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_password VARCHAR;
  v_user_id UUID;
BEGIN
  -- ランダムパスワードを生成（8文字）
  v_password := substring(md5(random()::text), 1, 8);
  
  -- ユーザー名が既に存在するか確認
  IF EXISTS (SELECT 1 FROM admin_users WHERE username = p_username) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ユーザー名が既に存在します'
    );
  END IF;
  
  -- スタッフユーザーを作成
  INSERT INTO admin_users (
    username, 
    password_hash, 
    role, 
    display_name,
    company,
    staff_position,
    staff_level
  )
  VALUES (
    p_username, 
    crypt(v_password, gen_salt('bf')), 
    'staff', 
    p_display_name,
    p_company,
    p_staff_position,
    p_staff_level
  )
  RETURNING id INTO v_user_id;
  
  -- 成功レスポンスを返す
  RETURN jsonb_build_object(
    'success', true,
    'staff', jsonb_build_object(
      'id', v_user_id,
      'username', p_username,
      'password', v_password,
      'name', p_display_name,
      'company', p_company,
      'position', p_staff_position,
      'level', p_staff_level
    )
  );
END;
$$;

-- スタッフ一覧取得関数の更新
CREATE OR REPLACE FUNCTION list_staff_users()
RETURNS TABLE (
  id UUID,
  username VARCHAR,
  display_name VARCHAR,
  company VARCHAR,
  staff_position VARCHAR,
  staff_level VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.display_name,
    u.company,
    u.staff_position,
    u.staff_level,
    u.created_at
  FROM 
    admin_users u
  WHERE 
    u.role = 'staff'
  ORDER BY 
    u.created_at DESC;
END;
$$;

-- スタッフステータス一覧取得関数の更新
CREATE OR REPLACE FUNCTION list_all_staff_status()
RETURNS TABLE (
  staff_id UUID,
  username VARCHAR,
  display_name VARCHAR,
  company VARCHAR,
  staff_position VARCHAR,
  staff_level VARCHAR,
  status VARCHAR,
  custom_status VARCHAR,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as staff_id,
    u.username,
    u.display_name,
    u.company,
    u.staff_position,
    u.staff_level,
    COALESCE(s.status, '出発前') as status,
    s.custom_status,
    COALESCE(s.updated_at, u.created_at) as updated_at
  FROM 
    admin_users u
  LEFT JOIN (
    SELECT DISTINCT ON (staff_id) 
      staff_id, 
      status, 
      custom_status, 
      updated_at
    FROM 
      staff_status
    ORDER BY 
      staff_id, updated_at DESC
  ) s ON u.id = s.staff_id
  WHERE 
    u.role = 'staff'
  ORDER BY 
    COALESCE(s.updated_at, u.created_at) DESC;
END;
$$;
