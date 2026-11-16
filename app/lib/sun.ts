/**
 * Sunrise and sunset from latitude and longitude (the standard "Almanac for Computers" method, good to a couple of
 * minutes). Returns minutes after local midnight in the device's time zone, or null in polar day or night.
 */
function sunEvent(date: Date, lat: number, lng: number, rising: boolean): number | null {
  const rad = Math.PI / 180;
  const start = new Date(date.getFullYear(), 0, 0);
  const n = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const lngHour = lng / 15;
  const t = n + ((rising ? 6 : 18) - lngHour) / 24;
  const m = 0.9856 * t - 3.289;
  let l = m + 1.916 * Math.sin(m * rad) + 0.02 * Math.sin(2 * m * rad) + 282.634;
  l = ((l % 360) + 360) % 360;
  let ra = Math.atan(0.91764 * Math.tan(l * rad)) / rad;
  ra = ((ra % 360) + 360) % 360;
  ra += Math.floor(l / 90) * 90 - Math.floor(ra / 90) * 90;
  ra /= 15;
  const sinDec = 0.39782 * Math.sin(l * rad);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
  if (cosH > 1 || cosH < -1) return null;
  let h = Math.acos(cosH) / rad;
  if (rising) h = 360 - h;
  h /= 15;
  const localMean = h + ra - 0.06571 * t - 6.622;
  const utc = (((localMean - lngHour) % 24) + 24) % 24;
  const offsetHours = -date.getTimezoneOffset() / 60;
  return Math.round((((utc + offsetHours) % 24) + 24) % 24 * 60);
}

export const sunset = (date: Date, lat: number, lng: number) => sunEvent(date, lat, lng, false);
export const sunrise = (date: Date, lat: number, lng: number) => sunEvent(date, lat, lng, true);

export function formatMinutes(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')}${h24 < 12 ? 'am' : 'pm'}`;
}
