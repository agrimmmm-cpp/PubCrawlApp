-- Per-stop ratings and real Passport stats. Safe to re-run.

create table if not exists stop_ratings (
  session_id uuid references night_sessions on delete cascade,
  user_id uuid references profiles on delete cascade default auth.uid(),
  place_id uuid references places on delete cascade,
  rating smallint not null check (rating in (-1, 1)),   -- 1 = thumbs up, -1 = thumbs down
  created_at timestamptz default now(),
  primary key (session_id, user_id, place_id)
);
alter table stop_ratings enable row level security;
drop policy if exists "own ratings" on stop_ratings;
create policy "own ratings" on stop_ratings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Public totals only: nobody can see who rated what. The view runs as its owner, so it can count
-- everyone's ratings while the table itself stays private.
create or replace view place_scores as
  select place_id,
         count(*) filter (where rating = 1)  as up,
         count(*) filter (where rating = -1) as down
  from stop_ratings group by place_id;
grant select on place_scores to anon, authenticated;

-- Passport numbers for the signed-in user, counted from their finished nights.
create or replace function my_passport() returns json
language sql stable as $$
  with mine as (
    select id, experience_id, current_stop from night_sessions
    where owner_id = auth.uid() and ended_at is not null
  ), visited as (
    select distinct p.id as place_id, p.city
    from mine m
    join experience_stops s on s.experience_id = m.experience_id and s.position <= greatest(m.current_stop, 1)
    join places p on p.id = s.place_id
  )
  select json_build_object(
    'nights',  (select count(*) from mine),
    'places',  (select count(*) from visited),
    'cities',  (select count(distinct city) from visited where city is not null),
    'moments', (select count(*) from drink_logs d where d.user_id = auth.uid() and d.kind = 'moment')
  );
$$;
