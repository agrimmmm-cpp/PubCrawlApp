-- Real Downtown Vancouver places and five draft experiences.
-- Source: OpenStreetMap contributors (ODbL), pulled via Overpass. Venue details are UNVERIFIED:
-- confirm each stop is open and its hours before launch. Groupings and durations are estimates.
-- Run after schema.sql, seed.sql and 002_social_live.sql. Safe to re-run. Replaces the sample seed.

alter table places add column if not exists source text;
alter table places add column if not exists source_id text;
alter table places add column if not exists website text;
alter table places add column if not exists late_night boolean default false;
create unique index if not exists places_source_unique on places (source, source_id);

-- Remove the placeholder sample data (and any earlier run of this file).
update night_sessions set experience_id = null where experience_id in (
  select e.id from experiences e where e.title in ('Gastown After Dark','Granville Strip Run','Golden Hour Date Night','Gastown Pub Crawl','Yaletown Wind-Down')
  or e.id in (select s.experience_id from experience_stops s join places p on p.id = s.place_id where p.name like 'Sample %'));
delete from experiences where title in ('Gastown After Dark','Granville Strip Run','Golden Hour Date Night','Gastown Pub Crawl','Yaletown Wind-Down')
  or id in (select s.experience_id from experience_stops s join places p on p.id = s.place_id where p.name like 'Sample %');
delete from places where name like 'Sample %';

