/**
 * The kinds of place the Explore page is divided into. Each one is a slice of the places table (by subcategory), a photo
 * set for its tiles, and a layout, so the page does not read as the same card repeated.
 */
export type Layout = 'poster' | 'square' | 'wide' | 'row' | 'pager';

export type Group = {
  id: string;
  title: string;
  blurb: string;
  emoji: string;
  subs?: string[];
  category?: string;
  vibeId: string; // which bundled photo set gives its tile and fallback pictures (lib/vibes.ts)
  layout: Layout;
  verb: string; // "See all dining"
};

export const GROUPS: Group[] = [
  { id: 'dining', title: 'Dining', blurb: 'Sit-down meals', emoji: '🍽️', subs: ['restaurant'], vibeId: 'restaurants', layout: 'poster', verb: 'dining' },
  { id: 'fast', title: 'Fast food', blurb: 'Quick, cheap and good', emoji: '🍔', subs: ['fast food', 'food court', 'food cart'], vibeId: 'eats', layout: 'square', verb: 'fast food' },
  { id: 'cafes', title: 'Cafés and sweets', blurb: 'Coffee, bakeries, dessert', emoji: '☕', subs: ['cafe', 'bakery', 'dessert'], vibeId: 'cafes', layout: 'row', verb: 'cafés' },
  { id: 'pubs', title: 'Pubs', blurb: 'Pints and good company', emoji: '🍺', subs: ['pub', 'beer garden'], vibeId: 'pub', layout: 'wide', verb: 'pubs' },
  { id: 'breweries', title: 'Breweries', blurb: 'Taprooms and distilleries', emoji: '🍻', subs: ['brewery', 'distillery'], vibeId: 'brewery', layout: 'pager', verb: 'breweries' },
  { id: 'bars', title: 'Bars and cocktails', blurb: 'Where the night gets started', emoji: '🍸', subs: ['bar'], vibeId: 'cocktails', layout: 'poster', verb: 'bars' },
  { id: 'clubs', title: 'Clubs and live music', blurb: 'Dancing, gigs, late nights', emoji: '🪩', subs: ['nightclub', 'live music'], vibeId: 'dance', layout: 'square', verb: 'clubs' },
  { id: 'games', title: 'Games and arcades', blurb: 'Arcades, bowling, escape rooms, karaoke', emoji: '🕹️', subs: ['arcade', 'bowling', 'escape room', 'mini golf', 'trampoline', 'karaoke'], vibeId: 'games', layout: 'wide', verb: 'games' },
  { id: 'culture', title: 'Shows and culture', blurb: 'Theatres, cinemas, museums', emoji: '🎭', subs: ['theatre', 'cinema', 'museum', 'arts', 'attraction'], vibeId: 'date', layout: 'row', verb: 'shows and culture' },
  { id: 'scenic', title: 'Scenic spots', blurb: 'Views, beaches and sunsets', emoji: '🌆', category: 'viewpoint', vibeId: 'scenic', layout: 'pager', verb: 'scenic spots' },
];

export const groupById = (id: string) => GROUPS.find((g) => g.id === id);
