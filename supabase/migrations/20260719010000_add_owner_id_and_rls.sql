-- ADR 0003: owner_id列 + RLSを追加する。
-- 前提: 各テーブルは空、またはowner_id backfillが不要な状態であること
-- （Version1〜2序盤は本番データが無いため、defaultによる自動補完で足りる）。

alter table reflections add column if not exists owner_id uuid not null default auth.uid() references auth.users (id);
alter table study_logs add column if not exists owner_id uuid not null default auth.uid() references auth.users (id);
alter table tasks add column if not exists owner_id uuid not null default auth.uid() references auth.users (id);

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
