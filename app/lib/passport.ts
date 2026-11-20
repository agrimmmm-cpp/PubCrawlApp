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

export type Badge = { id: string; label: string; emoji: string; need: string; goal: number; value: (s: PassportStats) => number; earned: (s: PassportStats) => boolean };

const badge = (id: string, label: string, emoji: string, need: string, goal: number, value: (s: PassportStats) => number): Badge => ({
  id, label, emoji, need, goal, value, earned: (s) => value(s) >= goal,
});

export const BADGES: Badge[] = [
  badge('first', 'First Night', '🌃', '1 night', 1, (s) => s.nights),
  badge('owl', 'Night Owl', '🦉', '5 nights', 5, (s) => s.nights),
  badge('explorer', 'Explorer', '🧭', '10 places', 10, (s) => s.places),
  badge('hopper', 'City Hopper', '🚌', '2 cities', 2, (s) => s.cities),
  badge('memory', 'Memory Maker', '📸', '10 moments', 10, (s) => s.moments),
  badge('legend', 'City Legend', '👑', '25 nights', 25, (s) => s.nights),
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
