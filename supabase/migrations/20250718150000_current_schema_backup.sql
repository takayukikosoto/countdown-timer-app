-- Migration: Current Schema Backup (2025-07-18 15:40)
-- This migration recreates the current database schema structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'attendee',
    company VARCHAR(255),
    staff_position VARCHAR(100),
    staff_level VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create event_status table
CREATE TABLE IF NOT EXISTS event_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    status TEXT NOT NULL DEFAULT '準備中',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create secrets table
CREATE TABLE IF NOT EXISTS secrets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create staff_login_tokens table
CREATE TABLE IF NOT EXISTS staff_login_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id UUID NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY (staff_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Create staff_status table
CREATE TABLE IF NOT EXISTS staff_status (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT '出発前',
    custom_status TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY (staff_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Create staff_status_history table
CREATE TABLE IF NOT EXISTS staff_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    staff_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    custom_status TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    FOREIGN KEY (staff_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Create timer_actions table
CREATE TABLE IF NOT EXISTS timer_actions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timer_id VARCHAR(255) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    trigger_time INTEGER NOT NULL,
    action_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create timer_action_results table
CREATE TABLE IF NOT EXISTS timer_action_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action_id UUID NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    result JSONB,
    success BOOLEAN DEFAULT true,
    FOREIGN KEY (action_id) REFERENCES timer_actions(id) ON DELETE CASCADE
);

-- Create timer_messages table
CREATE TABLE IF NOT EXISTS timer_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timer_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    display_time INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create timers table
CREATE TABLE IF NOT EXISTS timers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    duration INTEGER NOT NULL,
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create current_timer table
CREATE TABLE IF NOT EXISTS current_timer (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timer_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    paused_at TIMESTAMP WITH TIME ZONE,
    remaining_time INTEGER,
    status VARCHAR(50) DEFAULT 'stopped',
    FOREIGN KEY (timer_id) REFERENCES timers(id) ON DELETE CASCADE
);

-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON secrets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_status_updated_at BEFORE UPDATE ON staff_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timer_actions_updated_at BEFORE UPDATE ON timer_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timer_messages_updated_at BEFORE UPDATE ON timer_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timers_updated_at BEFORE UPDATE ON timers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create staff status history trigger function
CREATE OR REPLACE FUNCTION record_staff_status_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO staff_status_history (staff_id, status, custom_status, timestamp)
    VALUES (NEW.staff_id, NEW.status, NEW.custom_status, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add staff status history trigger
CREATE TRIGGER staff_status_history_trigger 
    AFTER INSERT OR UPDATE ON staff_status 
    FOR EACH ROW EXECUTE FUNCTION record_staff_status_change();

-- Create RPC functions
CREATE OR REPLACE FUNCTION get_current_status()
RETURNS TEXT AS $$
DECLARE
    current_status TEXT;
BEGIN
    SELECT status INTO current_status FROM event_status ORDER BY updated_at DESC LIMIT 1;
    RETURN COALESCE(current_status, '準備中');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_event_status(new_status TEXT)
RETURNS TEXT AS $$
BEGIN
    UPDATE event_status SET status = new_status, updated_at = now() WHERE id = (SELECT id FROM event_status ORDER BY updated_at DESC LIMIT 1);
    IF NOT FOUND THEN
        INSERT INTO event_status (status) VALUES (new_status);
    END IF;
    RETURN new_status;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_role_counts()
RETURNS TABLE(role TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    admin_users.role::TEXT,
    COUNT(*)::BIGINT
  FROM admin_users
  GROUP BY admin_users.role;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_company_counts()
RETURNS TABLE(company TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(admin_users.company, '未設定')::TEXT,
    COUNT(*)::BIGINT
  FROM admin_users
  GROUP BY admin_users.company;
END;
$$ LANGUAGE plpgsql;

-- Create users view
CREATE OR REPLACE VIEW users AS
SELECT
  id,
  username,
  display_name,
  password_hash AS password,
  role,
  company,
  staff_position AS position,
  staff_level AS level,
  created_at,
  updated_at
FROM admin_users;

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_login_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_action_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_timer ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "管理者のみ更新可能" ON event_status FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "誰でも閲覧可能" ON event_status FOR SELECT USING (true);

CREATE POLICY "管理者のみアクセス可能" ON admin_users FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON secrets FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON staff_login_tokens FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON staff_status FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON staff_status_history FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON timer_actions FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON timer_action_results FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON timer_messages FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON timers FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "管理者のみアクセス可能" ON current_timer FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "誰でも閲覧可能" ON visitors FOR SELECT USING (true);
CREATE POLICY "管理者のみ更新可能" ON visitors FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Insert initial data
INSERT INTO event_status (status) VALUES ('準備中') ON CONFLICT DO NOTHING;
INSERT INTO visitors (count) VALUES (0) ON CONFLICT DO NOTHING;

-- Insert sample admin user (password: admin)
INSERT INTO admin_users (username, display_name, password_hash, role) 
VALUES ('admin', 'admin', crypt('admin', gen_salt('bf')), 'admin') 
ON CONFLICT (username) DO NOTHING;

-- Insert sample staff user (password: staff)
INSERT INTO admin_users (username, display_name, password_hash, role) 
VALUES ('staff', 'staff', crypt('staff', gen_salt('bf')), 'staff') 
ON CONFLICT (username) DO NOTHING;
