// Illustrative concept data, not verified itineraries, prices or live crowd levels.
export type Experience = {
  id: string;
  title: string;
  badge: string;
  rating: number;
  reviews: number;
  duration: string;
  stops: number;
  cost: string;
  distance: string;
  route: string[];
  gradient: [string, string];
  emoji: string;
  description?: string;
  stopPlaces?: Place[]; // full stop details when loaded from Supabase
  whyOrder?: string;
  bestNight?: string;
  startTime?: string; // 24h HH:MM
  stopInfo?: { stay?: number; tip?: string }[]; // aligned with stopPlaces
  city?: string;
  hub?: string; // neighbourhood or cluster name
  lat?: number;
  lng?: number;
  distanceKm?: number; // set when sorted by Near me
  tags?: string[]; // vibe tags, e.g. pubs, games, date
};

export const experiences: Experience[] = [
  {
    id: 'gastown',
    tags: ['nightlife', 'dancing'],
    title: 'Gastown After Dark',
    badge: 'FEATURED',
    rating: 4.9,
    reviews: 342,
    duration: '4–5 hrs',
    stops: 5,
    cost: '$$',
    distance: '0.8 km total',
    route: ['Taco Cantina', 'Neon Den', 'Arcade', '2AM Poutine'],
    gradient: ['#3A0F5C', '#FF5C00'],
    emoji: '🌃',
  },
  {
    id: 'sunset',
    tags: ['scenic', 'date'],
    title: 'Sunset to Sunrise',
    badge: 'DATE NIGHT',
    rating: 4.8,
    reviews: 189,
    duration: '3–4 hrs',
    stops: 4,
    cost: '$',
    distance: '1.4 km seawall',
    route: ['English Bay', 'Craft Beers', 'Seawall Walk', 'Late Gelato'],
    gradient: ['#0B2A4A', '#0096FF'],
    emoji: '🌅',
  },
  {
    id: 'chaos',
    tags: ['games', 'groups'],
    title: 'The Chaos Circuit',
    badge: 'HIGH ENERGY',
    rating: 4.9,
    reviews: 512,
    duration: '5–6 hrs',
    stops: 6,
    cost: '$$',
    distance: 'Till 4 AM',
    route: ['Pub Trivia', 'Karaoke Den', 'Speakeasy', 'Street Cart'],
    gradient: ['#4A0E0E', '#FFD700'],
    emoji: '🎤',
  },
];

export type PlaceCategory = 'bar' | 'nightclub' | 'food' | 'activity' | 'viewpoint';

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  emoji: string;
  lat: number;
  lng: number;
  address: string;
  hours: string; // raw OpenStreetMap opening_hours, may be empty
  late: boolean; // open past midnight on at least one day
  // Curated fields (blank until someone fills them in).
  whyGo?: string;
  tip?: string;
  vibe?: string[];
  priceLevel?: number; // 1-4
  music?: string;
  age19?: boolean;
  verifiedAt?: string; // YYYY-MM-DD
  city?: string;
  subcategory?: string; // pub, arcade, karaoke, brewery...
  distanceKm?: number; // set when sorted by Near me
};

// Fallback list shown only until a Supabase project is connected and seeded.
export const places: Place[] = [
  { id: 'm1', name: 'The Keefer Bar', category: 'bar', emoji: '🍸', lat: 49.2797, lng: -123.1036, address: '', hours: 'Su-Th 16:00-25:00; Fr-Sa 16:00-26:00', late: true },
  { id: 'm2', name: 'Guilt & Co', category: 'bar', emoji: '🍸', lat: 49.2840, lng: -123.1066, address: '', hours: 'Mo-Su 19:00-02:00', late: true },
  { id: 'm3', name: 'The Rec Room', category: 'activity', emoji: '🕹️', lat: 49.2808, lng: -123.1170, address: '', hours: 'Mo-Su 10:30-24:00', late: false },
  { id: 'm4', name: 'Mean Poutine', category: 'food', emoji: '🍽️', lat: 49.2790, lng: -123.1210, address: '', hours: 'Fr,Sa 11:00-04:00', late: true },
];

// Give the first mock experience full stop details so the detail screen can be previewed offline.
experiences[0].stopPlaces = places;
experiences[0].route = places.map((p) => p.name);
experiences[0].stops = places.length;
experiences[0].description = 'Cocktails, music, games and a late bite across Gastown and Granville.';
// Placeholder curation so the offline preview shows the layout. Real text comes from the curation CSVs.
experiences[0].whyOrder = 'Example: start with food, build energy, end late.';
experiences[0].bestNight = 'Fri-Sat';
experiences[0].startTime = '18:30';
experiences[0].stopInfo = [
  { stay: 75, tip: 'Example tip for this stop.' },
  { stay: 60 },
  { stay: 90 },
  { stay: 30 },
];

