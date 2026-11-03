import { useEffect, useState } from 'react';

import { Place, PlaceCategory, places as mockPlaces } from '@/data/mock';
import { supabase, supabaseConfigured } from '@/lib/supabase';

type Row = {
  id: string;
  name: string;
  category: string;
  emoji: string | null;
  lat: number;
  lng: number;
  address: string | null;
  hours: { osm?: string } | null;
  late_night: boolean | null;
};

const toPlace = (r: Row): Place => ({
  id: r.id,
  name: r.name,
  category: r.category as PlaceCategory,
  emoji: r.emoji ?? '📍',
  lat: r.lat,
  lng: r.lng,
  address: r.address ?? '',
  hours: r.hours?.osm ?? '',
  late: !!r.late_night,
});

/** Places from Supabase; the small mock list until a project is connected and seeded. */
export function usePlaces(): Place[] {
  const [data, setData] = useState<Place[]>(mockPlaces);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    supabase
      .from('places')
      .select('id,name,category,emoji,lat,lng,address,hours,late_night')
      .order('name')
      .then(({ data: rows, error }) => {
        if (cancelled || error || !rows?.length) return;
        setData((rows as unknown as Row[]).map(toPlace));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
