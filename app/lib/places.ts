import { useEffect, useState } from 'react';

import { Place, PlaceCategory, places as mockPlaces } from '@/data/mock';
import { supabase, supabaseConfigured } from '@/lib/supabase';

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

export const PLACE_FILTERS = ['All', 'Bars', 'Food', 'Late', 'Games'] as const;
export type PlaceFilter = (typeof PLACE_FILTERS)[number];

export const CITIES = [
  'Vancouver', 'Burnaby', 'Surrey', 'Richmond', 'North Vancouver', 'West Vancouver', 'New Westminster',
  'Coquitlam', 'Port Coquitlam', 'Port Moody', 'Delta', 'Langley', 'White Rock', 'Maple Ridge',
];

const PAGE_SIZE = 60;

const matches = (p: Place, filter: PlaceFilter, query: string) =>
  (filter === 'All' ||
    (filter === 'Bars' && (p.category === 'bar' || p.category === 'nightclub')) ||
    (filter === 'Food' && p.category === 'food') ||
    (filter === 'Late' && p.late) ||
    (filter === 'Games' && p.category === 'activity')) &&
  (!query || p.name.toLowerCase().includes(query.toLowerCase()));

/**
 * Browse places by city, filter and search. The filtering happens in the database and only one
 * small page is fetched, so thousands of places never reach the phone.
 */
export function usePlaceSearch(opts: { city: string; filter: PlaceFilter; query: string }) {
  const { city, filter, query } = opts;
  const [places, setPlaces] = useState<Place[]>(() => mockPlaces.filter((p) => matches(p, 'All', '')));
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) {
      setPlaces(mockPlaces.filter((p) => matches(p, filter, query.trim())));
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      let q = supabase.from('places').select(EXT_COLUMNS).eq('city', city);
      if (filter === 'Bars') q = q.in('category', ['bar', 'nightclub']);
      if (filter === 'Food') q = q.eq('category', 'food');
      if (filter === 'Late') q = q.eq('late_night', true);
      if (filter === 'Games') q = q.eq('category', 'activity');
      const term = query.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
      if (term) q = q.ilike('name', `%${term}%`);
      // Independent venues first, then the most complete records.
      const res = await q
        .order('is_chain', { ascending: true })
        .order('quality', { ascending: false })
        .order('name')
        .limit(PAGE_SIZE);
      if (cancelled) return;

      if (!res.error) {
        setPlaces((res.data as unknown as Row[]).map(toPlace));
        setLoading(false);
        return;
      }
      // The browse columns (migration 005) are not in the database yet: fall back to the original table.
      const old = await supabase.from('places').select(PLACE_COLUMNS).order('name').limit(200);
      if (cancelled) return;
      if (!old.error && old.data) {
        setPlaces((old.data as unknown as Row[]).map(toPlace).filter((p) => matches(p, filter, query.trim())));
      }
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, filter, query]);

  return { places, loading, capped: places.length >= PAGE_SIZE };
}
