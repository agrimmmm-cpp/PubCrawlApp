-- SAMPLE data so Discover has something to show. Venue names are placeholders, not real
-- venues or verified itineraries. Replace with hand-curated Vancouver experiences.
with p as (
  insert into places (name, category, lat, lng, emoji) values
    ('Sample Taco Cantina',  'food',        49.2840, -123.1090, '🌮'),
    ('Sample Neon Den',      'bar',         49.2835, -123.1075, '🍸'),
    ('Sample Arcade',        'activity',    49.2829, -123.1068, '🕹️'),
    ('Sample Late Poutine',  'food',        49.2822, -123.1060, '🍟'),
    ('Sample Beach Lookout', 'viewpoint',   49.2860, -123.1430, '🌅'),
    ('Sample Craft Taproom', 'bar',         49.2850, -123.1400, '🍺'),
    ('Sample Seawall Walk',  'activity',    49.2845, -123.1380, '🚶'),
    ('Sample Gelato Window', 'food',        49.2840, -123.1360, '🍦'),
    ('Sample Pub Trivia',    'bar',         49.2810, -123.1200, '🧠'),
    ('Sample Karaoke Den',   'activity',    49.2805, -123.1190, '🎤'),
    ('Sample Speakeasy',     'bar',         49.2800, -123.1180, '🎷'),
    ('Sample Street Cart',   'food',        49.2795, -123.1170, '🌭')
  returning id, name
), e as (
  insert into experiences (title, badge, emoji, gradient, rating, reviews, duration_minutes, est_cost_cad, is_curated, is_public, vibe) values
    ('Gastown After Dark', 'FEATURED',    '🌃', array['#3A0F5C', '#FF5C00'], 4.9, 342, 270, 70, true, true, array['nightlife']),
    ('Sunset to Sunrise',  'DATE NIGHT',  '🌅', array['#0B2A4A', '#2D9CFF'], 4.8, 189, 210, 40, true, true, array['scenic']),
    ('The Chaos Circuit',  'HIGH ENERGY', '🎤', array['#4A0E0E', '#FFD60A'], 4.9, 512, 330, 75, true, true, array['games'])
  returning id, title
)
insert into experience_stops (experience_id, position, place_id)
select e.id, s.pos, p.id
from (values
  ('Gastown After Dark', 1, 'Sample Taco Cantina'),
  ('Gastown After Dark', 2, 'Sample Neon Den'),
  ('Gastown After Dark', 3, 'Sample Arcade'),
  ('Gastown After Dark', 4, 'Sample Late Poutine'),
  ('Sunset to Sunrise',  1, 'Sample Beach Lookout'),
  ('Sunset to Sunrise',  2, 'Sample Craft Taproom'),
  ('Sunset to Sunrise',  3, 'Sample Seawall Walk'),
  ('Sunset to Sunrise',  4, 'Sample Gelato Window'),
  ('The Chaos Circuit',  1, 'Sample Pub Trivia'),
  ('The Chaos Circuit',  2, 'Sample Karaoke Den'),
  ('The Chaos Circuit',  3, 'Sample Speakeasy'),
  ('The Chaos Circuit',  4, 'Sample Street Cart')
) as s(title, pos, place)
join e on e.title = s.title
join p on p.name = s.place;
