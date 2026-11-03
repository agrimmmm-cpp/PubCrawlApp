import { useEffect, useState } from 'react';

import { Experience, experiences as mockExperiences } from '@/data/mock';
import { PLACE_COLUMNS, Row as PlaceRow, toPlace } from '@/lib/places';
import { supabase, supabaseConfigured } from '@/lib/supabase';

type Row = {
  id: string;
  title: string;
  badge: string | null;
  emoji: string | null;
  gradient: string[] | null;
  rating: number | null;
  reviews: number | null;
  duration_minutes: number | null;
  est_cost_cad: number | null;
  description: string | null;
  why_order: string | null;
  best_night: string | null;
  start_time: string | null;
  city?: string | null;
  hub?: string | null;
  lat?: number | null;
  lng?: number | null;
  experience_stops: { position: number; stay_minutes: number | null; tip: string | null; places: PlaceRow | null }[];
};

// No price shown until an estimate exists; never a guessed tier.
const costTier = (cad: number | null) => (cad == null ? '' : cad < 40 ? '$' : cad < 80 ? '$$' : '$$$');

function toExperience(r: Row): Experience {
  const ordered = [...r.experience_stops].sort((a, b) => a.position - b.position);
  const stopPlaces = ordered.flatMap((s) => (s.places ? [toPlace(s.places)] : []));
  const route = ordered.map((s) => s.places?.name ?? 'Stop');
  const hours = r.duration_minutes ? Math.round(r.duration_minutes / 60) : null;
  const [from, to] = r.gradient ?? ['#3A0F5C', '#FF5C00'];
  return {
    id: r.id,
    title: r.title,
    badge: r.badge ?? 'NEW',
    rating: Number(r.rating ?? 0),
    reviews: r.reviews ?? 0,
    duration: hours ? `~${hours} hrs` : 'Flexible',
    stops: route.length,
    cost: costTier(r.est_cost_cad),
    distance: '',
    route,
    gradient: [from, to],
    emoji: r.emoji ?? '✨',
    description: r.description ?? undefined,
    stopPlaces,
    whyOrder: r.why_order ?? undefined,
    bestNight: r.best_night ?? undefined,
    startTime: r.start_time ?? undefined,
    city: r.city ?? undefined,
    hub: r.hub ?? undefined,
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
    stopInfo: ordered.filter((s) => s.places).map((s) => ({ stay: s.stay_minutes ?? undefined, tip: s.tip ?? undefined })),
  };
}

const BASE_COLUMNS =
  'id,title,badge,emoji,gradient,rating,reviews,duration_minutes,est_cost_cad,description,why_order,best_night,start_time';
const STOPS = `experience_stops(position,stay_minutes,tip,places(${PLACE_COLUMNS}))`;
// city/hub/lat/lng arrive with migration 007; before that the base columns still work.
const FULL_SELECT = `${BASE_COLUMNS},city,hub,lat,lng,${STOPS}`;
const BASE_SELECT = `${BASE_COLUMNS},${STOPS}`;

const PAGE = 24;
const snap = (n: number) => Math.round(n / 0.05) * 0.05; // ~5 km grid: only a coarse area is sent to the server

export type Near = { lat: number; lng: number };

function km(a: Near, b: Near) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/**
 * Experiences for the Discover feed: by city, or the closest to a point ("Near me"), or the default
 * list (hand-drafted first). One small page is fetched; the area sent to the server is coarse.
 */
export function useExperienceFeed(opts: { city?: string; near?: Near } = {}) {
  const { city, near } = opts;
  const [data, setData] = useState<Experience[]>(mockExperiences);
  const [loading, setLoading] = useState(supabaseConfigured);
  const nearLat = near?.lat;
  const nearLng = near?.lng;

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    setLoading(true);

    const run = async () => {
      let q = supabase.from('experiences').select(FULL_SELECT).eq('is_public', true);
      if (nearLat != null && nearLng != null) {
        const la = snap(nearLat);
        const ln = snap(nearLng);
        q = q.gte('lat', la - 0.2).lte('lat', la + 0.2).gte('lng', ln - 0.3).lte('lng', ln + 0.3);
      } else if (city) {
        q = q.eq('city', city);
      }
      let res: { data: unknown; error: unknown } = await q
        .order('is_curated', { ascending: false }) // hand-drafted first, then generated
        .order('created_at', { ascending: true })
        .limit(nearLat != null ? 80 : PAGE);
      if (res.error) {
        // The location columns are not in the database yet: fall back to the plain list.
        res = await supabase
          .from('experiences')
          .select(BASE_SELECT)
          .eq('is_public', true)
          .order('is_curated', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(PAGE);
      }
      if (cancelled) return;
      const rows = (res.data as unknown as Row[] | null) ?? [];
      let list = rows.map(toExperience);
      if (nearLat != null && nearLng != null) {
        const here = { lat: nearLat, lng: nearLng };
        list = list
          .filter((e) => e.lat != null && e.lng != null)
          .map((e) => ({ ...e, distanceKm: km(here, { lat: e.lat as number, lng: e.lng as number }) }))
          .sort((a, b) => (a.distanceKm as number) - (b.distanceKm as number))
          .slice(0, PAGE);
      }
      setData(list);
      setLoading(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [city, nearLat, nearLng]);

  return { experiences: data, loading };
}

/** The default list (no filters). Used where any experience will do, such as the Live picker. */
export function useExperiences(): Experience[] {
  return useExperienceFeed().experiences;
}

/** One experience by id, so a deep link or a running night never depends on the feed page. */
export function useExperience(id?: string) {
  const [found, setFound] = useState<Experience | undefined>(() => mockExperiences.find((e) => e.id === id));
  const [loading, setLoading] = useState(supabaseConfigured && !!id);

  useEffect(() => {
    if (!supabaseConfigured || !id) return;
    let cancelled = false;
    supabase
      .from('experiences')
      .select(FULL_SELECT)
      .eq('id', id)
      .maybeSingle()
      .then(async (res) => {
        let row = res.data as unknown as Row | null;
        if (res.error) {
          const old = await supabase.from('experiences').select(BASE_SELECT).eq('id', id).maybeSingle();
          row = old.data as unknown as Row | null;
        }
        if (cancelled) return;
        if (row) setFound(toExperience(row));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { experience: found, loading };
}

/** Cities that have at least one experience, most first. */
export function useExperienceCities() {
  const [cities, setCities] = useState<string[]>(['Vancouver']);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    supabase
      .from('experiences')
      .select('city')
      .eq('is_public', true)
      .not('city', 'is', null)
      .limit(1000)
      .then(({ data, error }) => {
        if (cancelled || error || !data?.length) return;
        const counts = new Map<string, number>();
        for (const r of data as { city: string }[]) counts.set(r.city, (counts.get(r.city) ?? 0) + 1);
        setCities([...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return cities;
}
