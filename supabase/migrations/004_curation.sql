-- Curation layer: the editorial fields no map API provides. Safe to re-run.

alter table places
  add column if not exists why_go text,                      -- one line: why this place is worth it
  add column if not exists tip text,                         -- insider tip (what to order, when to arrive)
  add column if not exists vibe text[] default '{}',         -- e.g. loud, chill, dance floor, live music
  add column if not exists best_for text[] default '{}',     -- e.g. groups, dates, solo
  add column if not exists music text,
  add column if not exists age_19 boolean,                   -- true if 19+ (BC legal drinking age)
  add column if not exists verified_at date;                 -- when a human last checked it

-- price_level (1-4) already exists on places.

alter table experiences
  add column if not exists why_order text,                   -- why the stops are in this order
  add column if not exists best_night text,                  -- e.g. 'Fri-Sat'
  add column if not exists start_time text                   -- suggested start, 24h 'HH:MM'
    check (start_time is null or start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

alter table experience_stops
  add column if not exists stay_minutes smallint check (stay_minutes is null or stay_minutes > 0),
  add column if not exists tip text;                         -- tip for this point in the night
-- experience_stops.note already exists; tip is the new curated field.
