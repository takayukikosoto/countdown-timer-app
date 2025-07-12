-- イベントステータスを管理するテーブルを作成
CREATE TABLE IF NOT EXISTS event_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status TEXT NOT NULL DEFAULT '準備中',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシーを設定
ALTER TABLE event_status ENABLE ROW LEVEL SECURITY;

-- 管理者のみが更新可能なポリシーを作成
CREATE POLICY "管理者のみ更新可能" ON event_status
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 誰でも閲覧可能なポリシーを作成
CREATE POLICY "誰でも閲覧可能" ON event_status
  FOR SELECT
  USING (true);

-- 初期データを挿入（常に1行のみ存在する設計）
INSERT INTO event_status (status)
VALUES ('準備中')
ON CONFLICT DO NOTHING;

-- 関数: ステータスを更新する
CREATE OR REPLACE FUNCTION update_event_status(new_status TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_status TEXT;
BEGIN
  -- テーブルが空の場合は初期レコードを挿入
  INSERT INTO event_status (status)
  SELECT '準備中'
  WHERE NOT EXISTS (SELECT 1 FROM event_status LIMIT 1);
  
  -- ステータスを更新（常に最初の行を更新）
  UPDATE event_status
  SET status = new_status,
      updated_at = NOW()
  WHERE id = (SELECT id FROM event_status ORDER BY created_at ASC LIMIT 1)
  RETURNING status INTO updated_status;
  
  RETURN updated_status;
END;
$$;

-- 関数: 現在のステータスを取得する
CREATE OR REPLACE FUNCTION get_current_status()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  current_status TEXT;
BEGIN
  -- テーブルが空の場合は初期レコードを挿入
  INSERT INTO event_status (status)
  SELECT '準備中'
  WHERE NOT EXISTS (SELECT 1 FROM event_status LIMIT 1);
  
  -- 最初のレコードのステータスを取得
  SELECT status INTO current_status
  FROM event_status
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN COALESCE(current_status, '準備中');
END;
$$;
