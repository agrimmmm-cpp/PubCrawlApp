import { useEffect, useState } from 'react';

import { Experience } from '@/data/mock';
import { useAuth } from '@/lib/auth';
import { distanceMeters, rideMinutes, walkMinutes } from '@/lib/geo';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { vibeOf } from '@/lib/vibes';

/** True when the signed-in user's profile is marked admin (see supabase/migrations/010_admin.sql). */
export function useIsAdmin() {
  const { session } = useAuth();
  const userId = supabaseConfigured ? session?.user.id : undefined;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!cancelled && !error) setIsAdmin(!!data?.is_admin);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isAdmin;
}

export type DraftStop = {
  placeId: string;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
  estCad?: number;
  stay: number; // minutes
  tip: string;
  ride: boolean; // reached by ride from the previous stop
};

export type Draft = {
  id?: string;
  title: string;
  badge: string;
  description: string;
  whyOrder: string;
  bestNight: string;
  startTime: string; // 24h HH:MM, or empty
  city: string;
  tags: string[];
  published: boolean;
  featured: boolean;
  stops: DraftStop[];
};

export const emptyDraft = (city = 'Vancouver'): Draft => ({
  title: '', badge: '', description: '', whyOrder: '', bestNight: 'Fri-Sat', startTime: '18:30', city,
  tags: [], published: false, featured: false, stops: [],
});

/** Turns a loaded experience into an editable draft. */
export function draftFrom(e: Experience, published = true): Draft {
  return {
    id: e.id,
    title: e.title,
    badge: e.badge === 'NEW' ? '' : e.badge,
    description: e.description ?? '',
    whyOrder: e.whyOrder ?? '',
    bestNight: e.bestNight ?? '',
    startTime: e.startTime ?? '',
    city: e.city ?? 'Vancouver',
    tags: e.tags ?? [],
    published,
    featured: false,
    stops: (e.stopPlaces ?? []).map((p, i) => ({
      placeId: p.id,
      name: p.name,
      emoji: p.emoji,
      lat: p.lat,
      lng: p.lng,
      estCad: p.estCad,
      stay: e.stopInfo?.[i]?.stay ?? 60,
      tip: e.stopInfo?.[i]?.tip ?? '',
      ride: !!e.stopInfo?.[i]?.ride,
    })),
  };
}

/** Checks a draft before saving. Returns a message for the first problem, or null. */
export function validate(d: Draft): string | null {
  if (d.title.trim().length < 3) return 'Give it a title.';
  if (d.stops.length < 2) return 'Add at least two stops.';
  if (d.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.startTime)) return 'Start time must look like 18:30.';
  return null;
}

export async function saveDraft(d: Draft, userId: string): Promise<{ id?: string; error?: string }> {
  const bad = validate(d);
  if (bad) return { error: bad };

  // Worked out from the stops, so it never drifts from what is in the route.
  const cost = Math.round(d.stops.reduce((sum, s) => sum + (s.estCad ?? 15), 0) / 5) * 5;
  let minutes = d.stops.reduce((sum, s) => sum + s.stay, 0);
  d.stops.slice(1).forEach((s, i) => {
    const m = distanceMeters(d.stops[i], s);
    minutes += s.ride ? rideMinutes(m) : walkMinutes(m);
  });
  const vibe = vibeOf({ tags: d.tags, badge: d.badge });

  const row = {
    title: d.title.trim(),
    badge: d.badge.trim() || null,
    emoji: vibe?.emoji ?? '✨',
    gradient: vibe?.gradient ?? ['#3A0F5C', '#FF5C00'],
    description: d.description.trim() || null,
    why_order: d.whyOrder.trim() || null,
    best_night: d.bestNight.trim() || null,
    start_time: d.startTime || null,
    city: d.city.trim() || null,
    vibe: d.tags,
    duration_minutes: minutes,
    est_cost_cad: cost,
    lat: d.stops.reduce((a, s) => a + s.lat, 0) / d.stops.length,
    lng: d.stops.reduce((a, s) => a + s.lng, 0) / d.stops.length,
    is_public: d.published,
    featured: d.featured,
    is_curated: true,
    author_id: userId,
  };

  let id = d.id;
  if (id) {
    const { error } = await supabase.from('experiences').update(row).eq('id', id);
    if (error) return { error: error.message };
    const del = await supabase.from('experience_stops').delete().eq('experience_id', id);
    if (del.error) return { error: del.error.message };
  } else {
    const { data, error } = await supabase.from('experiences').insert(row).select('id').single();
    if (error || !data) return { error: error?.message ?? 'Could not save.' };
    id = data.id as string;
  }

  const { error } = await supabase.from('experience_stops').insert(
    d.stops.map((s, i) => ({
      experience_id: id,
      position: i + 1,
      place_id: s.placeId,
      stay_minutes: s.stay,
      tip: s.tip.trim() || null,
      travel_mode: i > 0 && s.ride ? 'ride' : 'walk',
    })),
  );
  if (error) return { id, error: error.message };
  return { id };
}

export async function deleteExperience(id: string) {
  // Nights that used it keep their history: the link is cleared first.
  await supabase.from('night_sessions').update({ experience_id: null }).eq('experience_id', id);
  const { error } = await supabase.from('experiences').delete().eq('id', id);
  return error?.message;
}

export type AdminRow = {
  id: string;
  title: string;
  city: string | null;
  is_public: boolean;
  featured: boolean | null;
  is_curated: boolean;
};

/** Experiences for the admin list, newest first, drafts included. */
export function useAdminExperiences(search: string, refreshKey: number) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      let q = supabase.from('experiences').select('id,title,city,is_public,featured,is_curated');
      const term = search.trim().replace(/[%_\\]/g, (c) => `\\${c}`);
      if (term) q = q.ilike('title', `%${term}%`);
      const { data } = await q.order('is_curated', { ascending: false }).order('created_at', { ascending: false }).limit(60);
      if (!cancelled) {
        setRows((data as AdminRow[] | null) ?? []);
        setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, refreshKey]);

  return { rows, loading };
}
