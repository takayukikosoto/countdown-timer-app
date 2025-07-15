-- 既存のトリガーと関数を削除
DROP TRIGGER IF EXISTS staff_status_history_trigger ON staff_status;
DROP FUNCTION IF EXISTS record_staff_status_history();
DROP FUNCTION IF EXISTS get_staff_status_history(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_staff_status_timestamp(UUID, VARCHAR);

-- 既存のテーブルを削除して再作成
DROP TABLE IF EXISTS staff_status_history;

-- スタッフステータス履歴テーブルの作成
CREATE TABLE IF NOT EXISTS staff_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  status VARCHAR(255) NOT NULL,
  custom_status VARCHAR(255),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- メタデータ
  notes TEXT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- インデックスの作成（検索パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_staff_status_history_staff_id ON staff_status_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_status_history_status ON staff_status_history(status);
CREATE INDEX IF NOT EXISTS idx_staff_status_history_recorded_at ON staff_status_history(recorded_at);

-- ステータス変更時に履歴を自動記録するトリガー関数
CREATE OR REPLACE FUNCTION record_staff_status_history()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータス変更履歴を記録
  INSERT INTO staff_status_history (staff_id, status, custom_status)
  VALUES (NEW.staff_id, NEW.status, NEW.custom_status);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの設定
CREATE TRIGGER staff_status_history_trigger
AFTER INSERT OR UPDATE ON staff_status
FOR EACH ROW
EXECUTE FUNCTION record_staff_status_history();

-- スタッフのステータス履歴を取得する関数
CREATE OR REPLACE FUNCTION get_staff_status_history(
  p_staff_id UUID,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  staff_id UUID,
  status VARCHAR,
  custom_status VARCHAR,
  recorded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.staff_id,
    h.status,
    h.custom_status,
    h.recorded_at,
    h.notes
  FROM 
    staff_status_history h
  WHERE 
    h.staff_id = p_staff_id
  ORDER BY 
    h.recorded_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- スタッフの特定ステータスへの変更時刻を取得する関数
CREATE OR REPLACE FUNCTION get_staff_status_timestamp(
  p_staff_id UUID,
  p_status VARCHAR
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recorded_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT recorded_at INTO v_recorded_at
  FROM staff_status_history
  WHERE staff_id = p_staff_id AND status = p_status
  ORDER BY recorded_at DESC
  LIMIT 1;
  
  RETURN v_recorded_at;
END;
$$;

-- コメント
COMMENT ON TABLE staff_status_history IS 'スタッフのステータス変更履歴を記録するテーブル';
COMMENT ON COLUMN staff_status_history.staff_id IS 'スタッフのID';
COMMENT ON COLUMN staff_status_history.status IS 'ステータス（出発前、出発OK、到着、勤務中、業務終了、カスタム）';
COMMENT ON COLUMN staff_status_history.custom_status IS 'カスタムステータスの内容';
COMMENT ON COLUMN staff_status_history.recorded_at IS 'ステータス変更時刻';
COMMENT ON COLUMN staff_status_history.notes IS '備考・メモ';
COMMENT ON COLUMN staff_status_history.created_by IS 'ステータスを変更した管理者（管理者が変更した場合）';
