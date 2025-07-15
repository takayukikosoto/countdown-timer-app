-- スタッフステータス履歴を取得するストアドプロシージャ
CREATE OR REPLACE FUNCTION get_staff_status_history(p_staff_id UUID, p_date TEXT)
RETURNS TABLE (
  staff_id UUID,
  status TEXT,
  custom_status TEXT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.staff_id,
    ss.status,
    ss.custom_status,
    ss.updated_at
  FROM 
    staff_status_log ss
  WHERE 
    ss.staff_id = p_staff_id AND
    DATE(ss.updated_at AT TIME ZONE 'Asia/Tokyo') = p_date::DATE
  ORDER BY 
    ss.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
