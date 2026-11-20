// Reads OpenStreetMap opening_hours strings such as "Mo-Th 16:00-24:00; Fr,Sa 16:00-02:00". Anything it cannot
// read returns null ("unknown"), never a guess. Same rules as scripts/algo/hours.py.
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function parseDays(spec: string): Set<number> | null {
  const out = new Set<number>();
  for (const tok of spec.split(',').map((t) => t.trim()).filter(Boolean)) {
    if (tok.includes('-')) {
      const [a, b] = tok.split('-', 2);
      if (!DAYS.includes(a) || !DAYS.includes(b)) continue;
      let i = DAYS.indexOf(a);
      const j = DAYS.indexOf(b);
      for (let n = 0; n < 8; n++) {
        out.add(i);
        if (i === j) break;
        i = (i + 1) % 7;
      }
    } else if (DAYS.includes(tok)) {
      out.add(DAYS.indexOf(tok));
    } else {
      return null;
    }
  }
  return out;
}

type Rule = { days: Set<number>; intervals: [number, number][] };

function parseRules(hours: string): Rule[] | null {
  const rules: Rule[] = [];
  for (const part of hours.split(';').map((p) => p.trim()).filter(Boolean)) {
    const m = /\d\d:\d\d|\boff\b|\bclosed\b/.exec(part);
    if (!m) return null;
    const daySpec = part.slice(0, m.index).trim();
    const times = part.slice(m.index).trim();
    const days = daySpec ? parseDays(daySpec) : new Set([0, 1, 2, 3, 4, 5, 6]);
    if (!days) return null;
    if (times === 'off' || times === 'closed') {
      rules.push({ days, intervals: [] });
      continue;
    }
    const intervals: [number, number][] = [];
    for (const r of times.matchAll(/(\d\d):(\d\d)\s*-\s*(\d\d):(\d\d)/g)) {
      const s = +r[1] * 60 + +r[2];
      const e = +r[3] * 60 + +r[4];
      intervals.push([s, e > s ? e : e + 1440]);
    }
    if (!intervals.length) return null;
    rules.push({ days, intervals });
  }
  return rules;
}

/** True or false when the hours say so, null when they are missing or unreadable. `day` is 0 = Monday. */
export function openAt(hours: string | undefined, day: number, minute: number): boolean | null {
  if (!hours) return null;
  if (hours.includes('24/7')) return true;
  const rules = parseRules(hours);
  if (!rules) return null;
  let today: [number, number][] | null = null;
  let prev: [number, number][] | null = null;
  for (const r of rules) {
    if (r.days.has(day)) today = r.intervals;
    if (r.days.has((day + 6) % 7)) prev = r.intervals;
  }
  if (today?.some(([s, e]) => s <= minute && minute < e)) return true;
  if (prev?.some(([s, e]) => s <= minute + 1440 && minute + 1440 < e)) return true;
  return false;
}

/** How many of these places are open right now, how many are closed, and how many we cannot tell. */
export function openNow(places: { hours?: string }[], now = new Date()) {
  const day = (now.getDay() + 6) % 7;
  const minute = now.getHours() * 60 + now.getMinutes();
  let open = 0;
  let closed = 0;
  let unknown = 0;
  for (const p of places) {
    const r = openAt(p.hours, day, minute);
    if (r === true) open++;
    else if (r === false) closed++;
    else unknown++;
  }
  return { open, closed, unknown };
}
