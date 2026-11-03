/** "18:30" + minutes -> "7:45 PM". Wraps past midnight. */
export function clock(startTime: string, plusMinutes: number) {
  const [h, m] = startTime.split(':').map(Number);
  const total = (((h * 60 + m + plusMinutes) % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = String(total % 60).padStart(2, '0');
  return `${hh % 12 === 0 ? 12 : hh % 12}:${mm} ${hh < 12 ? 'AM' : 'PM'}`;
}

/**
 * Arrival time at each stop, from the suggested start, the time spent at earlier stops and the
 * walking time between them. Returns null unless every stop has a stay time and a start exists,
 * so we never show a half-guessed schedule.
 */
export function buildTimeline(startTime: string | undefined, stays: (number | undefined)[], walkMins: number[]) {
  if (!startTime || stays.length === 0 || stays.some((s) => s == null)) return null;
  let t = 0;
  const arrive = stays.map((stay, i) => {
    if (i > 0) t += (stays[i - 1] as number) + (walkMins[i - 1] ?? 0);
    return clock(startTime, t);
  });
  const end = clock(startTime, t + (stays[stays.length - 1] as number));
  return { arrive, end };
}
