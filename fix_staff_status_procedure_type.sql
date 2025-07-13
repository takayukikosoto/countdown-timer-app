-- スタッフステータス一覧取得関数の修正（型の一致を確保）
DROP FUNCTION IF EXISTS list_all_staff_status();

CREATE OR REPLACE FUNCTION list_all_staff_status()
RETURNS TABLE(
  staff_id uuid,
  username varchar, -- textからvarcharに変更
  display_name varchar, -- textからvarcharに変更
  status varchar, -- textからvarcharに変更
  custom_status varchar, -- textからvarcharに変更
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
