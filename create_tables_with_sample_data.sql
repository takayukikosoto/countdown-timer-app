-- タイマーテーブルの作成
CREATE TABLE IF NOT EXISTS timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  duration INTEGER NOT NULL,
  state TEXT NOT NULL,
  mode TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  elapsed_time INTEGER,
  show_seconds BOOLEAN NOT NULL DEFAULT true,
  play_sound BOOLEAN NOT NULL DEFAULT true,
  color TEXT NOT NULL DEFAULT '#3498db',
  overtime_color TEXT NOT NULL DEFAULT '#e74c3c',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 現在のタイマーテーブルの作成
CREATE TABLE IF NOT EXISTS current_timer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_id UUID REFERENCES timers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- タイマーメッセージテーブルの作成
CREATE TABLE IF NOT EXISTS timer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_id UUID REFERENCES timers(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#ffffff',
  flash BOOLEAN NOT NULL DEFAULT false,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- タイマーアクションテーブルの作成
CREATE TABLE IF NOT EXISTS timer_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_id UUID REFERENCES timers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  trigger_time INTEGER NOT NULL,
  message TEXT,
  color TEXT,
  executed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- タイマーアクション実行結果テーブルの作成
CREATE TABLE IF NOT EXISTS timer_action_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID REFERENCES timer_actions(id) ON DELETE CASCADE,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL,
  message TEXT
);

-- updated_atを自動更新するためのトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_timers_updated_at
BEFORE UPDATE ON timers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_current_timer_updated_at
BEFORE UPDATE ON current_timer
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timer_messages_updated_at
BEFORE UPDATE ON timer_messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timer_actions_updated_at
BEFORE UPDATE ON timer_actions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLSポリシーの設定
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_timer ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_action_results ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全ユーザーが読み取り可能）
CREATE POLICY timers_read_policy ON timers
  FOR SELECT USING (true);

CREATE POLICY current_timer_read_policy ON current_timer
  FOR SELECT USING (true);

CREATE POLICY timer_messages_read_policy ON timer_messages
  FOR SELECT USING (true);

CREATE POLICY timer_actions_read_policy ON timer_actions
  FOR SELECT USING (true);

CREATE POLICY timer_action_results_read_policy ON timer_action_results
  FOR SELECT USING (true);

-- 書き込みポリシー（認証済みユーザーのみ）
CREATE POLICY timers_write_policy ON timers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY current_timer_write_policy ON current_timer
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY timer_messages_write_policy ON timer_messages
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY timer_actions_write_policy ON timer_actions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY timer_action_results_write_policy ON timer_action_results
  FOR ALL USING (auth.role() = 'authenticated');

-- サンプルデータの挿入
-- タイマーのサンプルデータ
INSERT INTO timers (title, type, duration, state, mode, show_seconds, play_sound, color, overtime_color, message)
VALUES
  ('会議タイマー', 'countdown', 1800, 'stopped', 'normal', true, true, '#3498db', '#e74c3c', '会議時間です'),
  ('休憩タイマー', 'countdown', 600, 'stopped', 'normal', true, true, '#2ecc71', '#e74c3c', '休憩時間です'),
  ('プレゼンタイマー', 'countdown', 1200, 'stopped', 'normal', true, true, '#9b59b6', '#e74c3c', 'プレゼン時間です');

-- 現在のタイマーを設定
INSERT INTO current_timer (timer_id)
SELECT id FROM timers WHERE title = '会議タイマー' LIMIT 1;

-- タイマーメッセージのサンプルデータ
INSERT INTO timer_messages (timer_id, text, color, flash, timestamp)
SELECT 
  id, 
  '会議を開始します', 
  '#ffffff', 
  false, 
  EXTRACT(EPOCH FROM NOW()) * 1000
FROM timers 
WHERE title = '会議タイマー' 
LIMIT 1;

-- タイマーアクションのサンプルデータ
INSERT INTO timer_actions (timer_id, type, trigger_time, message, color)
SELECT 
  id, 
  'message', 
  300, 
  '残り5分です', 
  '#ffcc00'
FROM timers 
WHERE title = '会議タイマー' 
LIMIT 1;

INSERT INTO timer_actions (timer_id, type, trigger_time, message, color)
SELECT 
  id, 
  'color', 
  60, 
  NULL, 
  '#ff0000'
FROM timers 
WHERE title = '会議タイマー' 
LIMIT 1;
