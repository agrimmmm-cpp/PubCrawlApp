-- DrunkVA core schema: Place, Experience, Night Session (see DRUNKVA_2.0.md section 10).
-- Run in the Supabase SQL editor.

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  avatar_url text,
  home_city text default 'Vancouver',
  created_at timestamptz default now()
);

create table places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,          -- bar, food, after_hours, activity, viewpoint, event
  lat double precision not null,
  lng double precision not null,
  address text,
  price_level smallint check (price_level between 1 and 4),
  hours jsonb,
  tags text[] default '{}',
  image_url text,
  emoji text default '📍',
  created_at timestamptz default now()
);

create table experiences (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles on delete set null,
  title text not null,
  description text,
  vibe text[] default '{}',
  duration_minutes int,
  est_cost_cad int,
  is_curated boolean default false,
  is_public boolean default true,
  remixed_from uuid references experiences,
  emoji text default '✨',
  badge text,
  gradient text[] default array['#3A0F5C', '#FF5C00'],
  rating numeric(2,1),
  reviews int default 0,
  created_at timestamptz default now()
);

create table experience_stops (
  experience_id uuid references experiences on delete cascade,
  position smallint,
  place_id uuid references places,
  note text,
  primary key (experience_id, position)
);

create table night_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,
  experience_id uuid references experiences,   -- null = freestyle night
  started_at timestamptz default now(),
  ended_at timestamptz,
  current_stop smallint default 1,
  visibility text default 'private' check (visibility in ('private', 'friends', 'public'))
);

create table session_members (
  session_id uuid references night_sessions on delete cascade,
  user_id uuid references profiles on delete cascade,
  primary key (session_id, user_id)
);

create table moments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references night_sessions on delete cascade,
  author_id uuid references profiles,
  place_id uuid references places,
  media_url text not null,
  caption text,
  taken_at timestamptz default now()
);

-- Optional and private by default. Never ranked or shared unless the user opts in.
create table drink_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references night_sessions on delete cascade,
  user_id uuid references profiles on delete cascade,
  kind text not null,              -- beer, cocktail, water, food ...
  volume_ml int,
  abv numeric(4,1),
  logged_at timestamptz default now()
);

create table badges_earned (
  user_id uuid references profiles on delete cascade,
  badge text,
  earned_at timestamptz default now(),
  primary key (user_id, badge)
);

-- Social: friends and joining each other's nights.
create table friendships (
  requester_id uuid references profiles on delete cascade,
  addressee_id uuid references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table night_sessions
  add column join_policy text not null default 'friends' check (join_policy in ('friends', 'invite', 'closed'));

create table join_requests (
  session_id uuid references night_sessions on delete cascade,
  user_id uuid references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz default now(),
  primary key (session_id, user_id)
);

-- Create a profile row whenever someone signs up.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username) values (new.id, split_part(new.email, '@', 1))
  on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Row level security
alter table profiles enable row level security;
alter table places enable row level security;
alter table experiences enable row level security;
alter table experience_stops enable row level security;
alter table night_sessions enable row level security;
alter table session_members enable row level security;
alter table moments enable row level security;
alter table drink_logs enable row level security;
alter table badges_earned enable row level security;
alter table friendships enable row level security;
alter table join_requests enable row level security;

create policy "places readable" on places for select using (true);
create policy "public experiences readable" on experiences for select using (is_public or author_id = auth.uid());
create policy "own experiences writable" on experiences for all using (author_id = auth.uid());
create policy "stops readable" on experience_stops for select using (true);
create policy "profiles readable" on profiles for select using (auth.uid() is not null);
create policy "own profile writable" on profiles for update using (id = auth.uid());
create policy "own sessions" on night_sessions for all using (owner_id = auth.uid());
create policy "member sessions readable" on night_sessions for select
  using (exists (select 1 from session_members m where m.session_id = id and m.user_id = auth.uid()));
create policy "own moments" on moments for all using (author_id = auth.uid());
create policy "own drink logs" on drink_logs for all using (user_id = auth.uid());
create policy "own badges" on badges_earned for select using (user_id = auth.uid());

create policy "see own friendships" on friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "send friend request" on friendships for insert with check (requester_id = auth.uid());
create policy "answer friend request" on friendships for update using (addressee_id = auth.uid());
create policy "remove friendship" on friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "ask to join" on join_requests for insert with check (user_id = auth.uid());
create policy "see own or hosted join requests" on join_requests for select
  using (user_id = auth.uid() or exists (select 1 from night_sessions n where n.id = session_id and n.owner_id = auth.uid()));
create policy "host answers join requests" on join_requests for update
  using (exists (select 1 from night_sessions n where n.id = session_id and n.owner_id = auth.uid()));
