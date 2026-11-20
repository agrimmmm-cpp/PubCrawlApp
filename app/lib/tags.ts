import { Experience } from '@/data/mock';
import { experienceCost } from '@/lib/cost';

export type Tone = 'price' | 'hot' | 'cool' | 'plain';
export type Tag = { label: string; tone: Tone };

// Vibe tags stored on experiences, in the words people use.
const LABELS: Record<string, Tag> = {
  nightlife: { label: 'High energy', tone: 'hot' },
  dancing: { label: 'Dance', tone: 'hot' },
  games: { label: 'Arcade & games', tone: 'plain' },
  pubs: { label: 'Pubs', tone: 'plain' },
  brewery: { label: 'Craft beer', tone: 'plain' },
  cocktails: { label: 'Cocktails', tone: 'plain' },
  bars: { label: 'Bar hop', tone: 'plain' },
  cafes: { label: 'Cafés', tone: 'cool' },
  dessert: { label: 'Sweet', tone: 'cool' },
  crawl: { label: 'Crawl', tone: 'hot' },
  dinner: { label: 'Dinner', tone: 'plain' },
  date: { label: 'Date night', tone: 'cool' },
  scenic: { label: 'Scenic', tone: 'cool' },
  chill: { label: 'Chill', tone: 'cool' },
  friends: { label: 'Friends', tone: 'plain' },
  groups: { label: 'Groups', tone: 'plain' },
  'mixed groups': { label: 'All welcome', tone: 'cool' },
  music: { label: 'Live music', tone: 'plain' },
  karaoke: { label: 'Karaoke', tone: 'plain' },
  'street-food': { label: 'Street food', tone: 'plain' },
  budget: { label: 'Budget', tone: 'price' },
  student: { label: 'Student-friendly', tone: 'cool' },
  'all-ages': { label: 'All ages', tone: 'cool' },
  late: { label: 'Late night', tone: 'hot' },
};

/** Price first, then the vibe tags, then "Late night" when most stops are open past midnight. */
export function tagsFor(e: Experience, max = 4): Tag[] {
  const out: Tag[] = [];
  const cost = experienceCost(e);
  if (cost) out.push({ label: cost.tier, tone: 'price' });
  for (const t of e.tags ?? []) {
    const tag = LABELS[t];
    if (tag && !out.some((o) => o.label === tag.label)) out.push(tag);
  }
  const late = e.stopPlaces?.filter((p) => p.late).length ?? 0;
  if (late >= 2 && !out.some((o) => o.label === 'Late night')) out.push({ label: 'Late night', tone: 'hot' });
  return out.slice(0, max);
}

/** Every vibe tag an experience can carry, for pickers. */
export const TAG_OPTIONS = Object.keys(LABELS);
export const tagLabel = (t: string) => LABELS[t]?.label ?? t;
