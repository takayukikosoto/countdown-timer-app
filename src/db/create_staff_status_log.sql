-- スタッフステータス履歴テーブルの作成
CREATE TABLE IF NOT EXISTS staff_status_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID NOT NULL REFERENCES admin_users(id),
  status TEXT NOT NULL,
  custom_status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_staff_id FOREIGN KEY (staff_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_staff_status_log_staff_id ON staff_status_log(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_status_log_updated_at ON staff_status_log(updated_at);

-- スタッフステータス更新時に履歴を記録するトリガー関数
CREATE OR REPLACE FUNCTION log_staff_status_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO staff_status_log (staff_id, status, custom_status, updated_at)
  VALUES (NEW.staff_id, NEW.status, NEW.custom_status, NEW.updated_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成（スタッフステータス更新時に履歴を記録）
DROP TRIGGER IF EXISTS trigger_log_staff_status_update ON staff_status;
CREATE TRIGGER trigger_log_staff_status_update
AFTER INSERT OR UPDATE ON staff_status
FOR EACH ROW
EXECUTE FUNCTION log_staff_status_update();
