import { useEffect, useState } from 'react';

import { Experience, experiences as mockExperiences } from '@/data/mock';
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
  experience_stops: { position: number; places: { name: string } | null }[];
};

const costTier = (cad: number | null) => (cad == null ? '$$' : cad < 40 ? '$' : cad < 80 ? '$$' : '$$$');

function toExperience(r: Row): Experience {
  const route = [...r.experience_stops]
    .sort((a, b) => a.position - b.position)
    .map((s) => s.places?.name ?? 'Stop');
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
        'id,title,badge,emoji,gradient,rating,reviews,duration_minutes,est_cost_cad,experience_stops(position,places(name))',
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
