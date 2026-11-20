import { useEffect, useState } from 'react';

import { supabase, supabaseConfigured } from '@/lib/supabase';

export type GoogleInfo = {
  photoUri?: string | null;
  photoBy?: string | null;
  photoByUri?: string | null;
  rating?: number | null;
  ratingCount?: number | null;
  priceLevel?: number | null; // 0 to 4
  openNow?: boolean | null;
  weekdayText?: string[] | null;
  mapsUri?: string | null;
};

type Kind = 'photo' | 'details';

// Kept in memory only, for this session: Google's policies do not allow storing its content, so nothing is saved to
// disk or to Supabase. The cache also means a stop that is opened twice is only paid for once.
const cache = new Map<string, Promise<GoogleInfo | null>>();
const problems = new Map<string, string>();

/**
 * Google is paid per request, so list cards (Discover) may fetch only this many different places per app session.
 * Past it, cards quietly keep their Wikimedia or stock photo. The experience page itself is never limited by this,
 * only by the server's daily budget. Raise it if you want more cards to show Google photos.
 */
export const CARD_PHOTOS_PER_SESSION = 40;
let cardFetches = 0;

/** Why the last request for this place failed, for the development note on screen. */
export const googleProblem = (placeId: string, kind: Kind) => problems.get(`${kind}:${placeId}`);

/**
 * Photo and live details for one Google place id, through the place-info Edge Function (which holds the key).
 * Resolves to null on any problem (not set up yet, over the daily budget, offline), and screens quietly fall back
 * to their Wikimedia or stock photo.
 */
export function fetchGoogleInfo(placeId: string, kind: Kind, card = false): Promise<GoogleInfo | null> {
  if (!supabaseConfigured) return Promise.resolve(null);
  const key = `${kind}:${placeId}`;
  let hit = cache.get(key);
  if (!hit) {
    if (card) {
      if (cardFetches >= CARD_PHOTOS_PER_SESSION) return Promise.resolve(null);
      cardFetches++;
    }
    hit = supabase.functions
      .invoke('place-info', { body: { placeId, kind } })
      .then(async ({ data, error }) => {
        const failure = error?.message ?? (data as { error?: string } | null)?.error;
        if (failure || !data) {
          // Remember why, so the dev note on the screen can say so (Metro no longer prints phone logs by default).
          let detail = '';
          try {
            const ctx = (error as { context?: Response } | null)?.context;
            if (ctx?.text) detail = (await ctx.text()).slice(0, 200);
          } catch {
            // The body is only extra detail.
          }
          problems.set(key, `${failure ?? 'no data'}${detail ? ` · ${detail}` : ''}`);
          if (__DEV__) console.warn(`place-info (${kind}): ${problems.get(key)}`);
          return null;
        }
        problems.delete(key);
        return data as GoogleInfo;
      })
      .catch((e) => {
        problems.set(key, `could not reach the function: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      });
    cache.set(key, hit);
    // Do not remember a failure: a later try (after the budget resets, or the function is deployed) may work.
    hit.then((r) => r === null && cache.get(key) === hit && cache.delete(key));
  }
  return hit;
}

/** undefined while loading, null when there is nothing to show. */
export function useGoogleInfo(placeId: string | undefined, kind: Kind, enabled = true, card = false) {
  const [result, setResult] = useState<{ key: string; info: GoogleInfo | null } | null>(null);
  const key = placeId ? `${kind}:${placeId}` : '';

  useEffect(() => {
    if (!placeId || !enabled) return;
    let cancelled = false;
    fetchGoogleInfo(placeId, kind, card).then((info) => {
      if (!cancelled) setResult({ key: `${kind}:${placeId}`, info });
    });
    return () => {
      cancelled = true;
    };
  }, [placeId, kind, enabled, card]);

  if (!placeId || !enabled) return null;
  return result?.key === key ? result.info : undefined;
}

export const priceSigns = (level?: number | null) => (level == null ? '' : level === 0 ? 'Free' : '$'.repeat(level));
