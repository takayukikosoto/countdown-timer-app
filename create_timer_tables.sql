-- タイマー設定テーブル
create table timers (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  type text not null check (type in ('countdown', 'countup')),
  duration bigint not null,
  state text not null check (state in ('idle', 'running', 'paused', 'completed')),
  mode text not null check (mode in ('normal', 'overtime')),
  start_time timestamptz,
  end_time timestamptz,
  paused_at timestamptz,
  elapsed_time bigint,
  show_seconds boolean not null default true,
  play_sound boolean not null default false,
  color text not null default '#3b82f6',
  overtime_color text not null default '#ef4444',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 現在アクティブなタイマーを記録するテーブル
create table current_timer (
  id uuid primary key default uuid_generate_v4(),
  timer_id uuid references timers(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- タイマーメッセージテーブル
create table timer_messages (
  id uuid primary key default uuid_generate_v4(),
  timer_id uuid references timers(id) on delete cascade,
  text text not null,
  color text not null default '#ffffff',
  flash boolean not null default false,
  timestamp bigint not null,
  created_at timestamptz not null default now()
);

-- 初期データ挿入（オプション）
insert into current_timer (id) values ('00000000-0000-0000-0000-000000000001');

-- Realtimeを有効化するためのRLS設定
alter table timers enable row level security;
alter table current_timer enable row level security;
alter table timer_messages enable row level security;

-- 誰でも読み取り可能なポリシー
create policy "タイマー情報の読み取り許可" on timers
  for select using (true);

create policy "現在のタイマー読み取り許可" on current_timer
  for select using (true);

create policy "タイマーメッセージ読み取り許可" on timer_messages
  for select using (true);

-- 認証済みユーザーのみ書き込み可能なポリシー
create policy "認証済みユーザーのタイマー更新許可" on timers
  for all using (auth.role() = 'authenticated');

create policy "認証済みユーザーの現在タイマー更新許可" on current_timer
  for all using (auth.role() = 'authenticated');

create policy "認証済みユーザーのメッセージ更新許可" on timer_messages
  for all using (auth.role() = 'authenticated');

-- 更新時にupdated_atを自動更新するトリガー
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_timers_updated_at
before update on timers
for each row
execute function update_updated_at_column();

create trigger update_current_timer_updated_at
before update on current_timer
for each row
execute function update_updated_at_column();
