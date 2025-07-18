-- スタッフステータス用テーブルの作成
CREATE TABLE IF NOT EXISTS staff_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  status VARCHAR(255) NOT NULL DEFAULT '出発前',
  custom_status VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- スタッフステータスの取得関数
CREATE OR REPLACE FUNCTION get_staff_status(p_staff_id UUID)
RETURNS TABLE (
  id UUID,
  staff_id UUID,
  status VARCHAR,
  custom_status VARCHAR,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.staff_id,
    s.status,
    s.custom_status,
    s.updated_at
  FROM 
    staff_status s
  WHERE 
    s.staff_id = p_staff_id
  ORDER BY 
    s.updated_at DESC
  LIMIT 1;
END;
$$;

-- スタッフステータスの更新関数
CREATE OR REPLACE FUNCTION update_staff_status(
  p_staff_id UUID,
  p_status VARCHAR,
  p_custom_status VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status_id UUID;
BEGIN
  -- スタッフが存在するか確認
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'スタッフが存在しません'
    );
  END IF;

  -- 既存のステータスがあるか確認
  IF EXISTS (SELECT 1 FROM staff_status WHERE staff_id = p_staff_id) THEN
    -- 既存のステータスを更新
    UPDATE staff_status
    SET 
      status = p_status,
      custom_status = p_custom_status,
      updated_at = NOW()
    WHERE 
      staff_id = p_staff_id
    RETURNING id INTO v_status_id;
  ELSE
    -- 新しいステータスを作成
    INSERT INTO staff_status (staff_id, status, custom_status)
    VALUES (p_staff_id, p_status, p_custom_status)
    RETURNING id INTO v_status_id;
  END IF;

  -- 成功レスポンスを返す
  RETURN jsonb_build_object(
    'success', true,
    'status_id', v_status_id
  );
END;
$$;

-- 全スタッフのステータス一覧取得関数
CREATE OR REPLACE FUNCTION list_all_staff_status()
RETURNS TABLE (
  staff_id UUID,
  username VARCHAR,
  display_name VARCHAR,
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
