# Supabaseバックアップ復元手順

## 1. Supabase Studioを開く

1. ブラウザで [http://127.0.0.1:54323](http://127.0.0.1:54323) にアクセス
2. 「SQL Editor」タブをクリック

## 2. バックアップファイルの内容を分割して実行

バックアップファイル（`supabase_backup_20250716_132611.sql`）が大きすぎるため、必要な部分だけを抽出して実行します。

### 2.1 テーブル構造の復元

以下のSQLをコピーしてSQL Editorに貼り付け、実行します：

```sql
-- admin_usersテーブルの作成（存在しない場合）
CREATE TABLE IF NOT EXISTS public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'staff'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    display_name character varying(255),
    company character varying(255),
    staff_position character varying(100),
    staff_level character varying(100)
);

-- テーブルの所有者設定
ALTER TABLE public.admin_users OWNER TO postgres;

-- カラムコメントの追加
COMMENT ON COLUMN public.admin_users.company IS '所属会社名';
COMMENT ON COLUMN public.admin_users.staff_position IS 'ポジション（制作・進行・運営・音響・映像など）';
COMMENT ON COLUMN public.admin_users.staff_level IS 'レベル（ディレクター・AD・スタッフ・オペレーターなど）';

-- RLS（行レベルセキュリティ）の有効化
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- サービスロール用のポリシー作成
CREATE POLICY "Service role can manage all users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');
```

### 2.2 初期ユーザーの作成

```sql
-- 初期管理者ユーザーの作成
INSERT INTO admin_users (username, password_hash, role, display_name, company, staff_position, staff_level)
VALUES 
  ('admin', crypt('admin123', gen_salt('bf')), 'admin', '管理者', '管理者', '管理者', '管理者'),
  ('staff', crypt('staff456', gen_salt('bf')), 'staff', 'スタッフ', 'テスト会社', '制作', 'スタッフ')
ON CONFLICT (username) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  company = EXCLUDED.company,
  staff_position = EXCLUDED.staff_position,
  staff_level = EXCLUDED.staff_level;
```

### 2.3 認証関数の作成

```sql
-- パスワード検証関数
CREATE OR REPLACE FUNCTION check_user_password(
  p_username VARCHAR,
  p_password VARCHAR
) RETURNS TABLE (
  id UUID,
  username VARCHAR,
  display_name VARCHAR,
  role VARCHAR,
  token TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user admin_users;
  v_token TEXT;
  v_jwt_secret TEXT;
BEGIN
  -- ユーザー名でユーザーを検索
  SELECT * INTO v_user FROM admin_users WHERE username = p_username;
  
  -- ユーザーが存在し、パスワードが一致する場合
  IF v_user.id IS NOT NULL AND 
     crypt(p_password, v_user.password_hash) = v_user.password_hash THEN
    
    -- JWT秘密鍵を取得（または固定値を使用）
    v_jwt_secret := 'super-secret-jwt-token-with-at-least-32-characters-long';
    
    -- JWTトークンを生成（簡易版）
    v_token := 'jwt_' || encode(digest(v_user.id::text || v_user.username || v_user.role || extract(epoch from now()), 'sha256'), 'hex');
    
    -- ユーザー情報とトークンを返す
    RETURN QUERY SELECT 
      v_user.id,
      v_user.username,
      v_user.display_name,
      v_user.role,
      v_token;
  END IF;
  
  -- 認証失敗時は空を返す
  RETURN;
END;
$$;
```

### 2.4 パスワード更新関数の作成

```sql
-- パスワード更新用RPC関数
CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS TABLE(
  id UUID,
  username TEXT,
  display_name TEXT,
  role TEXT,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- ユーザーの存在確認
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_user_id) THEN
    RETURN;
  END IF;

  -- パスワードをハッシュ化して更新
  UPDATE admin_users 
  SET 
    password_hash = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- 更新されたユーザー情報を返す
  RETURN QUERY
  SELECT 
    admin_users.id,
    admin_users.username,
    admin_users.display_name,
    admin_users.role,
    admin_users.updated_at
  FROM admin_users
  WHERE admin_users.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 3. APIの修正

フロントエンドとAPIがデータベースのカラム名と一致するように修正が必要です：

1. `/api/admin/users/route.ts` - `staff_position`と`staff_level`を`position`と`level`に変換
2. `/app/admin/users/page.tsx` - 同様に表示名を調整

## 4. 動作確認

1. アプリを再起動
2. 管理者ユーザー（admin/admin123）でログイン
3. ユーザー管理画面（/admin/users）にアクセスして表示を確認
4. パスワード再発行機能をテスト
