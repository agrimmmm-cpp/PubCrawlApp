-- Merge the staged OpenStreetMap rows into places, then empty the staging table.
-- Re-run safe. Only touches the imported columns: curated text (why_go, tip, vibe...) is never overwritten,
-- and existing place ids (used by experience stops) are kept.

insert into places (source, source_id, name, category, subcategory, emoji, city, lat, lng, address,
                    hours, late_night, website, phone, cuisine, is_chain, quality)
select 'osm', source_id, name, category, subcategory, emoji, city, lat::double precision, lng::double precision,
       nullif(address, ''), nullif(hours, '')::jsonb, late_night::boolean, nullif(website, ''), nullif(phone, ''),
       nullif(cuisine, ''), is_chain::boolean, quality::smallint
from places_import
where name is not null and name <> ''
on conflict (source, source_id) do update set
  name = excluded.name, category = excluded.category, subcategory = excluded.subcategory,
  emoji = excluded.emoji, city = excluded.city, lat = excluded.lat, lng = excluded.lng,
  address = excluded.address, hours = excluded.hours, late_night = excluded.late_night,
  website = excluded.website, phone = excluded.phone, cuisine = excluded.cuisine,
  is_chain = excluded.is_chain, quality = excluded.quality;

truncate places_import;
