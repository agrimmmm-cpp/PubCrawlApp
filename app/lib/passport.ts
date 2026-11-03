import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export type PassportStats = { nights: number; places: number; cities: number; moments: number };

const ZERO: PassportStats = { nights: 0, places: 0, cities: 0, moments: 0 };

/** Counts from the signed-in user's finished nights. Refreshes each time the Passport tab is shown. */
export function usePassport() {
  const { session } = useAuth();
  const userId = supabaseConfigured ? session?.user.id : undefined;
  const [stats, setStats] = useState<PassportStats>(ZERO);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      supabase.rpc('my_passport').then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const d = data as Partial<PassportStats>;
        setStats({ nights: d.nights ?? 0, places: d.places ?? 0, cities: d.cities ?? 0, moments: d.moments ?? 0 });
      });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  return stats;
}

export const BADGES: { id: string; label: string; emoji: string; need: string; earned: (s: PassportStats) => boolean }[] = [
  { id: 'first', label: 'First Night', emoji: '🌃', need: '1 night', earned: (s) => s.nights >= 1 },
  { id: 'owl', label: 'Night Owl', emoji: '🦉', need: '5 nights', earned: (s) => s.nights >= 5 },
  { id: 'explorer', label: 'Explorer', emoji: '🧭', need: '10 places', earned: (s) => s.places >= 10 },
  { id: 'hopper', label: 'City Hopper', emoji: '🚌', need: '2 cities', earned: (s) => s.cities >= 2 },
  { id: 'memory', label: 'Memory Maker', emoji: '📸', need: '10 moments', earned: (s) => s.moments >= 10 },
  { id: 'legend', label: 'City Legend', emoji: '👑', need: '25 nights', earned: (s) => s.nights >= 25 },
];

const TIERS = [
  { name: 'Rookie', from: 0 },
  { name: 'Regular', from: 1 },
  { name: 'Night Owl', from: 5 },
  { name: 'City Legend', from: 25 },
];

export function tierFor(nights: number) {
  const idx = TIERS.reduce((best, t, i) => (nights >= t.from ? i : best), 0);
  const next = TIERS[idx + 1];
  return { name: TIERS[idx].name, next: next?.name, progress: next ? (nights - TIERS[idx].from) / (next.from - TIERS[idx].from) : 1 };
}
