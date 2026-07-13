-- Project ARC — schema
-- 対象: supabase CLI が起動するローカルPostgres（ADR 0001）
-- 適用方法: supabase/migrations/ 配下にコピーし `supabase db reset` で適用する想定
-- 注意: Version2の既定の永続化はJSONファイル（ADR 0003）。本スキーマは
-- --db=supabase を選択した場合のみ使用する。

create table if not exists reflections (
  id uuid primary key,
  date date not null unique,
  sleep_hours numeric(4, 1),
  study_minutes integer,
  did_martial_arts boolean not null default false,
  did_english_lesson boolean not null default false,
  did_attend_class boolean not null default false,
  plan_achieved boolean not null default false,
  mood text check (mood in ('great', 'good', 'neutral', 'low', 'bad')),
  expense_yen integer,
  notes text,
  proud_of text,
  todays_events text,
  tomorrows_goal text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reflections_date on reflections (date desc);

-- Version1時点ではRLSは有効化しない（単一ユーザー・ローカル運用のため）。
-- Version2でクラウド接続・認証を導入する際にRLSポリシーを追加する（ADR 0001参照）。

create table if not exists study_logs (
  id uuid primary key,
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
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'in-progress', 'done')),
  due_date date,
  created_at timestamptz not null default now()
);

-- Version2: Life Inventory（MVP）
create table if not exists inventory_items (
  id uuid primary key,
  name text not null,
  category text not null check (
    category in ('財布', '傘', 'シェーバー', 'スキンケア', '靴', '服', 'ガジェット', 'その他')
  ),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inventory_items_category on inventory_items (category);
