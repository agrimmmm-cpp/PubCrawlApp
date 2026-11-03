import { useEffect, useState } from 'react';

import { Place, PlaceCategory, places as mockPlaces } from '@/data/mock';
import type { Near } from '@/lib/location';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { vibeById } from '@/lib/vibes';

export type Row = {
  id: string;
  name: string;
  category: string;
  emoji: string | null;
  lat: number;
  lng: number;
  address: string | null;
  hours: { osm?: string } | null;
  late_night: boolean | null;
  why_go: string | null;
  tip: string | null;
  vibe: string[] | null;
  price_level: number | null;
  music: string | null;
  age_19: boolean | null;
  verified_at: string | null;
  city?: string | null;
  subcategory?: string | null;
};

export const toPlace = (r: Row): Place => ({
  id: r.id,
  name: r.name,
  category: r.category as PlaceCategory,
  emoji: r.emoji ?? '📍',
  lat: r.lat,
  lng: r.lng,
  address: r.address ?? '',
  hours: r.hours?.osm ?? '',
  late: !!r.late_night,
  whyGo: r.why_go ?? undefined,
  tip: r.tip ?? undefined,
  vibe: r.vibe?.length ? r.vibe : undefined,
  priceLevel: r.price_level ?? undefined,
  music: r.music ?? undefined,
  age19: r.age_19 ?? undefined,
  verifiedAt: r.verified_at ?? undefined,
  city: r.city ?? undefined,
  subcategory: r.subcategory ?? undefined,
});

export const PLACE_COLUMNS =
  'id,name,category,emoji,lat,lng,address,hours,late_night,why_go,tip,vibe,price_level,music,age_19,verified_at';

// Columns added by migration 005. Used for browsing; experiences only need PLACE_COLUMNS.
const EXT_COLUMNS = `${PLACE_COLUMNS},city,subcategory`;

export const CITIES = [
  'Vancouver', 'Burnaby', 'Surrey', 'Richmond', 'North Vancouver', 'West Vancouver', 'New Westminster',
  'Coquitlam', 'Port Coquitlam', 'Port Moody', 'Delta', 'Langley', 'White Rock', 'Maple Ridge',
];

const PAGE_SIZE = 60;
const snap = (n: number) => Math.round(n / 0.02) * 0.02; // ~2 km grid: only a coarse area is sent to the server

function km(a: Near, b: Near) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// How each mood maps onto the places table. Keep in step with VIBES in lib/vibes.ts.
const MOOD_FILTERS: Record<string, { subs?: string[]; category?: string; late?: boolean }> = {
  pub: { subs: ['pub', 'beer garden'] },
  brewery: { subs: ['brewery', 'distillery'] },
  cocktails: { subs: ['bar'] },
  dance: { subs: ['nightclub'] },
  'live-music': { subs: ['live music'] },
  games: { subs: ['arcade', 'bowling', 'escape room', 'mini golf', 'trampoline'] },
  karaoke: { subs: ['karaoke'] },
  scenic: { category: 'viewpoint' },
  date: { subs: ['theatre', 'cinema'] },
  eats: { category: 'food', late: true },
};

type Opts = { city?: string; near?: Near; vibe?: string; lateOnly?: boolean; query: string };

const matches = (p: Place, o: Opts) => {
  const v = o.vibe ? vibeById(o.vibe) : undefined;
  return (!v || v.place(p)) && (!o.lateOnly || p.late) && (!o.query || p.name.toLowerCase().includes(o.query.toLowerCase()));
};

/**
 * Browse places by city or Near me, mood, "open late" and search. Filtering happens in the database and
 * only one small page is fetched, so thousands of places never reach the phone.
 */
export function usePlaceSearch(opts: Opts) {
  const { city, near, vibe, lateOnly, query } = opts;
  const nearLat = near?.lat;
  const nearLng = near?.lng;
  const [places, setPlaces] = useState<Place[]>(() => mockPlaces);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    const o: Opts = { city, vibe, lateOnly, query: query.trim() };
    if (!supabaseConfigured) {
      setPlaces(mockPlaces.filter((p) => matches(p, o)));
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      let q = supabase.from('places').select(EXT_COLUMNS);
      if (nearLat != null && nearLng != null) {
        const la = snap(nearLat);
        const ln = snap(nearLng);
        q = q.gte('lat', la - 0.04).lte('lat', la + 0.04).gte('lng', ln - 0.06).lte('lng', ln + 0.06);
      } else {
        q = q.eq('city', city ?? 'Vancouver');
      }
      const f = vibe ? MOOD_FILTERS[vibe] : undefined;
      if (f?.subs) q = q.in('subcategory', f.subs);
      if (f?.category) q = q.eq('category', f.category);
      if (f?.late || lateOnly) q = q.eq('late_night', true);
      const term = o.query.replace(/[%_\\]/g, (c) => `\\${c}`);
      if (term) q = q.ilike('name', `%${term}%`);
      // Independent venues first, then the most complete records.
      const res = await q
        .order('is_chain', { ascending: true })
        .order('quality', { ascending: false })
        .order('name')
        .limit(nearLat != null ? 200 : PAGE_SIZE);
      if (cancelled) return;

      if (!res.error) {
        let list = (res.data as unknown as Row[]).map(toPlace);
        if (nearLat != null && nearLng != null) {
          const here = { lat: nearLat, lng: nearLng };
          list = list
            .map((p) => ({ ...p, distanceKm: km(here, { lat: p.lat, lng: p.lng }) }))
            .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number))
            .slice(0, PAGE_SIZE);
        }
        setPlaces(list);
        setLoading(false);
        return;
      }
      // The browse columns (migration 005) are not in the database yet: fall back to the original table.
      const old = await supabase.from('places').select(PLACE_COLUMNS).order('name').limit(200);
      if (cancelled) return;
      if (!old.error && old.data) setPlaces((old.data as unknown as Row[]).map(toPlace).filter((p) => matches(p, o)));
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, nearLat, nearLng, vibe, lateOnly, query]);

  return { places, loading, capped: places.length >= PAGE_SIZE };
}
