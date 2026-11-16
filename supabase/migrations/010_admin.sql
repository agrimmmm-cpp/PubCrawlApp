-- Admin role: lets you create and edit experiences from the app. Safe to re-run.

alter table profiles add column if not exists is_admin boolean not null default false;
alter table experiences add column if not exists featured boolean not null default false;

-- True for the signed-in user when their profile is marked admin. Security definer so it can read the flag
-- without opening profiles up, and so policies that call it do not recurse into profiles' own policies.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- A signed-in user must never be able to make themselves admin by updating their own profile. Changes made from
-- the SQL editor (no signed-in user) are allowed: that is how you grant admin the first time.
create or replace function protect_is_admin() returns trigger
language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.uid() is not null and not is_admin() then
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;
drop trigger if exists protect_is_admin on profiles;
create trigger protect_is_admin before update on profiles for each row execute function protect_is_admin();

-- Admins see everything, including drafts and hidden experiences.
drop policy if exists "admins read all experiences" on experiences;
create policy "admins read all experiences" on experiences for select using (is_admin());
drop policy if exists "admins write experiences" on experiences;
create policy "admins write experiences" on experiences for all using (is_admin()) with check (is_admin());
drop policy if exists "admins write stops" on experience_stops;
create policy "admins write stops" on experience_stops for all using (is_admin()) with check (is_admin());
-- Admins may correct places (names, hours, tips...) but not delete the OpenStreetMap record.
drop policy if exists "admins update places" on places;
create policy "admins update places" on places for update using (is_admin()) with check (is_admin());

-- To make yourself admin, run this once in the SQL editor with your own email:
--   update profiles set is_admin = true where id = (select id from auth.users where email = 'you@example.com');
