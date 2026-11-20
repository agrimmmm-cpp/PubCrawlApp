-- Friends feed: shared nights, cheers, and add-by-code. Safe to re-run.
-- Privacy: nothing is visible to friends unless the person posts it. A post never carries what was drunk, how much,
-- or what it cost; only the night card numbers (time, stops, side-quest points), a caption and chosen photos.

-- 1. A short code per person, for "add me" links. Adding by code only sends a friend request; it never skips approval.
create or replace function make_invite_code() returns text
language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I/L
  c text;
begin
  loop
    c := '';
    for i in 1..8 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from profiles where invite_code = c);
  end loop;
  return c;
end $$;

alter table profiles add column if not exists invite_code text;
update profiles set invite_code = make_invite_code() where invite_code is null;
alter table profiles alter column invite_code set default make_invite_code();
alter table profiles alter column invite_code set not null;
create unique index if not exists profiles_invite_code_idx on profiles (invite_code);

create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  )
$$;

-- Returns: not_found | self | friends | requested | pending (you already asked) | accepted (they had asked you).
create or replace function friend_request_by_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  them uuid;
  existing friendships%rowtype;
begin
  if me is null then return 'not_found'; end if;
  select id into them from profiles where invite_code = upper(trim(p_code));
  if them is null then return 'not_found'; end if;
  if them = me then return 'self'; end if;

  select * into existing from friendships
    where (requester_id = me and addressee_id = them) or (requester_id = them and addressee_id = me);
  if found then
    if existing.status = 'accepted' then return 'friends'; end if;
    if existing.requester_id = me then return 'pending'; end if;
    update friendships set status = 'accepted' where requester_id = them and addressee_id = me;
    return 'accepted';
  end if;
  insert into friendships (requester_id, addressee_id) values (me, them);
  return 'requested';
end $$;

-- 2. Shared nights.
create table if not exists night_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  session_id uuid unique references night_sessions on delete set null,
  experience_id uuid references experiences on delete set null,
  title text not null check (char_length(title) <= 80),
  caption text check (char_length(caption) <= 280),
  stats jsonb not null default '{}'::jsonb,           -- duration, stops, chaos, rank, moments. Never drinks or spend.
  photos text[] not null default '{}' check (cardinality(photos) <= 6),  -- paths in the `shared` bucket
  created_at timestamptz not null default now()
);
create index if not exists night_posts_author_idx on night_posts (author_id, created_at desc);
alter table night_posts enable row level security;

drop policy if exists "see own and friends posts" on night_posts;
create policy "see own and friends posts" on night_posts for select
  using (author_id = auth.uid() or are_friends(author_id, auth.uid()));
drop policy if exists "post as yourself" on night_posts;
create policy "post as yourself" on night_posts for insert with check (author_id = auth.uid());
drop policy if exists "edit own post" on night_posts;
create policy "edit own post" on night_posts for update using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "delete own post" on night_posts;
create policy "delete own post" on night_posts for delete using (author_id = auth.uid());

-- 3. Cheers: one tap, no text, no counts that rank people.
create table if not exists post_cheers (
  post_id uuid not null references night_posts on delete cascade,
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table post_cheers enable row level security;
drop policy if exists "see cheers on visible posts" on post_cheers;
create policy "see cheers on visible posts" on post_cheers for select
  using (exists (select 1 from night_posts p where p.id = post_id));
drop policy if exists "cheer a visible post" on post_cheers;
create policy "cheer a visible post" on post_cheers for insert
  with check (user_id = auth.uid() and exists (select 1 from night_posts p where p.id = post_id));
drop policy if exists "take back a cheer" on post_cheers;
create policy "take back a cheer" on post_cheers for delete using (user_id = auth.uid());

-- 4. Photos you chose to post live in their own private bucket, readable by you and your accepted friends only.
--    (The `moments` bucket stays private to its owner.) Files are under <user id>/<post id>/.
insert into storage.buckets (id, name, public) values ('shared', 'shared', false) on conflict (id) do nothing;

drop policy if exists "shared upload own folder" on storage.objects;
create policy "shared upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'shared' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "shared read own and friends" on storage.objects;
create policy "shared read own and friends" on storage.objects for select to authenticated
  using (bucket_id = 'shared' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or are_friends(((storage.foldername(name))[1])::uuid, auth.uid())
  ));
drop policy if exists "shared delete own folder" on storage.objects;
create policy "shared delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'shared' and (storage.foldername(name))[1] = auth.uid()::text);
