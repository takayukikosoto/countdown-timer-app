-- ロールごとのユーザー数を取得する関数
CREATE OR REPLACE FUNCTION get_role_counts()
RETURNS TABLE (
  role TEXT,
  count BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT role, COUNT(*) as count
  FROM admin_users
  GROUP BY role
  ORDER BY count DESC;
$$;

-- 会社ごとのユーザー数を取得する関数
CREATE OR REPLACE FUNCTION get_company_counts()
RETURNS TABLE (
  company TEXT,
  count BIGINT
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT company, COUNT(*) as count
  FROM admin_users
  WHERE company IS NOT NULL
  GROUP BY company
  ORDER BY count DESC
  LIMIT 5;
$$;
