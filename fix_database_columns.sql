-- 不足しているカラムを admin_users テーブルに追加

-- company カラムを追加（まだ存在しない場合）
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS company VARCHAR(255);

-- staff_position カラムを追加（まだ存在しない場合）
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS staff_position VARCHAR(100);

-- staff_level カラムを追加（まだ存在しない場合）
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS staff_level VARCHAR(100);

-- カラムにコメントを追加
COMMENT ON COLUMN admin_users.company IS '所属会社名';
COMMENT ON COLUMN admin_users.staff_position IS 'ポジション（制作・進行・運営・音響・映像など）';
COMMENT ON COLUMN admin_users.staff_level IS 'レベル（ディレクター・AD・スタッフ・オペレーターなど）';

-- 既存のユーザーにデフォルト値を設定
UPDATE admin_users 
SET 
  company = CASE 
    WHEN role = 'admin' THEN '管理者'
    ELSE '未設定'
  END,
  staff_position = CASE 
    WHEN role = 'admin' THEN '管理者'
    ELSE '未設定'
  END,
  staff_level = CASE 
    WHEN role = 'admin' THEN '管理者'
    ELSE '未設定'
  END
WHERE company IS NULL OR staff_position IS NULL OR staff_level IS NULL;

-- 初期管理者ユーザーを作成（存在しない場合）
INSERT INTO admin_users (username, password_hash, role, display_name, company, staff_position, staff_level)
VALUES 
  ('admin', crypt('admin123', gen_salt('bf')), 'admin', '管理者', '管理者', '管理者', '管理者'),
  ('staff', crypt('staff456', gen_salt('bf')), 'staff', 'スタッフ', 'テスト会社', '制作', 'スタッフ')
ON CONFLICT (username) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  company = EXCLUDED.company,
  staff_position = EXCLUDED.staff_position,
  staff_level = EXCLUDED.staff_level;
