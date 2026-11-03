-- Columns and staging table for bulk-loading places pulled from OpenStreetMap. Safe to re-run.

alter table places
  add column if not exists subcategory text,        -- pub, arcade, karaoke, brewery, bowling...
  add column if not exists city text,
  add column if not exists phone text,
  add column if not exists cuisine text,
  add column if not exists is_chain boolean default false,
  add column if not exists quality smallint default 0;  -- how complete the OSM record is (0-9)

create index if not exists places_city_idx on places (city);
create index if not exists places_category_idx on places (category);
create index if not exists places_late_idx on places (late_night) where late_night;

-- Staging table: import data/places_metro_vancouver.csv here with the dashboard's CSV import,
-- then run 006_merge_import.sql. Locked down: no policies, so the app cannot read or write it.
create table if not exists places_import (
  source_id text, name text, category text, subcategory text, emoji text, city text,
  lat text, lng text, address text, hours text, late_night text, website text, phone text,
  cuisine text, is_chain text, quality text
);
alter table places_import enable row level security;
