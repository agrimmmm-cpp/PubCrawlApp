import { useEffect, useState } from 'react';

import { Experience, experiences as mockExperiences, Place, PlaceCategory } from '@/data/mock';
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
  experience_stops: { position: number; places: PlaceRow | null }[];
};

type PlaceRow = {
  id: string;
  name: string;
  category: string;
  emoji: string | null;
  lat: number;
  lng: number;
  address: string | null;
  hours: { osm?: string } | null;
  late_night: boolean | null;
};

// No price shown until an estimate exists; never a guessed tier.
const costTier = (cad: number | null) => (cad == null ? '' : cad < 40 ? '$' : cad < 80 ? '$$' : '$$$');

const toPlace = (p: PlaceRow): Place => ({
  id: p.id,
  name: p.name,
  category: p.category as PlaceCategory,
  emoji: p.emoji ?? '📍',
  lat: p.lat,
  lng: p.lng,
  address: p.address ?? '',
  hours: p.hours?.osm ?? '',
  late: !!p.late_night,
});

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
  };
}

/** Experiences from Supabase; the mock set until a project is connected and seeded. */
export function useExperiences(): Experience[] {
  const [data, setData] = useState<Experience[]>(mockExperiences);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    supabase
      .from('experiences')
      .select(
        'id,title,badge,emoji,gradient,rating,reviews,duration_minutes,est_cost_cad,description,experience_stops(position,places(id,name,category,emoji,lat,lng,address,hours,late_night))',
      )
      .eq('is_public', true)
      .order('created_at', { ascending: true })
      .then(({ data: rows, error }) => {
        if (cancelled || error || !rows?.length) return;
        setData((rows as unknown as Row[]).map(toExperience));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
