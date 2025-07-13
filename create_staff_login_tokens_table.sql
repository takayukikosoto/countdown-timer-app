-- スタッフQRコードログイン用のトークンテーブルを作成
CREATE TABLE IF NOT EXISTS staff_login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_staff_login_tokens_staff_id ON staff_login_tokens(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_login_tokens_token ON staff_login_tokens(token);

-- 期限切れのトークンを削除する関数
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM staff_login_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 毎日実行するスケジュールを設定
SELECT cron.schedule('0 0 * * *', $$SELECT cleanup_expired_tokens()$$);

-- コメント
COMMENT ON TABLE staff_login_tokens IS 'スタッフのQRコードログイン用トークンを保存するテーブル';
COMMENT ON COLUMN staff_login_tokens.staff_id IS 'スタッフのID (admin_usersテーブルの外部キー)';
COMMENT ON COLUMN staff_login_tokens.token IS 'QRコードに埋め込まれるログイントークン';
COMMENT ON COLUMN staff_login_tokens.expires_at IS 'トークンの有効期限';
COMMENT ON COLUMN staff_login_tokens.last_used_at IS '最後に使用された日時';
