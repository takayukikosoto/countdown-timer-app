-- タイマーアクションテーブル
create table timer_actions (
  id uuid primary key default uuid_generate_v4(),
  timer_id uuid references timers(id) on delete cascade,
  trigger_time bigint not null, -- 残り時間（ミリ秒）でトリガー
  type text not null check (type in ('message', 'color', 'both')),
  message text,
  color text,
  flash boolean default false,
  executed boolean default false,
  enabled boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- タイマーアクション実行結果テーブル
create table timer_action_results (
  id uuid primary key default uuid_generate_v4(),
  action_id uuid references timer_actions(id) on delete set null,
  timer_id uuid references timers(id) on delete set null,
  action_type text not null,
  message text,
  color text,
  flash boolean,
  executed_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Realtimeを有効化するためのRLS設定
alter table timer_actions enable row level security;
alter table timer_action_results enable row level security;

-- 誰でも読み取り可能なポリシー
create policy "タイマーアクション読み取り許可" on timer_actions
  for select using (true);

create policy "タイマーアクション結果読み取り許可" on timer_action_results
  for select using (true);

-- 認証済みユーザーのみ書き込み可能なポリシー
create policy "認証済みユーザーのタイマーアクション更新許可" on timer_actions
  for all using (auth.role() = 'authenticated');

create policy "認証済みユーザーのタイマーアクション結果更新許可" on timer_action_results
  for all using (auth.role() = 'authenticated');

-- 更新時にupdated_atを自動更新するトリガー
create trigger update_timer_actions_updated_at
before update on timer_actions
for each row
execute function update_updated_at_column();
