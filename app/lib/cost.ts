import { Experience, Place } from '@/data/mock';

// Rough per-person spend at one stop, in CAD. Open map data has no prices, so this is an estimate from
// the kind of place (a couple of drinks, a meal, a cover charge, a game session). Real spend from
// finished nights can replace it later.
const BY_SUB: Record<string, number> = {
  restaurant: 30, 'fast food': 14, bar: 24, pub: 24, brewery: 22, distillery: 22, 'beer garden': 22,
  nightclub: 25, 'live music': 25, arcade: 20, bowling: 22, 'escape room': 35, karaoke: 20, 'mini golf': 15,
  trampoline: 25, cinema: 18, theatre: 40, casino: 0, attraction: 15, viewpoint: 0,
};
const BY_CATEGORY: Record<string, number> = { food: 20, bar: 24, nightclub: 25, activity: 20, viewpoint: 0 };

export const costTier = (cad: number) => (cad < 40 ? '$' : cad < 80 ? '$$' : '$$$');

export function estimateCad(places: Place[]) {
  return places.reduce((sum, p) => sum + (BY_SUB[p.subcategory ?? ''] ?? BY_CATEGORY[p.category] ?? 15), 0);
}

/** The price to show for an experience: a stored estimate if there is one, else worked out from its stops. */
export function experienceCost(e: Experience): { tier: string; cad?: number } | undefined {
  if (e.estCad != null) return { tier: costTier(e.estCad), cad: e.estCad };
  if (e.stopPlaces?.length) {
    const cad = estimateCad(e.stopPlaces);
    return { tier: costTier(cad), cad: Math.round(cad / 5) * 5 };
  }
  return e.cost ? { tier: e.cost } : undefined;
}
