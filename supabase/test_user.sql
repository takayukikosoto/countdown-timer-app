-- テスト用ユーザーの追加
INSERT INTO admin_users (username, password_hash, role)
VALUES 
  ('testuser', crypt('test123', gen_salt('bf')), 'staff'),
  ('testadmin', crypt('admin456', gen_salt('bf')), 'admin')
ON CONFLICT (username) DO NOTHING;

-- 確認クエリ
SELECT id, username, role FROM admin_users;
