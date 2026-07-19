-- Project ARC — schema
-- 対象: supabase CLI が起動するローカルPostgres、および将来のクラウドSupabase（ADR 0001, 0003）
-- 適用方法: supabase/migrations/ 配下にコピーし `supabase db reset` / `supabase db push` で適用する想定

create table if not exists reflections (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id),
  date date not null unique,
  sleep_hours numeric(4, 1),
  study_minutes integer,
  did_martial_arts boolean not null default false,
  did_english_lesson boolean not null default false,
  mood text check (mood in ('great', 'good', 'neutral', 'low', 'bad')),
  expense_yen integer,
  notes text,
  todays_events text,
  tomorrows_goal text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reflections_date on reflections (date desc);

create table if not exists study_logs (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id),
  date date not null,
  subject text not null,
  minutes integer not null check (minutes >= 0),
  topic text,
  is_weak_area boolean default false,
  needs_review boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_study_logs_date on study_logs (date desc);
create index if not exists idx_study_logs_subject on study_logs (subject);

create table if not exists tasks (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id),
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  due_date date,
  created_at timestamptz not null default now()
);

-- RLS（ADR 0003）: 単一ユーザー運用だが、漏洩したanonキー等からの
-- 読み書きを防ぐ最低限の境界として、本人（owner_id = auth.uid()）
-- 以外からの読み書きを禁止する。

alter table reflections enable row level security;
alter table study_logs enable row level security;
alter table tasks enable row level security;

create policy "owner_only" on reflections
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner_only" on study_logs
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner_only" on tasks
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