insert into places (name, category, lat, lng, address, hours, website, emoji, late_night, source, source_id) values
  ('Los Sapos Tacos', 'food', 49.279365, -123.099084, '210 Keefer Street', '{"osm": "Fr-Sa 17:30-03:00; Mo-Th 17:30-23:00; Sa 18:00-22:00"}'::jsonb, 'https://www.lossapostacos.com/', '🍽️', true, 'osm', 'node/10928025178'),
  ('The Keefer Bar', 'bar', 49.27962, -123.101326, '133 Keefer Street', '{"osm": "Su-Th 16:00-25:00; Fr-Sa 16:00-26:00"}'::jsonb, 'https://thekeeferbar.com/', '🍸', true, 'osm', 'node/3933398898'),
  ('Guilt & Co', 'bar', 49.283657, -123.104122, '1 Alexander Street', '{"osm": "Mo-Su 19:00-02:00"}'::jsonb, 'https://www.guiltandcompany.com/', '🍸', true, 'osm', 'node/2138612021'),
  ('Fortune Sound Club', 'nightclub', 49.280521, -123.100738, '147 East Pender Street', '{"osm": "Fr-Sa,Mo 22:00-02:00; Su,Tu-Th off"}'::jsonb, 'https://www.fortunesoundclub.com/', '🪩', true, 'osm', 'node/11062762211'),
  ('Uncle Fatih''s Pizza', 'food', 49.279259, -123.107425, '638 Abbott Street', '{"osm": "Mo 10:30-14:00; Tu-Th 10:30-01:00; Fr 10:30-03:00; Sa 12:00-03:00; Su 12:00-24:00"}'::jsonb, null, '🍽️', true, 'osm', 'node/1430596606'),
  ('Kinton Ramen', 'food', 49.2795, -123.117231, '420 Robson Street', '{"osm": "Mo-Su 11:00-24:00"}'::jsonb, null, '🍽️', false, 'osm', 'node/3843237361'),
  ('The Rec Room', 'activity', 49.280841, -123.120939, '855 Granville Street', '{"osm": "Mo-Su 10:30-24:00"}'::jsonb, 'https://www.therecroom.com/granville/', '🕹️', false, 'osm', 'node/12454888380'),
  ('Prophecy Cocktail Bar', 'bar', 49.283499, -123.118883, '801 West Georgia Street', '{"osm": "Mo-We 16:00-24:00; Th 16:00-25:00; Fr-Sa 16:00-26:00; Su 16:00-24:30"}'::jsonb, 'https://www.prophecybar.com', '🍸', true, 'osm', 'node/13751644028'),
  ('The Roxy Cabaret', 'nightclub', 49.279758, -123.121991, '932 Granville Street', '{"osm": "Mo,Tu 21:00-03:00, We,Th 20:00-03:00, Fr,Sa 19:00-03:00, Su 20:00-03:00"}'::jsonb, 'http://www.roxyvan.com/', '🪩', true, 'osm', 'node/9943988292'),
  ('Mean Poutine', 'food', 49.279356, -123.123413, '718 Nelson Street', '{"osm": "Mo-Th 11:00-23:00; Fr,Sa 11:00-04:00"}'::jsonb, 'https://www.meanpoutine.ca/', '🍽️', true, 'osm', 'node/2490635045'),
  ('Harbour Centre Lookout Tower', 'viewpoint', 49.284611, -123.112316, '555 West Hastings Street', '{"osm": "Oct-May 09:00-21:00; Jun-Sep 08:30-22:30"}'::jsonb, 'https://www.vancouverlookout.com/', '🌆', false, 'osm', 'node/889550078'),
  ('Kissa Tanto', 'food', 49.280478, -123.098177, '263 East Pender Street', '{"osm": "We-Th 17:30-23:00; Fr-Sa 17:30-24:00; Su 17:30-23:00"}'::jsonb, 'https://www.kissatanto.com/', '🍽️', false, 'osm', 'node/11566576120'),
  ('Pourhouse', 'bar', 49.284131, -123.108383, '162 Water Street', '{"osm": "Mo-Th,Su 17:00-00:00; Fr,Sa 17:00-01:00"}'::jsonb, 'https://www.pourhousevancouver.com/', '🍸', true, 'osm', 'node/4390232892'),
  ('Alibi Room', 'bar', 49.28422, -123.100219, '157 Alexander Street', '{"osm": "Mo-Th 17:00-23:30; Fr 17:00-00:30; Sa 10:00-14:45,17:00-00:30; Su 10:00-14:45,17:00-23:30"}'::jsonb, 'https://alibi.ca/', '🍸', true, 'osm', 'node/563321283'),
  ('The Lamplighter Public House', 'bar', 49.283744, -123.106246, '92 Water Street', '{"osm": "We 16:00-24:00; Th 16:00-25:00; Fr 16:00-17:00; Sa 12:00-27:00; Su 12:00-24:00"}'::jsonb, 'https://www.freehouse.co/locations/lamplighter', '🍸', true, 'osm', 'node/5120582599'),
  ('Devil''s Elbow Ale and Smoke House', 'bar', 49.280266, -123.109748, '562 Beatty Street', '{"osm": "Mo-Th 11:30-00:00; Fr-Sa 11:30-01:00; Su 15:00-00:00"}'::jsonb, 'https://www.devilselbowalehouse.com/', '🍸', true, 'osm', 'node/3646941329'),
  ('Steamworks', 'bar', 49.284869, -123.110987, '375 Water Street', '{"osm": "Su-Th 11:30-00:00; Fr-Sa 11:30-01:00"}'::jsonb, 'https://steamworks.com/brew-pub', '🍸', true, 'osm', 'node/505751513'),
  ('Black Frog Eatery', 'bar', 49.284607, -123.108511, '108 Cambie Street', '{"osm": "Mo-Th 11:00-24:00; Fr 11:00-26:00; Sa 10:00-26:00; Su 10:00-24:00"}'::jsonb, 'https://www.theblackfrog.ca', '🍸', true, 'osm', 'node/1938712075'),
  ('Dovetail', 'food', 49.275924, -123.12031, '1079 Mainland Street', '{"osm": "Su-Th 11:30-00:00; Fr-Sa 11:30-01:00"}'::jsonb, 'https://www.dovetailrestaurant.ca', '🍽️', true, 'osm', 'node/4842907238'),
  ('Bartholomew', 'bar', 49.276088, -123.119574, '1026 Mainland Street', '{"osm": "Su-We 17:00-00:00; Th-Sa 17:00-01:00"}'::jsonb, 'https://www.bartholomewbar.com/', '🍸', true, 'osm', 'node/8533748445'),
  ('Yaletown Brewing Company', 'bar', 49.275444, -123.121015, null, '{"osm": "Mo-Th 11:30-23:00, Fr 11:30-02:00, Sa 10:00-03:00, Su 10:00-23:00"}'::jsonb, 'https://www.mjg.ca/yaletown/', '🍸', true, 'osm', 'node/903721300'),
  ('The Morrissey', 'bar', 49.27691, -123.126866, '1227 Granville Street', '{"osm": "Su-Th 11:00-02:00; Fr-Sa 11:00-03:00"}'::jsonb, 'https://www.themorrissey.com/', '🍸', true, 'osm', 'node/3725347745')
