-- Run after schema.sql and seed.sql. Adds what Social and Live need to work against real accounts.

alter table drink_logs add column if not exists stop smallint;
-- drink_logs.kind also stores 'moment' until photo uploads (the moments table) are wired up.

-- Friends can see each other's open (not ended, not private) nights.
create policy "friends see open nights" on night_sessions for select using (
  ended_at is null
  and join_policy <> 'closed'
  and exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = owner_id and f.addressee_id = auth.uid())
        or (f.addressee_id = owner_id and f.requester_id = auth.uid()))
  )
);

create policy "see own memberships" on session_members for select using (user_id = auth.uid());

-- Joining runs server-side so a friend can never skip the host's join policy.
create or replace function join_night(p_session uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  n night_sessions%rowtype;
  me uuid := auth.uid();
begin
  select * into n from night_sessions where id = p_session and ended_at is null;
  if not found then return 'gone'; end if;
  if n.owner_id = me then return 'owner'; end if;
  if not exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = n.owner_id and f.addressee_id = me)
        or (f.addressee_id = n.owner_id and f.requester_id = me))
  ) then return 'not_friends'; end if;

  if n.join_policy = 'friends' then
    insert into session_members (session_id, user_id) values (p_session, me) on conflict do nothing;
    return 'joined';
  elsif n.join_policy = 'invite' then
    insert into join_requests (session_id, user_id) values (p_session, me)
      on conflict (session_id, user_id) do update set status = 'pending';
    return 'requested';
  end if;
  return 'closed';
end $$;

create or replace function answer_join_request(p_session uuid, p_user uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from night_sessions where id = p_session and owner_id = auth.uid()) then
    raise exception 'only the host can answer join requests';
  end if;
  update join_requests
    set status = case when p_approve then 'approved' else 'declined' end
    where session_id = p_session and user_id = p_user;
  if p_approve then
    insert into session_members (session_id, user_id) values (p_session, p_user) on conflict do nothing;
  end if;
end $$;
