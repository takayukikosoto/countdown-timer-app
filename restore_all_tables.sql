-- 全テーブル構造の復元スクリプト
-- バックアップファイルから抽出した全テーブルのCREATE文

-- 既存のテーブルがある場合は削除（オプション）
-- DROP TABLE IF EXISTS public.admin_users CASCADE;
-- DROP TABLE IF EXISTS public.current_timer CASCADE;
-- DROP TABLE IF EXISTS public.event_status CASCADE;
-- DROP TABLE IF EXISTS public.secrets CASCADE;
-- DROP TABLE IF EXISTS public.staff_login_tokens CASCADE;
-- DROP TABLE IF EXISTS public.staff_status CASCADE;
-- DROP TABLE IF EXISTS public.staff_status_history CASCADE;
-- DROP TABLE IF EXISTS public.timer_action_results CASCADE;
-- DROP TABLE IF EXISTS public.timer_actions CASCADE;
-- DROP TABLE IF EXISTS public.timer_messages CASCADE;
-- DROP TABLE IF EXISTS public.timers CASCADE;
-- DROP TABLE IF EXISTS public.visitors CASCADE;

-- admin_users テーブル
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

ALTER TABLE public.admin_users OWNER TO postgres;

-- 不足しているカラムを追加（既存の場合はスキップ）
DO $$
BEGIN
    -- display_name カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'display_name') THEN
        ALTER TABLE public.admin_users ADD COLUMN display_name character varying(255);
    END IF;
    
    -- company カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'company') THEN
        ALTER TABLE public.admin_users ADD COLUMN company character varying(255);
    END IF;
    
    -- staff_position カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'staff_position') THEN
        ALTER TABLE public.admin_users ADD COLUMN staff_position character varying(100);
    END IF;
    
    -- staff_level カラムの追加
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'staff_level') THEN
        ALTER TABLE public.admin_users ADD COLUMN staff_level character varying(100);
    END IF;
END $$;

-- カラムコメントの追加
COMMENT ON COLUMN public.admin_users.company IS '所属会社名';
COMMENT ON COLUMN public.admin_users.staff_position IS 'ポジション（制作・進行・運営・音響・映像など）';
COMMENT ON COLUMN public.admin_users.staff_level IS 'レベル（ディレクター・AD・スタッフ・オペレーターなど）';

-- RLS（行レベルセキュリティ）の有効化
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- サービスロール用のポリシー作成（既存の場合は置換）
DROP POLICY IF EXISTS "Service role can manage all users" ON admin_users;
CREATE POLICY "Service role can manage all users" ON admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- current_timer テーブル
CREATE TABLE IF NOT EXISTS public.current_timer (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    timer_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.current_timer OWNER TO postgres;

-- event_status テーブル
CREATE TABLE IF NOT EXISTS public.event_status (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    status text DEFAULT '準備中'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.event_status OWNER TO postgres;

-- secrets テーブル
CREATE TABLE IF NOT EXISTS public.secrets (
    name character varying(255) NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.secrets OWNER TO postgres;

-- staff_login_tokens テーブル
CREATE TABLE IF NOT EXISTS public.staff_login_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_used_at timestamp with time zone
);

ALTER TABLE public.staff_login_tokens OWNER TO postgres;

-- staff_status テーブル
CREATE TABLE IF NOT EXISTS public.staff_status (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    staff_id uuid NOT NULL,
    status character varying(255) DEFAULT '出発前'::character varying NOT NULL,
    custom_status character varying(255),
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.staff_status OWNER TO postgres;

-- staff_status_history テーブル
CREATE TABLE IF NOT EXISTS public.staff_status_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    staff_id uuid NOT NULL,
    status character varying(255) NOT NULL,
    custom_status character varying(255),
    recorded_at timestamp with time zone DEFAULT now(),
    notes text,
    created_by uuid
);

ALTER TABLE public.staff_status_history OWNER TO postgres;

-- timer_action_results テーブル
CREATE TABLE IF NOT EXISTS public.timer_action_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    action_id uuid,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    message text
);

ALTER TABLE public.timer_action_results OWNER TO postgres;

-- timer_actions テーブル
CREATE TABLE IF NOT EXISTS public.timer_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    timer_id uuid,
    type text NOT NULL,
    params jsonb,
    scheduled_time timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.timer_actions OWNER TO postgres;

-- timer_messages テーブル
CREATE TABLE IF NOT EXISTS public.timer_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.timer_messages OWNER TO postgres;

-- timers テーブル
CREATE TABLE IF NOT EXISTS public.timers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    end_time timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    message_id uuid,
    status text DEFAULT 'active'::text NOT NULL
);

