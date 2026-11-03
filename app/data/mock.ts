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
};

export const experiences: Experience[] = [
  {
    id: 'gastown',
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

export type Place = {
  id: string;
  name: string;
  meta: string;
  rating: number;
  reviews: number;
  capacity: number;
  walk: string;
  note: string;
  badge?: string;
  gradient: [string, string];
  emoji: string;
};

export const places: Place[] = [
  {
    id: 'keefer',
    name: 'The Keefer Bar',
    meta: 'Chinatown · Cocktails & Dim Sum · $$',
    rating: 4.8,
    reviews: 340,
    capacity: 86,
    walk: '4 min · 320m',
    badge: 'HOTSPOT',
    note: 'Tonight: Apothecary cocktails & late kitchen till 2a',
    gradient: ['#3A1A0F', '#FF5C00'],
    emoji: '🍸',
  },
  {
    id: 'glitch',
    name: 'Glitch Retro Arcade & Bar',
    meta: 'Broadway · Arcade & Craft Beer · $',
    rating: 4.7,
    reviews: 180,
    capacity: 74,
    walk: '7 min · 560m',
    badge: 'NO COVER',
    note: 'Free play: Mario Kart 64 & 14 pinball machines',
    gradient: ['#0F1A3A', '#0096FF'],
    emoji: '🕹️',
  },
  {
    id: 'guilt',
    name: 'Guilt & Co',
    meta: 'Gastown · Live Jazz & Speakeasy · $$',
    rating: 4.9,
    reviews: 610,
    capacity: 89,
    walk: '2 min · 140m',
    badge: 'LIVE SET',
    note: 'Upcoming: live funk set starting in 25 min',
    gradient: ['#2A0F3A', '#FFD700'],
    emoji: '🎷',
  },
  {
    id: 'poutine',
    name: 'Mean Poutine',
    meta: 'Granville Strip · Late Night Food · $',
    rating: 4.5,
    reviews: 410,
    capacity: 40,
    walk: '5 min · 410m',
    badge: 'OPEN NOW',
    note: 'Fast · 5m line · open till 3:30 AM',
    gradient: ['#3A2A0F', '#FF5C00'],
    emoji: '🍟',
  },
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
