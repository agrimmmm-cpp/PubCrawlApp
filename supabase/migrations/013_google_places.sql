-- Google Places: the one thing we may keep is the place id. Photos, ratings, prices and hours are fetched live by the
-- place-info Edge Function and are never stored here (Google's Places policies forbid caching them).
-- Also a daily call budget, so a bug or a busy night can never run up the Google bill. Safe to re-run.

alter table places add column if not exists google_place_id text;
create index if not exists places_google_idx on places (google_place_id) where google_place_id is not null;

-- One row per person per day: how many Google requests they have caused. Only the Edge Function (service role)
-- reads or writes it, so there are no policies.
create table if not exists google_usage (
  day date not null default current_date,
  user_id uuid not null,
  calls int not null default 0,
  primary key (day, user_id)
);
alter table google_usage enable row level security;

-- Called by the Edge Function before it talks to Google. Returns false (and counts nothing) when this person or the
-- whole app would go over today's limit.
create or replace function google_usage_bump(p_user uuid, p_calls int, p_user_limit int, p_global_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  mine int;
  total int;
begin
  insert into google_usage (day, user_id, calls) values (current_date, p_user, 0) on conflict do nothing;
  select calls into mine from google_usage where day = current_date and user_id = p_user for update;
  select coalesce(sum(calls), 0) into total from google_usage where day = current_date;
  if mine + p_calls > p_user_limit or total + p_calls > p_global_limit then
    return false;
  end if;
  update google_usage set calls = calls + p_calls where day = current_date and user_id = p_user;
  return true;
end;
$$;

revoke all on function google_usage_bump(uuid, int, int, int) from public, anon, authenticated;
grant execute on function google_usage_bump(uuid, int, int, int) to service_role;