ALTER TABLE public.timers OWNER TO postgres;

-- visitors テーブル
CREATE TABLE IF NOT EXISTS public.visitors (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255),
    company character varying(255),
    position character varying(255),
    qr_code text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(50) DEFAULT 'registered'::character varying NOT NULL,
    checked_in_at timestamp with time zone,
    checked_out_at timestamp with time zone
);

ALTER TABLE public.visitors OWNER TO postgres;

-- プライマリキーの設定（既存の場合はスキップ）
DO $$ 
BEGIN
    -- admin_users
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_pkey') THEN
        ALTER TABLE ONLY public.admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);
    END IF;
    
    -- current_timer
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'current_timer_pkey') THEN
        ALTER TABLE ONLY public.current_timer ADD CONSTRAINT current_timer_pkey PRIMARY KEY (id);
    END IF;
    
    -- event_status
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_status_pkey') THEN
        ALTER TABLE ONLY public.event_status ADD CONSTRAINT event_status_pkey PRIMARY KEY (id);
    END IF;
    
    -- secrets
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'secrets_pkey') THEN
        ALTER TABLE ONLY public.secrets ADD CONSTRAINT secrets_pkey PRIMARY KEY (name);
    END IF;
    
    -- staff_login_tokens
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_login_tokens_pkey') THEN
        ALTER TABLE ONLY public.staff_login_tokens ADD CONSTRAINT staff_login_tokens_pkey PRIMARY KEY (id);
    END IF;
    
    -- staff_status
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_status_pkey') THEN
        ALTER TABLE ONLY public.staff_status ADD CONSTRAINT staff_status_pkey PRIMARY KEY (id);
    END IF;
    
    -- staff_status_history
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_status_history_pkey') THEN
        ALTER TABLE ONLY public.staff_status_history ADD CONSTRAINT staff_status_history_pkey PRIMARY KEY (id);
    END IF;
    
    -- timer_action_results
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_action_results_pkey') THEN
        ALTER TABLE ONLY public.timer_action_results ADD CONSTRAINT timer_action_results_pkey PRIMARY KEY (id);
    END IF;
    
    -- timer_actions
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_actions_pkey') THEN
        ALTER TABLE ONLY public.timer_actions ADD CONSTRAINT timer_actions_pkey PRIMARY KEY (id);
    END IF;
    
    -- timer_messages
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_messages_pkey') THEN
        ALTER TABLE ONLY public.timer_messages ADD CONSTRAINT timer_messages_pkey PRIMARY KEY (id);
    END IF;
    
    -- timers
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timers_pkey') THEN
        ALTER TABLE ONLY public.timers ADD CONSTRAINT timers_pkey PRIMARY KEY (id);
    END IF;
    
    -- visitors
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitors_pkey') THEN
        ALTER TABLE ONLY public.visitors ADD CONSTRAINT visitors_pkey PRIMARY KEY (id);
    END IF;
END $$;

-- 外部キー制約の設定（既存の場合はスキップ）
DO $$
BEGIN
    -- staff_login_tokens
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_login_tokens_staff_id_fkey') THEN
        ALTER TABLE ONLY public.staff_login_tokens
            ADD CONSTRAINT staff_login_tokens_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;
    END IF;
    
    -- staff_status
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_status_staff_id_fkey') THEN
        ALTER TABLE ONLY public.staff_status
            ADD CONSTRAINT staff_status_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;
    END IF;
    
    -- staff_status_history
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_status_history_staff_id_fkey') THEN
        ALTER TABLE ONLY public.staff_status_history
            ADD CONSTRAINT staff_status_history_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;
    END IF;
    
    -- timer_action_results
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timer_action_results_action_id_fkey') THEN
        ALTER TABLE ONLY public.timer_action_results
            ADD CONSTRAINT timer_action_results_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.timer_actions(id) ON DELETE SET NULL;
    END IF;
    
    -- timers
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timers_message_id_fkey') THEN
        ALTER TABLE ONLY public.timers
            ADD CONSTRAINT timers_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.timer_messages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- JWT秘密鍵の設定
INSERT INTO secrets (name, value) VALUES ('jwt_secret', 'super-secret-jwt-token-with-at-least-32-characters-long')
ON CONFLICT (name) DO UPDATE SET value = 'super-secret-jwt-token-with-at-least-32-characters-long';

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
