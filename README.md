# DrunkVA

Go out. Find your vibe. Make memories. See [DRUNKVA_2.0.md](DRUNKVA_2.0.md) for the product plan.

- `app/` Expo (React Native) app with five tabs: Discover, Explore, Live (centre button), Social, Passport.
- `supabase/schema.sql` database schema (Place, Experience, Night Session). Run it in the Supabase SQL editor, then `supabase/seed.sql` for sample data, then `supabase/migrations/002_social_live.sql` for friends, joining and live nights.

## Run

```bash
cd app
cp .env.example .env.local   # add your Supabase URL and anon key (.env.local is git-ignored)
npm install
npx expo start
```

## Loading Metro Vancouver data

Places come from OpenStreetMap (free, no key) and experiences are generated from them by rules:

```bash
python3 scripts/ingest_osm.py            # pulls 14 cities into supabase/data/places_metro_vancouver.csv
python3 scripts/generate_experiences.py > supabase/migrations/007_generated_experiences.sql
```

Load order in the Supabase SQL editor: `004_curation.sql`, `005_places_ingest.sql`, then import
`supabase/data/places_metro_vancouver.csv` into the `places_import` table (Table Editor → Insert → Import data from
CSV), then `006_merge_import.sql`, then `007_generated_experiences.sql`. All of them are safe to re-run.
Data © OpenStreetMap contributors (ODbL).

## Curating places and experiences

The editorial layer lives in `supabase/curation/` as three CSVs: `places.csv` (why go, tip, vibe, price, music, 19+),
`experiences.csv` (why this order, best night, start time) and `stops.csv` (minutes at each stop, tip). Fill in what
you know, then:

```bash
python3 supabase/curation/build_sql.py > supabase/migrations/005_curation_data.sql
```

Run `004_curation.sql` once, then run the generated `005_curation_data.sql` in the Supabase SQL editor. Blank cells are
skipped and bad values are rejected, so you can fill things in gradually and re-run.

Screens currently use illustrative mock data from `app/data/mock.ts`.
