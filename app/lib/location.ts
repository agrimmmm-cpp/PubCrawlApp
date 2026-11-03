import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export type Near = { lat: number; lng: number };

/**
 * "Near me": asks for permission when first used and reads the position once. The position stays
 * on the phone; queries send only a coarse area.
 */
export function useNearMe() {
  const [near, setNear] = useState<Near | undefined>();
  const [note, setNote] = useState<string | null>(null);

  const request = useCallback(async () => {
    setNote(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setNote('Location is off, so pick a city instead. You can turn it on in Settings.');
        return false;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      return true;
    } catch {
      setNote("Couldn't get your location. Pick a city instead.");
      return false;
    }
  }, []);

  return { near, note, clearNote: () => setNote(null), request };
}