on conflict (source, source_id) do update set name = excluded.name, hours = excluded.hours, late_night = excluded.late_night;

insert into experiences (title, badge, emoji, gradient, duration_minutes, description, vibe, is_curated, is_public) values
  ('Gastown After Dark', 'HIGH ENERGY', '🌃', array['#3A0F5C','#FF5C00'], 270, '3Tacos, cocktails, live music and dancing, ending with a late bite.', array['nightlife','groups'], true, true),
  ('Granville Strip Run', 'GAMES + CLUBS', '🕹️', array['#4A0E0E','#FFD60A'], 300, 'Ramen, arcade games, cocktails and a club, then poutine.', array['games','groups'], true, true),
  ('Golden Hour Date Night', 'DATE NIGHT', '🌅', array['#0B2A4A','#2D9CFF'], 210, 'City views, a proper dinner, cocktails and a nightcap.', array['scenic','date'], true, true),
  ('Gastown Pub Crawl', 'CLASSIC', '🍺', array['#3A2A0F','#FF5C00'], 240, 'Craft beer and proper pubs across Gastown.', array['pubs','friends'], true, true),
  ('Yaletown Wind-Down', 'CHILL', '🍸', array['#1A0F3A','#FF3D81'], 180, 'Dinner, cocktails and a relaxed beer in Yaletown.', array['chill','mixed groups'], true, true);

insert into experience_stops (experience_id, position, place_id)
select e.id, s.pos, p.id from (values
  ('Gastown After Dark', 1, 'node/10928025178'),
  ('Gastown After Dark', 2, 'node/3933398898'),
  ('Gastown After Dark', 3, 'node/2138612021'),
  ('Gastown After Dark', 4, 'node/11062762211'),
  ('Gastown After Dark', 5, 'node/1430596606'),
  ('Granville Strip Run', 1, 'node/3843237361'),
  ('Granville Strip Run', 2, 'node/12454888380'),
  ('Granville Strip Run', 3, 'node/13751644028'),
  ('Granville Strip Run', 4, 'node/9943988292'),
  ('Granville Strip Run', 5, 'node/2490635045'),
  ('Golden Hour Date Night', 1, 'node/889550078'),
  ('Golden Hour Date Night', 2, 'node/11566576120'),
  ('Golden Hour Date Night', 3, 'node/3933398898'),
  ('Golden Hour Date Night', 4, 'node/4390232892'),
  ('Gastown Pub Crawl', 1, 'node/563321283'),
  ('Gastown Pub Crawl', 2, 'node/5120582599'),
  ('Gastown Pub Crawl', 3, 'node/3646941329'),
  ('Gastown Pub Crawl', 4, 'node/505751513'),
  ('Gastown Pub Crawl', 5, 'node/1938712075'),
  ('Yaletown Wind-Down', 1, 'node/4842907238'),
  ('Yaletown Wind-Down', 2, 'node/8533748445'),
  ('Yaletown Wind-Down', 3, 'node/903721300'),
  ('Yaletown Wind-Down', 4, 'node/3725347745')
) as s(title, pos, osm_id)
join experiences e on e.title = s.title
join places p on p.source = 'osm' and p.source_id = s.osm_id;
