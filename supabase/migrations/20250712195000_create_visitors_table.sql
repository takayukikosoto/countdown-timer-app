-- 来場者数を管理するテーブルを作成
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  count INTEGER NOT NULL DEFAULT 0,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシーを設定
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- 管理者のみが更新可能なポリシーを作成
CREATE POLICY "管理者のみ更新可能" ON visitors
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 誰でも閲覧可能なポリシーを作成
CREATE POLICY "誰でも閲覧可能" ON visitors
  FOR SELECT
  USING (true);

-- 初期データを挿入
INSERT INTO visitors (count, event_date)
VALUES (0, CURRENT_DATE)
ON CONFLICT (event_date) DO NOTHING;

-- 関数: 来場者数を増加させる
CREATE OR REPLACE FUNCTION increment_visitor_count(increment_by INTEGER DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- 今日の日付のレコードがなければ作成
  INSERT INTO visitors (count, event_date)
  VALUES (0, CURRENT_DATE)
  ON CONFLICT (event_date) DO NOTHING;
  
  -- 来場者数を更新
  UPDATE visitors
  SET count = count + increment_by,
      updated_at = NOW()
  WHERE event_date = CURRENT_DATE
  RETURNING count INTO current_count;
  
  RETURN current_count;
END;
$$;

-- 関数: 来場者数をリセットする
CREATE OR REPLACE FUNCTION reset_visitor_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- 来場者数をリセット
  UPDATE visitors
  SET count = 0,
      updated_at = NOW()
  WHERE event_date = CURRENT_DATE
  RETURNING count INTO current_count;
  
  RETURN current_count;
END;
$$;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS visitors_event_date_idx ON visitors (event_date);
