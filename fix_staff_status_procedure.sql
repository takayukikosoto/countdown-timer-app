-- スタッフステータス一覧取得関数の修正
CREATE OR REPLACE FUNCTION list_all_staff_status()
RETURNS TABLE(
  staff_id uuid,
  username text,
  display_name text,
  status text,
  custom_status text,
  updated_at timestamptz
) AS $$
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
    SELECT DISTINCT ON (s_inner.staff_id)
      s_inner.staff_id,
      s_inner.status,
      s_inner.custom_status,
      s_inner.updated_at
    FROM
      staff_status s_inner
    ORDER BY
      s_inner.staff_id, s_inner.updated_at DESC
  ) s ON u.id = s.staff_id
  WHERE
    u.role = 'staff'
  ORDER BY
    COALESCE(s.updated_at, u.created_at) DESC;
END;
$$ LANGUAGE plpgsql;
