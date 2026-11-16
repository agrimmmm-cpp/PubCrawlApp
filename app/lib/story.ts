import { Experience, Place } from '@/data/mock';
import { VIBES, vibeImage } from '@/lib/vibes';

/** What you actually do at a stop, as a short verb phrase. Built from the kind of place only, never invented venue facts. */
export function doingAt(p: Place): string {
  switch (p.subcategory) {
    case 'pub': return 'Settle in with a pint';
    case 'beer garden': return 'Take a pint outside';
    case 'brewery': return 'Taste what they brew on site';
    case 'distillery': return 'Try something small-batch';
    case 'bar': return 'Order a round of cocktails';
    case 'live music': return 'Catch a live set';
    case 'karaoke': return 'Grab the mic';
    case 'arcade': return 'Play for bragging rights';
    case 'bowling': return 'Settle it over a few frames';
    case 'escape room': return 'Race the clock together';
    case 'mini golf': return 'Putt it out';
    case 'trampoline': return 'Burn off the energy';
    case 'theatre':
    case 'cinema': return 'Catch a show';
    case 'cafe': return 'Slow down with a coffee';
    case 'dessert':
    case 'bakery': return 'Finish with something sweet';
    case 'food cart': return 'Grab a bite from the cart';
    case 'restaurant': return 'Sit down for a proper meal';
  }
  switch (p.category) {
    case 'nightclub': return 'Hit the dance floor';
    case 'viewpoint': return 'Take in the view';
    case 'food': return 'Share a bite';
    case 'activity': return 'Play something together';
    default: return 'Have a drink';
  }
}

/** Name for each stop's part of the night. */
export function actName(p: Place, i: number, total: number): string {
  if (i === total - 1 && total > 1) return p.category === 'viewpoint' ? 'The finale' : 'Last stop';
  if (i === 0) return p.category === 'food' ? 'To start' : 'The warm-up';
  switch (p.category) {
    case 'food': return 'Fuel up';
    case 'activity': return 'Play time';
    case 'nightclub': return 'The main event';
    case 'viewpoint': return 'Come up for air';
    default: return 'The main pour';
  }
}

/** A stock photo that matches the kind of stop. Never presented as the venue itself. */
export function photoFor(p: Place) {
  const v = VIBES.find((x) => x.place(p));
  return v ? { id: v.id, image: vibeImage(v.id), gradient: v.gradient } : undefined;
}

const GENERIC: Record<Place['category'], string> = {
  bar: 'a drink',
  nightclub: 'a dance floor',
  food: 'a bite',
  activity: 'a game',
  viewpoint: 'the view',
};

/** "A pint, then tacos, then the skyline" – one line of what the night holds. */
export function teaser(e: Experience): string {
  const places = e.stopPlaces ?? [];
  if (places.length < 2) return '';
  const bits = places.map((p) => {
    switch (p.subcategory) {
      case 'pub': return 'a pint';
      case 'brewery': return 'a local brew';
      case 'bar': return 'cocktails';
      case 'karaoke': return 'karaoke';
      case 'arcade': return 'arcade games';
      case 'bowling': return 'bowling';
      case 'cafe': return 'coffee';
      case 'dessert':
      case 'bakery': return 'something sweet';
      case 'food cart': return 'street food';
      case 'restaurant': return 'dinner';
      case 'live music': return 'live music';
    }
    return p.category === 'viewpoint' ? 'the view' : GENERIC[p.category];
  });
  const unique = bits.filter((b, i) => bits.indexOf(b) === i).slice(0, 3);
  const text = unique.length > 1 ? `${unique.slice(0, -1).join(', then ')}, then ${unique[unique.length - 1]}` : unique[0];
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

export type { Place };
