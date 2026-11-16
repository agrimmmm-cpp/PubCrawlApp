import { Experience, Place } from '@/data/mock';
import { VIBE_IMAGES } from '@/lib/vibeImages';

export type Vibe = {
  id: string;
  label: string;
  emoji: string;
  gradient: [string, string];
  /** Used by scripts/fetch_pexels.py to find a photo. */
  query: string;
  /** Experience tags (see the generator's `vibe` arrays) that belong to this vibe. */
  tags: string[];
  /** Does this place belong to the vibe? */
  place: (p: Place) => boolean;
};

const sub = (...names: string[]) => (p: Place) => !!p.subcategory && names.includes(p.subcategory);

export const VIBES: Vibe[] = [
  { id: 'pub', label: 'Pints & pubs', emoji: '🍺', gradient: ['#3A2A0F', '#FF9A3D'], query: 'pub beer pints friends', tags: ['pubs', 'friends'], place: sub('pub', 'beer garden') },
  { id: 'brewery', label: 'Breweries', emoji: '🍻', gradient: ['#2A1F0A', '#E0A030'], query: 'craft brewery taproom', tags: ['brewery'], place: sub('brewery', 'distillery') },
  { id: 'cocktails', label: 'Cocktails', emoji: '🍸', gradient: ['#1A0F3A', '#FF3D81'], query: 'cocktail bar neon', tags: ['cocktails'], place: sub('bar') },
  { id: 'dance', label: 'Dance', emoji: '🪩', gradient: ['#3A0F5C', '#FF5C00'], query: 'nightclub dancing lights', tags: ['dancing', 'nightlife'], place: (p) => p.category === 'nightclub' && p.subcategory !== 'live music' },
  { id: 'live-music', label: 'Live music', emoji: '🎸', gradient: ['#0F1A3A', '#2D9CFF'], query: 'live music concert crowd', tags: ['music'], place: sub('live music') },
  { id: 'games', label: 'Games & arcade', emoji: '🕹️', gradient: ['#4A0E0E', '#FFD60A'], query: 'arcade games neon', tags: ['games'], place: sub('arcade', 'bowling', 'escape room', 'mini golf', 'trampoline') },
  { id: 'karaoke', label: 'Karaoke', emoji: '🎤', gradient: ['#3A0F3A', '#FF3D81'], query: 'karaoke singing friends', tags: ['karaoke'], place: sub('karaoke') },
  { id: 'scenic', label: 'Scenic views', emoji: '🌆', gradient: ['#0B2A4A', '#2D9CFF'], query: 'Vancouver skyline', tags: ['scenic'], place: (p) => p.category === 'viewpoint' },
  { id: 'date', label: 'Date night', emoji: '🌅', gradient: ['#3A0F1F', '#FF7A59'], query: 'romantic dinner candlelight', tags: ['date'], place: sub('theatre', 'cinema') },
  { id: 'carts', label: 'Food carts', emoji: '🌭', gradient: ['#3A2A0F', '#FFB347'], query: 'food truck street food', tags: ['street-food'], place: sub('food cart') },
  { id: 'cafes', label: 'Cafés & dessert', emoji: '☕', gradient: ['#2A1F14', '#C98B5A'], query: 'coffee dessert cafe', tags: [], place: sub('cafe', 'dessert', 'bakery') },
  { id: 'restaurants', label: 'Restaurants', emoji: '🍽️', gradient: ['#3A0F1F', '#FF7A59'], query: 'restaurant dinner table', tags: [], place: sub('restaurant') },
  { id: 'eats', label: 'Late eats', emoji: '🍟', gradient: ['#3A2A0F', '#FF5C00'], query: 'poutine fries burger', tags: ['dinner'], place: (p) => p.category === 'food' && p.late },
];

export const vibeById = (id: string) => VIBES.find((v) => v.id === id);
export const vibeImage = (id: string) => VIBE_IMAGES[id];

/** The vibe an experience reads as, from its tags. Used to pick a cover when it has no photo of its own. */
export function vibeOf(e: Pick<Experience, 'tags' | 'badge'>) {
  return VIBES.find((v) => v.tags.some((t) => e.tags?.includes(t)));
}
