-- Side quests, moment uploads and "nights started" counts. Safe to re-run.

-- 1. Which side quests a person did, skipped or missed (private: you only see your own).
create table if not exists quest_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references night_sessions on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  quest_id text not null,
  status text not null check (status in ('done', 'skipped', 'missed')),
  created_at timestamptz default now()
);
create index if not exists quest_completions_user_idx on quest_completions (user_id, created_at desc);
alter table quest_completions enable row level security;
drop policy if exists "own quest completions" on quest_completions;
create policy "own quest completions" on quest_completions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2. How many nights have been started on each experience. Counts only, so it is safe to show to everyone.
create or replace view experience_stats as
  select experience_id, count(*)::int as nights
  from night_sessions
  where experience_id is not null
  group by experience_id;
grant select on experience_stats to anon, authenticated;

-- 3. A private bucket for photos and videos people choose to share. Files live under <user id>/<night id>/,
--    and each person can only read and write their own folder.
insert into storage.buckets (id, name, public) values ('moments', 'moments', false) on conflict (id) do nothing;

drop policy if exists "moments upload own folder" on storage.objects;
create policy "moments upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moments read own folder" on storage.objects;
create policy "moments read own folder" on storage.objects for select to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moments update own folder" on storage.objects;
create policy "moments update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "moments delete own folder" on storage.objects;
create policy "moments delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'moments' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. Drink details: what it was, how it was served, a 1 to 5 rating, the price and a note. Private to each person,
--    like the rest of drink_logs. Nothing here records strength or amounts for ranking.
alter table drink_logs
  add column if not exists item text,
  add column if not exists size text,
  add column if not exists price_cad numeric(6,2),
  add column if not exists rating smallint check (rating between 1 and 5),
  add column if not exists note text;
