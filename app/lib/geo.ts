const R = 6371000; // metres

type Point = { lat: number; lng: number };

/** Straight-line distance in metres (haversine). Real walking routes run a bit longer. */
export function distanceMeters(a: Point, b: Point) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rough walking time at ~80 m/min, never less than one minute. */
export const walkMinutes = (meters: number) => Math.max(1, Math.round(meters / 80));

export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
