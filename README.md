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

Screens currently use illustrative mock data from `app/data/mock.ts`.