export const liveStop = {
  title: 'Santos Cantina & Mezcal Den',
  meta: 'Water St, Gastown · Artisanal Agave & Ambient Beats',
  index: 2,
  total: 5,
  elapsed: '01:43:48',
  progress: 0.6,
  next: { name: 'Glitch Retro Arcade Bar', distance: '240m away', walk: '3 min scenic walk' },
};

export const crew = [
  { name: 'Maya (You)', stat: '88% · Hare' },
  { name: 'Julian K.', stat: '94% · Patio' },
  { name: 'Elena R.', stat: '28% · Bar' },
  { name: 'Davey Z.', stat: '61% · Restroom' },
];

export const posts = [
  {
    id: 'p1',
    author: 'Elena Rostova',
    with: '& 3 others',
    sub: 'Gastown After Dark · Friday Night',
    stops: 5,
    memories: 4,
    spend: '$64/pers',
    duration: '4h 20m',
    caption:
      'Started with spicy mezcalitas, dominated Mario Kart at Glitch, finished with 2AM poutine in the rain. Incredible crew!',
    likes: 142,
    comments: 24,
    gradient: ['#3A0F5C', '#FF5C00'] as [string, string],
  },
  {
    id: 'p2',
    author: 'Marcus Chen',
    with: '',
    sub: 'English Bay → Granville Strip',
    stops: 3,
    memories: 6,
    spend: '$38/pers',
    duration: '3h 10m',
    caption: 'Sunset beers by the beach, ended on the dance floor at Venue. Still recovering!',
    likes: 89,
    comments: 11,
    gradient: ['#0B2A4A', '#0096FF'] as [string, string],
  },
];

export const badges = [
  { id: 'b1', label: 'Gastown Explorer', emoji: '🧭', earned: true },
  { id: 'b2', label: 'Night Owl', emoji: '🦉', earned: true },
  { id: 'b3', label: 'Hidden Gem Hunter', emoji: '💎', earned: true },
  { id: 'b4', label: 'Food Crawl Champion', emoji: '🍟', earned: false },
  { id: 'b5', label: 'Weekend Wanderer', emoji: '🚶', earned: false },
  { id: 'b6', label: 'City Legend', emoji: '👑', earned: false },
];

export type JoinPolicy = 'friends' | 'invite' | 'closed';
export type Relation = 'friend' | 'incoming' | 'sent' | 'none';

export type Person = {
  id: string;
  name: string;
  handle: string;
  color: string;
  relation: Relation;
  live?: {
    where: string;
    plan: string | null; // experience title, null for a freestyle night
    policy: JoinPolicy;
    join: 'none' | 'requested' | 'joined';
    sessionId?: string; // night_sessions id when loaded from Supabase
  };
};

export const people: Person[] = [
  {
    id: 'u1',
    name: 'Alex Rivera',
    handle: 'alexr',
    color: '#FF3D81',
    relation: 'friend',
    live: { where: 'The Keefer Bar', plan: null, policy: 'friends', join: 'none' },
  },
  {
    id: 'u2',
    name: 'Maya Tran',
    handle: 'mayat',
    color: '#2D9CFF',
    relation: 'friend',
    live: { where: 'Stop 2 · Neon Den', plan: 'Gastown After Dark', policy: 'invite', join: 'none' },
  },
  { id: 'u3', name: 'Dave Okafor', handle: 'daveo', color: '#FFD60A', relation: 'friend' },
  { id: 'u4', name: 'Elena Rostova', handle: 'elena', color: '#37E08A', relation: 'friend' },
  { id: 'u5', name: 'Priya Shah', handle: 'priyas', color: '#FF5C00', relation: 'incoming' },
  { id: 'u6', name: 'Jordan Lee', handle: 'jlee', color: '#B06CFF', relation: 'none' },
  { id: 'u7', name: 'Sam Park', handle: 'sampark', color: '#2D9CFF', relation: 'none' },
  { id: 'u8', name: 'Noor Haddad', handle: 'noorh', color: '#FF3D81', relation: 'none' },
];

export type JoinRequest = {
  id: string;
  name: string;
  handle: string;
  color: string;
  sessionId?: string;
  userId?: string;
};

// People asking to join the signed-in user's own live night.
export const joinRequests: JoinRequest[] = [
  { id: 'r1', name: 'Dave Okafor', handle: 'daveo', color: '#FFD60A' },
];
