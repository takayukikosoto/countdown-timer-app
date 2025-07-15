-- admin_usersテーブルに所属・ポジション・レベルのカラムを追加
ALTER TABLE admin_users
ADD COLUMN IF NOT EXISTS company VARCHAR(255),
ADD COLUMN IF NOT EXISTS position VARCHAR(100),
ADD COLUMN IF NOT EXISTS level VARCHAR(100);

-- コメント追加
COMMENT ON COLUMN admin_users.company IS '所属会社名';
COMMENT ON COLUMN admin_users.position IS 'ポジション（制作・進行・運営・音響・映像など）';
COMMENT ON COLUMN admin_users.level IS 'レベル（ディレクター・AD・スタッフ・オペレーターなど）';

-- スタッフ作成関数の更新
CREATE OR REPLACE FUNCTION create_staff_user(
  p_username VARCHAR,
  p_display_name VARCHAR,
  p_company VARCHAR DEFAULT NULL,
  p_position VARCHAR DEFAULT NULL,
  p_level VARCHAR DEFAULT NULL
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
    position,
    level
  )
  VALUES (
    p_username, 
    crypt(v_password, gen_salt('bf')), 
    'staff', 
    p_display_name,
    p_company,
    p_position,
    p_level
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
      'position', p_position,
      'level', p_level
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
  position VARCHAR,
  level VARCHAR,
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
    u.position,
    u.level,
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
  position VARCHAR,
  level VARCHAR,
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
    u.position,
    u.level,
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
