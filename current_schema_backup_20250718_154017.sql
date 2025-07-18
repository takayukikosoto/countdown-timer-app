--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: check_user_password(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_user_password(p_username character varying, p_password character varying) RETURNS TABLE(id uuid, username character varying, role character varying, token text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user admin_users;
  v_token TEXT;
  v_jwt_secret TEXT;
BEGIN
  -- Find user by username
  SELECT * INTO v_user FROM admin_users WHERE username = p_username;
  
  -- Check if user exists and password matches
  IF v_user.id IS NOT NULL AND 
     crypt(p_password, v_user.password_hash) = v_user.password_hash THEN
    
    -- Get JWT secret from secrets table or use default
    SELECT value INTO v_jwt_secret FROM secrets WHERE name = 'jwt_secret';
    IF v_jwt_secret IS NULL THEN
      v_jwt_secret := 'super-secret-jwt-token-with-at-least-32-characters-long';
    END IF;
    
    -- Generate JWT token
    v_token := extensions.sign(
      json_build_object(
        'role', v_user.role,
        'user_id', v_user.id::TEXT,
        'username', v_user.username,
        'exp', extract(epoch from now() + interval '24 hours')::integer
      ),
      v_jwt_secret
    );
    
    RETURN QUERY SELECT 
      v_user.id, 
      v_user.username, 
      v_user.role, 
      v_token;
  ELSE
    -- Return empty result for invalid credentials
    RETURN;
  END IF;
END;
$$;


ALTER FUNCTION public.check_user_password(p_username character varying, p_password character varying) OWNER TO postgres;

--
-- Name: cleanup_expired_tokens(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_tokens() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM staff_login_tokens WHERE expires_at < NOW();
END;
$$;


ALTER FUNCTION public.cleanup_expired_tokens() OWNER TO postgres;

--
-- Name: create_staff_user(character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_staff_user(p_username character varying, p_password character varying, p_name character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- ユーザー名が既に存在するか確認
  IF EXISTS (SELECT 1 FROM admin_users WHERE username = p_username) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ユーザー名が既に存在します'
    );
  END IF;

  -- スタッフユーザーを作成
  INSERT INTO admin_users (username, password_hash, role, display_name)
  VALUES (
    p_username, 
    crypt(p_password, gen_salt('bf')), 
    'staff',
    p_name
  )
  RETURNING id INTO v_user_id;

  -- 成功レスポンスを返す
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id
  );
END;
$$;


ALTER FUNCTION public.create_staff_user(p_username character varying, p_password character varying, p_name character varying) OWNER TO postgres;

--
-- Name: delete_staff_user(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.delete_staff_user(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  -- ユーザーのロールを確認
  SELECT role INTO v_role FROM admin_users WHERE id = p_user_id;
  
  -- 管理者は削除できない
  IF v_role = 'admin' THEN
    RETURN FALSE;
  END IF;
  
  -- スタッフユーザーを削除
  DELETE FROM admin_users WHERE id = p_user_id AND role = 'staff';
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION public.delete_staff_user(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_company_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_company_counts() RETURNS TABLE(company text, count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(admin_users.company, '未設定')::TEXT,
    COUNT(*)::BIGINT
  FROM admin_users
  GROUP BY admin_users.company;
END;
$$;


ALTER FUNCTION public.get_company_counts() OWNER TO postgres;

--
-- Name: get_current_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_status() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_status TEXT;
BEGIN
  -- テーブルが空の場合は初期レコードを挿入
  INSERT INTO event_status (status)
  SELECT '準備中'
  WHERE NOT EXISTS (SELECT 1 FROM event_status LIMIT 1);
  
  -- 最初のレコードのステータスを取得
  SELECT status INTO current_status
  FROM event_status
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN COALESCE(current_status, '準備中');
END;
$$;


ALTER FUNCTION public.get_current_status() OWNER TO postgres;

--
-- Name: get_role_counts(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_role_counts() RETURNS TABLE(role text, count bigint)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    admin_users.role::TEXT,
    COUNT(*)::BIGINT
  FROM admin_users
  GROUP BY admin_users.role;
END;
$$;


ALTER FUNCTION public.get_role_counts() OWNER TO postgres;

--
-- Name: get_staff_status(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_staff_status(p_staff_id uuid) RETURNS TABLE(id uuid, staff_id uuid, status character varying, custom_status character varying, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.staff_id,
    s.status,
    s.custom_status,
    s.updated_at
  FROM 
    staff_status s
  WHERE 
    s.staff_id = p_staff_id
  ORDER BY 
    s.updated_at DESC
  LIMIT 1;
END;
$$;


ALTER FUNCTION public.get_staff_status(p_staff_id uuid) OWNER TO postgres;

--
-- Name: get_staff_status_history(uuid, integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_staff_status_history(p_staff_id uuid, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0) RETURNS TABLE(id uuid, staff_id uuid, status character varying, custom_status character varying, recorded_at timestamp with time zone, notes text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.staff_id,
    h.status,
    h.custom_status,
    h.recorded_at,
    h.notes
  FROM 
    staff_status_history h
  WHERE 
    h.staff_id = p_staff_id
  ORDER BY 
    h.recorded_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;


ALTER FUNCTION public.get_staff_status_history(p_staff_id uuid, p_limit integer, p_offset integer) OWNER TO postgres;

--
-- Name: get_staff_status_timestamp(uuid, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_staff_status_timestamp(p_staff_id uuid, p_status character varying) RETURNS timestamp with time zone
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_recorded_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT recorded_at INTO v_recorded_at
  FROM staff_status_history
  WHERE staff_id = p_staff_id AND status = p_status
  ORDER BY recorded_at DESC
  LIMIT 1;
  
  RETURN v_recorded_at;
END;
$$;


ALTER FUNCTION public.get_staff_status_timestamp(p_staff_id uuid, p_status character varying) OWNER TO postgres;

--
-- Name: increment_visitor_count(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_visitor_count(increment_by integer DEFAULT 1) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- 今日の日付のレコードがなければ作成
  INSERT INTO visitors (count, event_date)
  VALUES (0, CURRENT_DATE)
  ON CONFLICT (event_date) DO NOTHING;
  
  -- 来場者数を更新
  UPDATE visitors
  SET count = count + increment_by,
      updated_at = NOW()
  WHERE event_date = CURRENT_DATE
  RETURNING count INTO current_count;
  
  RETURN current_count;
END;
$$;


ALTER FUNCTION public.increment_visitor_count(increment_by integer) OWNER TO postgres;

--
-- Name: list_all_staff_status(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.list_all_staff_status() RETURNS TABLE(staff_id uuid, username character varying, display_name character varying, status character varying, custom_status character varying, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as staff_id,
    u.username,
    u.display_name,
    COALESCE(s.status, '出発前') as status,
    s.custom_status,
    COALESCE(s.updated_at, u.created_at) as updated_at
  FROM 
    admin_users u
  LEFT JOIN (
    SELECT DISTINCT ON (staff_id) 
      staff_id, 
      status, 
      custom_status, 
      updated_at
    FROM 
      staff_status
    ORDER BY 
      staff_id, updated_at DESC
  ) s ON u.id = s.staff_id
  WHERE 
    u.role = 'staff'
  ORDER BY 
    COALESCE(s.updated_at, u.created_at) DESC;
END;
$$;


ALTER FUNCTION public.list_all_staff_status() OWNER TO postgres;

--
-- Name: list_staff_users(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.list_staff_users() RETURNS TABLE(id uuid, username character varying, display_name character varying, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    u.display_name,
    u.created_at
  FROM 
    admin_users u
  WHERE 
    u.role = 'staff'
  ORDER BY 
    u.created_at DESC;
END;
$$;


ALTER FUNCTION public.list_staff_users() OWNER TO postgres;

--
-- Name: record_staff_status_history(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.record_staff_status_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- ステータス変更履歴を記録
  INSERT INTO staff_status_history (staff_id, status, custom_status)
  VALUES (NEW.staff_id, NEW.status, NEW.custom_status);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.record_staff_status_history() OWNER TO postgres;

--
-- Name: reset_visitor_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reset_visitor_count() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- 来場者数をリセット
  UPDATE visitors
  SET count = 0,
      updated_at = NOW()
  WHERE event_date = CURRENT_DATE
  RETURNING count INTO current_count;
  
  RETURN current_count;
END;
$$;


ALTER FUNCTION public.reset_visitor_count() OWNER TO postgres;

--
-- Name: update_event_status(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_event_status(new_status text) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  updated_status TEXT;
BEGIN
  -- テーブルが空の場合は初期レコードを挿入
  INSERT INTO event_status (status)
  SELECT '準備中'
  WHERE NOT EXISTS (SELECT 1 FROM event_status LIMIT 1);
  
  -- ステータスを更新（常に最初の行を更新）
  UPDATE event_status
  SET status = new_status,
      updated_at = NOW()
  WHERE id = (SELECT id FROM event_status ORDER BY created_at ASC LIMIT 1)
  RETURNING status INTO updated_status;
  
  RETURN updated_status;
END;
$$;


ALTER FUNCTION public.update_event_status(new_status text) OWNER TO postgres;

--
-- Name: update_staff_status(uuid, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_staff_status(p_staff_id uuid, p_status character varying, p_custom_status character varying DEFAULT NULL::character varying) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_status_id UUID;
BEGIN
  -- スタッフが存在するか確認
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = p_staff_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'スタッフが存在しません'
    );
  END IF;

  -- 既存のステータスがあるか確認
  IF EXISTS (SELECT 1 FROM staff_status WHERE staff_id = p_staff_id) THEN
    -- 既存のステータスを更新
    UPDATE staff_status
    SET 
      status = p_status,
      custom_status = p_custom_status,
      updated_at = NOW()
    WHERE 
      staff_id = p_staff_id
    RETURNING id INTO v_status_id;
  ELSE
    -- 新しいステータスを作成
    INSERT INTO staff_status (staff_id, status, custom_status)
    VALUES (p_staff_id, p_status, p_custom_status)
    RETURNING id INTO v_status_id;
  END IF;

  -- 成功レスポンスを返す
  RETURN jsonb_build_object(
    'success', true,
    'status_id', v_status_id
  );
END;
$$;


ALTER FUNCTION public.update_staff_status(p_staff_id uuid, p_status character varying, p_custom_status character varying) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: verify_password(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.verify_password(password text, hash text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$;


ALTER FUNCTION public.verify_password(password text, hash text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_users (
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

--
-- Name: current_timer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.current_timer (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    timer_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.current_timer OWNER TO postgres;

--
-- Name: event_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_status (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    status text DEFAULT '準備中'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_status OWNER TO postgres;

--
-- Name: secrets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.secrets (
    name character varying(255) NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.secrets OWNER TO postgres;

--
-- Name: staff_login_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_login_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE public.staff_login_tokens OWNER TO postgres;

--
-- Name: TABLE staff_login_tokens; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.staff_login_tokens IS 'スタッフのQRコードログイン用トークンを保存するテーブル';


--
-- Name: COLUMN staff_login_tokens.staff_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_login_tokens.staff_id IS 'スタッフのID (admin_usersテーブルの外部キー)';


--
-- Name: COLUMN staff_login_tokens.token; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_login_tokens.token IS 'QRコードに埋め込まれるログイントークン';


--
-- Name: COLUMN staff_login_tokens.expires_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_login_tokens.expires_at IS 'トークンの有効期限';


--
-- Name: COLUMN staff_login_tokens.last_used_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_login_tokens.last_used_at IS '最後に使用された日時';


--
-- Name: staff_status; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_status (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    staff_id uuid NOT NULL,
    status character varying(255) DEFAULT '出発前'::character varying NOT NULL,
    custom_status character varying(255),
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.staff_status OWNER TO postgres;

--
-- Name: staff_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.staff_status_history (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    staff_id uuid NOT NULL,
    status character varying(255) NOT NULL,
    custom_status character varying(255),
    recorded_at timestamp with time zone DEFAULT now(),
    notes text,
    created_by uuid
);


ALTER TABLE public.staff_status_history OWNER TO postgres;

--
-- Name: TABLE staff_status_history; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.staff_status_history IS 'スタッフのステータス変更履歴を記録するテーブル';


--
-- Name: COLUMN staff_status_history.staff_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_status_history.staff_id IS 'スタッフのID';


--
-- Name: COLUMN staff_status_history.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_status_history.status IS 'ステータス（出発前、出発OK、到着、勤務中、業務終了、カスタム）';


--
-- Name: COLUMN staff_status_history.custom_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_status_history.custom_status IS 'カスタムステータスの内容';


--
-- Name: COLUMN staff_status_history.recorded_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_status_history.recorded_at IS 'ステータス変更時刻';


--
-- Name: COLUMN staff_status_history.notes; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_status_history.notes IS '備考・メモ';


--
-- Name: COLUMN staff_status_history.created_by; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.staff_status_history.created_by IS 'ステータスを変更した管理者（管理者が変更した場合）';


--
-- Name: timer_action_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timer_action_results (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    action_id uuid,
    timer_id uuid,
    action_type text NOT NULL,
    message text,
    color text,
    flash boolean,
    executed_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.timer_action_results OWNER TO postgres;

--
-- Name: timer_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timer_actions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    timer_id uuid,
    trigger_time bigint NOT NULL,
    type text NOT NULL,
    message text,
    color text,
    flash boolean DEFAULT false,
    executed boolean DEFAULT false,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT timer_actions_type_check CHECK ((type = ANY (ARRAY['message'::text, 'color'::text, 'both'::text])))
);


ALTER TABLE public.timer_actions OWNER TO postgres;

--
-- Name: timer_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timer_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    timer_id uuid,
    text text NOT NULL,
    color text DEFAULT '#ffffff'::text NOT NULL,
    flash boolean DEFAULT false NOT NULL,
    "timestamp" bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.timer_messages OWNER TO postgres;

--
-- Name: timers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.timers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    duration bigint NOT NULL,
    state text NOT NULL,
    mode text NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    paused_at timestamp with time zone,
    elapsed_time bigint,
    show_seconds boolean DEFAULT true NOT NULL,
    play_sound boolean DEFAULT false NOT NULL,
    color text DEFAULT '#3b82f6'::text NOT NULL,
    overtime_color text DEFAULT '#ef4444'::text NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT timers_mode_check CHECK ((mode = ANY (ARRAY['normal'::text, 'overtime'::text]))),
    CONSTRAINT timers_state_check CHECK ((state = ANY (ARRAY['idle'::text, 'running'::text, 'paused'::text, 'completed'::text]))),
    CONSTRAINT timers_type_check CHECK ((type = ANY (ARRAY['countdown'::text, 'countup'::text])))
);


ALTER TABLE public.timers OWNER TO postgres;

--
-- Name: visitors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.visitors (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    event_date date DEFAULT CURRENT_DATE NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.visitors OWNER TO postgres;

--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_username_key UNIQUE (username);


--
-- Name: current_timer current_timer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.current_timer
    ADD CONSTRAINT current_timer_pkey PRIMARY KEY (id);


--
-- Name: event_status event_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_status
    ADD CONSTRAINT event_status_pkey PRIMARY KEY (id);


--
-- Name: secrets secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.secrets
    ADD CONSTRAINT secrets_pkey PRIMARY KEY (name);


--
-- Name: staff_login_tokens staff_login_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_login_tokens
    ADD CONSTRAINT staff_login_tokens_pkey PRIMARY KEY (id);


--
-- Name: staff_login_tokens staff_login_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_login_tokens
    ADD CONSTRAINT staff_login_tokens_token_key UNIQUE (token);


--
-- Name: staff_status_history staff_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_status_history
    ADD CONSTRAINT staff_status_history_pkey PRIMARY KEY (id);


--
-- Name: staff_status staff_status_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_status
    ADD CONSTRAINT staff_status_pkey PRIMARY KEY (id);


--
-- Name: timer_action_results timer_action_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timer_action_results
    ADD CONSTRAINT timer_action_results_pkey PRIMARY KEY (id);


--
-- Name: timer_actions timer_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timer_actions
    ADD CONSTRAINT timer_actions_pkey PRIMARY KEY (id);


--
-- Name: timer_messages timer_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timer_messages
    ADD CONSTRAINT timer_messages_pkey PRIMARY KEY (id);


--
-- Name: timers timers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timers
    ADD CONSTRAINT timers_pkey PRIMARY KEY (id);


--
-- Name: visitors visitors_event_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_event_date_key UNIQUE (event_date);


--
-- Name: visitors visitors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.visitors
    ADD CONSTRAINT visitors_pkey PRIMARY KEY (id);


--
-- Name: idx_staff_login_tokens_staff_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_login_tokens_staff_id ON public.staff_login_tokens USING btree (staff_id);


--
-- Name: idx_staff_login_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_login_tokens_token ON public.staff_login_tokens USING btree (token);


--
-- Name: idx_staff_status_history_recorded_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_status_history_recorded_at ON public.staff_status_history USING btree (recorded_at);


--
-- Name: idx_staff_status_history_staff_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_status_history_staff_id ON public.staff_status_history USING btree (staff_id);


--
-- Name: idx_staff_status_history_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_staff_status_history_status ON public.staff_status_history USING btree (status);


--
-- Name: visitors_event_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX visitors_event_date_idx ON public.visitors USING btree (event_date);


--
-- Name: staff_status staff_status_history_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER staff_status_history_trigger AFTER INSERT OR UPDATE ON public.staff_status FOR EACH ROW EXECUTE FUNCTION public.record_staff_status_history();


--
-- Name: current_timer update_current_timer_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_current_timer_updated_at BEFORE UPDATE ON public.current_timer FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: timer_actions update_timer_actions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_timer_actions_updated_at BEFORE UPDATE ON public.timer_actions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: timers update_timers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_timers_updated_at BEFORE UPDATE ON public.timers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: current_timer current_timer_timer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.current_timer
    ADD CONSTRAINT current_timer_timer_id_fkey FOREIGN KEY (timer_id) REFERENCES public.timers(id) ON DELETE SET NULL;


--
-- Name: staff_login_tokens staff_login_tokens_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_login_tokens
    ADD CONSTRAINT staff_login_tokens_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: staff_status_history staff_status_history_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_status_history
    ADD CONSTRAINT staff_status_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;


--
-- Name: staff_status_history staff_status_history_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_status_history
    ADD CONSTRAINT staff_status_history_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: staff_status staff_status_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.staff_status
    ADD CONSTRAINT staff_status_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.admin_users(id) ON DELETE CASCADE;


--
-- Name: timer_action_results timer_action_results_action_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timer_action_results
    ADD CONSTRAINT timer_action_results_action_id_fkey FOREIGN KEY (action_id) REFERENCES public.timer_actions(id) ON DELETE SET NULL;


--
-- Name: timer_action_results timer_action_results_timer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timer_action_results
    ADD CONSTRAINT timer_action_results_timer_id_fkey FOREIGN KEY (timer_id) REFERENCES public.timers(id) ON DELETE SET NULL;


--
-- Name: timer_actions timer_actions_timer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timer_actions
    ADD CONSTRAINT timer_actions_timer_id_fkey FOREIGN KEY (timer_id) REFERENCES public.timers(id) ON DELETE CASCADE;


--
-- Name: timer_messages timer_messages_timer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.timer_messages
    ADD CONSTRAINT timer_messages_timer_id_fkey FOREIGN KEY (timer_id) REFERENCES public.timers(id) ON DELETE CASCADE;


--
-- Name: admin_users Service role can manage all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all users" ON public.admin_users USING ((auth.role() = 'service_role'::text));


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: current_timer; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.current_timer ENABLE ROW LEVEL SECURITY;

--
-- Name: event_status; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.event_status ENABLE ROW LEVEL SECURITY;

--
-- Name: timer_action_results; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.timer_action_results ENABLE ROW LEVEL SECURITY;

--
-- Name: timer_actions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.timer_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: timer_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.timer_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: timers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.timers ENABLE ROW LEVEL SECURITY;

--
-- Name: visitors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

--
-- Name: timer_action_results タイマーアクション結果読み取り許可; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "タイマーアクション結果読み取り許可" ON public.timer_action_results FOR SELECT USING (true);


--
-- Name: timer_actions タイマーアクション読み取り許可; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "タイマーアクション読み取り許可" ON public.timer_actions FOR SELECT USING (true);


--
-- Name: timer_messages タイマーメッセージ読み取り許可; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "タイマーメッセージ読み取り許可" ON public.timer_messages FOR SELECT USING (true);


--
-- Name: timers タイマー情報の読み取り許可; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "タイマー情報の読み取り許可" ON public.timers FOR SELECT USING (true);


--
-- Name: current_timer 現在のタイマー読み取り許可; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "現在のタイマー読み取り許可" ON public.current_timer FOR SELECT USING (true);


--
-- Name: event_status 管理者のみ更新可能; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "管理者のみ更新可能" ON public.event_status USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: visitors 管理者のみ更新可能; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "管理者のみ更新可能" ON public.visitors USING ((auth.role() = 'authenticated'::text)) WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: timer_actions 認証済みユーザーのタイマーアクション更新許; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "認証済みユーザーのタイマーアクション更新許" ON public.timer_actions USING ((auth.role() = 'authenticated'::text));


--
-- Name: timer_action_results 認証済みユーザーのタイマーアクション結果更; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "認証済みユーザーのタイマーアクション結果更" ON public.timer_action_results USING ((auth.role() = 'authenticated'::text));


--
-- Name: timers 認証済みユーザーのタイマー更新許可; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "認証済みユーザーのタイマー更新許可" ON public.timers USING ((auth.role() = 'authenticated'::text));


--
-- Name: timer_messages 認証済みユーザーのメッセージ更新許可; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "認証済みユーザーのメッセージ更新許可" ON public.timer_messages USING ((auth.role() = 'authenticated'::text));


--
-- Name: current_timer 認証済みユーザーの現在タイマー更新許可; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "認証済みユーザーの現在タイマー更新許可" ON public.current_timer USING ((auth.role() = 'authenticated'::text));


--
-- Name: event_status 誰でも閲覧可能; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "誰でも閲覧可能" ON public.event_status FOR SELECT USING (true);


--
-- Name: visitors 誰でも閲覧可能; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "誰でも閲覧可能" ON public.visitors FOR SELECT USING (true);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION check_user_password(p_username character varying, p_password character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_user_password(p_username character varying, p_password character varying) TO anon;
GRANT ALL ON FUNCTION public.check_user_password(p_username character varying, p_password character varying) TO authenticated;
GRANT ALL ON FUNCTION public.check_user_password(p_username character varying, p_password character varying) TO service_role;


--
-- Name: FUNCTION cleanup_expired_tokens(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.cleanup_expired_tokens() TO anon;
GRANT ALL ON FUNCTION public.cleanup_expired_tokens() TO authenticated;
GRANT ALL ON FUNCTION public.cleanup_expired_tokens() TO service_role;


--
-- Name: FUNCTION create_staff_user(p_username character varying, p_password character varying, p_name character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_staff_user(p_username character varying, p_password character varying, p_name character varying) TO anon;
GRANT ALL ON FUNCTION public.create_staff_user(p_username character varying, p_password character varying, p_name character varying) TO authenticated;
GRANT ALL ON FUNCTION public.create_staff_user(p_username character varying, p_password character varying, p_name character varying) TO service_role;


--
-- Name: FUNCTION delete_staff_user(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.delete_staff_user(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.delete_staff_user(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.delete_staff_user(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_company_counts(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_company_counts() TO anon;
GRANT ALL ON FUNCTION public.get_company_counts() TO authenticated;
GRANT ALL ON FUNCTION public.get_company_counts() TO service_role;


--
-- Name: FUNCTION get_current_status(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_current_status() TO anon;
GRANT ALL ON FUNCTION public.get_current_status() TO authenticated;
GRANT ALL ON FUNCTION public.get_current_status() TO service_role;


--
-- Name: FUNCTION get_role_counts(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_role_counts() TO anon;
GRANT ALL ON FUNCTION public.get_role_counts() TO authenticated;
GRANT ALL ON FUNCTION public.get_role_counts() TO service_role;


--
-- Name: FUNCTION get_staff_status(p_staff_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_staff_status(p_staff_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_staff_status(p_staff_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_staff_status(p_staff_id uuid) TO service_role;


--
-- Name: FUNCTION get_staff_status_history(p_staff_id uuid, p_limit integer, p_offset integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_staff_status_history(p_staff_id uuid, p_limit integer, p_offset integer) TO anon;
GRANT ALL ON FUNCTION public.get_staff_status_history(p_staff_id uuid, p_limit integer, p_offset integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_staff_status_history(p_staff_id uuid, p_limit integer, p_offset integer) TO service_role;


--
-- Name: FUNCTION get_staff_status_timestamp(p_staff_id uuid, p_status character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_staff_status_timestamp(p_staff_id uuid, p_status character varying) TO anon;
GRANT ALL ON FUNCTION public.get_staff_status_timestamp(p_staff_id uuid, p_status character varying) TO authenticated;
GRANT ALL ON FUNCTION public.get_staff_status_timestamp(p_staff_id uuid, p_status character varying) TO service_role;


--
-- Name: FUNCTION increment_visitor_count(increment_by integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_visitor_count(increment_by integer) TO anon;
GRANT ALL ON FUNCTION public.increment_visitor_count(increment_by integer) TO authenticated;
GRANT ALL ON FUNCTION public.increment_visitor_count(increment_by integer) TO service_role;


--
-- Name: FUNCTION list_all_staff_status(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.list_all_staff_status() TO anon;
GRANT ALL ON FUNCTION public.list_all_staff_status() TO authenticated;
GRANT ALL ON FUNCTION public.list_all_staff_status() TO service_role;


--
-- Name: FUNCTION list_staff_users(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.list_staff_users() TO anon;
GRANT ALL ON FUNCTION public.list_staff_users() TO authenticated;
GRANT ALL ON FUNCTION public.list_staff_users() TO service_role;


--
-- Name: FUNCTION record_staff_status_history(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.record_staff_status_history() TO anon;
GRANT ALL ON FUNCTION public.record_staff_status_history() TO authenticated;
GRANT ALL ON FUNCTION public.record_staff_status_history() TO service_role;


--
-- Name: FUNCTION reset_visitor_count(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.reset_visitor_count() TO anon;
GRANT ALL ON FUNCTION public.reset_visitor_count() TO authenticated;
GRANT ALL ON FUNCTION public.reset_visitor_count() TO service_role;


--
-- Name: FUNCTION update_event_status(new_status text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_event_status(new_status text) TO anon;
GRANT ALL ON FUNCTION public.update_event_status(new_status text) TO authenticated;
GRANT ALL ON FUNCTION public.update_event_status(new_status text) TO service_role;


--
-- Name: FUNCTION update_staff_status(p_staff_id uuid, p_status character varying, p_custom_status character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_staff_status(p_staff_id uuid, p_status character varying, p_custom_status character varying) TO anon;
GRANT ALL ON FUNCTION public.update_staff_status(p_staff_id uuid, p_status character varying, p_custom_status character varying) TO authenticated;
GRANT ALL ON FUNCTION public.update_staff_status(p_staff_id uuid, p_status character varying, p_custom_status character varying) TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION verify_password(password text, hash text); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.verify_password(password text, hash text) TO anon;
GRANT ALL ON FUNCTION public.verify_password(password text, hash text) TO authenticated;
GRANT ALL ON FUNCTION public.verify_password(password text, hash text) TO service_role;


--
-- Name: TABLE admin_users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_users TO anon;
GRANT ALL ON TABLE public.admin_users TO authenticated;
GRANT ALL ON TABLE public.admin_users TO service_role;


--
-- Name: TABLE current_timer; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.current_timer TO anon;
GRANT ALL ON TABLE public.current_timer TO authenticated;
GRANT ALL ON TABLE public.current_timer TO service_role;


--
-- Name: TABLE event_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.event_status TO anon;
GRANT ALL ON TABLE public.event_status TO authenticated;
GRANT ALL ON TABLE public.event_status TO service_role;


--
-- Name: TABLE secrets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.secrets TO anon;
GRANT ALL ON TABLE public.secrets TO authenticated;
GRANT ALL ON TABLE public.secrets TO service_role;


--
-- Name: TABLE staff_login_tokens; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.staff_login_tokens TO anon;
GRANT ALL ON TABLE public.staff_login_tokens TO authenticated;
GRANT ALL ON TABLE public.staff_login_tokens TO service_role;


--
-- Name: TABLE staff_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.staff_status TO anon;
GRANT ALL ON TABLE public.staff_status TO authenticated;
GRANT ALL ON TABLE public.staff_status TO service_role;


--
-- Name: TABLE staff_status_history; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.staff_status_history TO anon;
GRANT ALL ON TABLE public.staff_status_history TO authenticated;
GRANT ALL ON TABLE public.staff_status_history TO service_role;


--
-- Name: TABLE timer_action_results; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.timer_action_results TO anon;
GRANT ALL ON TABLE public.timer_action_results TO authenticated;
GRANT ALL ON TABLE public.timer_action_results TO service_role;


--
-- Name: TABLE timer_actions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.timer_actions TO anon;
GRANT ALL ON TABLE public.timer_actions TO authenticated;
GRANT ALL ON TABLE public.timer_actions TO service_role;


--
-- Name: TABLE timer_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.timer_messages TO anon;
GRANT ALL ON TABLE public.timer_messages TO authenticated;
GRANT ALL ON TABLE public.timer_messages TO service_role;


--
-- Name: TABLE timers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.timers TO anon;
GRANT ALL ON TABLE public.timers TO authenticated;
GRANT ALL ON TABLE public.timers TO service_role;


--
-- Name: TABLE visitors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.visitors TO anon;
GRANT ALL ON TABLE public.visitors TO authenticated;
GRANT ALL ON TABLE public.visitors TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES  TO service_role;


--
-- PostgreSQL database dump complete
--

