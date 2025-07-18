-- パスワード更新用のRPC関数
-- 管理者がユーザーのパスワードを再発行する際に使用

CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id INTEGER,
  p_new_password TEXT
)
RETURNS TABLE(
  id INTEGER,
  username TEXT,
  display_name TEXT,
  role TEXT,
  updated_at TIMESTAMP
) AS $$
BEGIN
  -- ユーザーの存在確認
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = p_user_id) THEN
    RETURN;
  END IF;

  -- パスワードをハッシュ化して更新
  UPDATE users 
  SET 
    password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE users.id = p_user_id;

  -- 更新されたユーザー情報を返す
  RETURN QUERY
  SELECT 
    users.id,
    users.username,
    users.display_name,
    users.role,
    users.updated_at
  FROM users
  WHERE users.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
