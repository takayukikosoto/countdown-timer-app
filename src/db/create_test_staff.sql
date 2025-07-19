-- Create test staff accounts with known credentials

-- Insert test staff users
INSERT INTO users (id, username, display_name, password, role, company, position, level, created_at, updated_at)
VALUES 
  (
    gen_random_uuid(),
    'teststaff1',
    'テストスタッフ1',
    crypt('testpass123', gen_salt('bf')),
    'staff',
    'テスト会社',
    'スタッフ',
    'ジュニア',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'teststaff2', 
    'テストスタッフ2',
    crypt('testpass456', gen_salt('bf')),
    'staff',
    'サンプル株式会社',
    'アシスタント',
    'シニア',
    NOW(),
    NOW()
  ),
  (
    gen_random_uuid(),
    'manager1',
    'マネージャー1',
    crypt('manager123', gen_salt('bf')),
    'staff',
    'マネジメント会社',
    'マネージャー',
    'シニア',
    NOW(),
    NOW()
  )
ON CONFLICT (username) DO NOTHING;

-- Display created users
SELECT 
  username,
  display_name,
  role,
  company,
  position,
  level,
  created_at
FROM users 
WHERE username IN ('teststaff1', 'teststaff2', 'manager1')
ORDER BY username;
