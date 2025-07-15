-- admin_usersテーブルのroleカラムの制約を更新
ALTER TABLE admin_users
DROP CONSTRAINT IF EXISTS admin_users_role_check;

-- 新しいロール制約を追加
ALTER TABLE admin_users
ADD CONSTRAINT admin_users_role_check 
CHECK (role IN ('admin', 'staff', 'organizer', 'platinum_sponsor', 'gold_sponsor', 'agency', 'production', 'attendee', 'vip_attendee'));

-- ロールの説明テーブルを作成（オプション）
CREATE TABLE IF NOT EXISTS user_roles (
  role TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ロールの説明を挿入
INSERT INTO user_roles (role, description, display_name) VALUES
('admin', '管理者権限を持つユーザー', '管理者'),
('staff', 'イベントスタッフ', 'スタッフ'),
('organizer', 'イベント主催者', '主催者'),
('platinum_sponsor', 'プラチナスポンサー', 'プラチナスポンサー'),
('gold_sponsor', 'ゴールドスポンサー', 'ゴールドスポンサー'),
('agency', '代理店', '代理店'),
('production', '制作会社', '制作会社'),
('attendee', '一般参加者', '参加者'),
('vip_attendee', 'VIP参加者', 'VIP参加者')
ON CONFLICT (role) DO UPDATE
SET description = EXCLUDED.description,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();
