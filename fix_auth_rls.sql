-- 方法1: admin_users テーブルの RLS を無効化
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- または方法2: RLSを維持しつつ、匿名ユーザーに読み取り権限を付与
-- CREATE POLICY "allow anon read" ON admin_users
--   FOR SELECT
--   USING (true);

-- 確認クエリ
SELECT * FROM admin_users LIMIT 5;
