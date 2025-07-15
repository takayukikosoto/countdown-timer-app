-- スタッフステータス一覧取得関数の修正
-- staff_idカラムの曖昧さを解消するために、テーブル名を明示的に指定

DROP FUNCTION IF EXISTS list_all_staff_status();

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
    SELECT DISTINCT ON (staff_status.staff_id) 
      staff_status.staff_id, 
      staff_status.status, 
      staff_status.custom_status, 
      staff_status.updated_at
    FROM 
      staff_status
    ORDER BY 
      staff_status.staff_id, staff_status.updated_at DESC
  ) s ON u.id = s.staff_id
  WHERE 
    u.role = 'staff'
  ORDER BY 
    COALESCE(s.updated_at, u.created_at) DESC;
END;
$$;
