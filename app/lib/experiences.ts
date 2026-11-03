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
    stopInfo: ordered.filter((s) => s.places).map((s) => ({ stay: s.stay_minutes ?? undefined, tip: s.tip ?? undefined })),
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
        `id,title,badge,emoji,gradient,rating,reviews,duration_minutes,est_cost_cad,description,why_order,best_night,start_time,experience_stops(position,stay_minutes,tip,places(${PLACE_COLUMNS}))`,
      )
      .eq('is_public', true)
      .order('is_curated', { ascending: false }) // hand-drafted first, then generated
      .order('created_at', { ascending: true })
      .limit(24)
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
