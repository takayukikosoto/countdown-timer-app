-- 管理者アカウント作成用SQL
-- pgcryptoを使用してパスワードをハッシュ化

-- ユーザー名: admin_master
-- パスワード: Master2025!
-- 表示名: マスター管理者
-- ロール: admin

INSERT INTO admin_users (
  username, 
  password_hash, 
  display_name, 
  role, 
  created_at, 
  updated_at
)
VALUES (
  'admin_master',
  crypt('Master2025!', gen_salt('bf', 10)),
  'マスター管理者',
  'admin',
  NOW(),
  NOW()
);

-- 確認用クエリ
SELECT id, username, display_name, role FROM admin_users WHERE username = 'admin_master';
