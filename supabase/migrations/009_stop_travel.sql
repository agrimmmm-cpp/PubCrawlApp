-- Far-apart stops (a scenic finale across town) need a ride, not a walk. Safe to re-run.
alter table experience_stops
  add column if not exists travel_mode text default 'walk' check (travel_mode in ('walk', 'ride'));
-- travel_mode describes how you get TO this stop from the previous one.
