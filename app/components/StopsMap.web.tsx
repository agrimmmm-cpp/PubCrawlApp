import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space } from '@/constants/theme';

import type { MapStop } from './StopsMap';

/** Web has no native map, so this plots the real coordinates on a plain panel. */
export function StopsMap({ stops, route = false, height = 220 }: { stops: MapStop[]; route?: boolean; height?: number }) {
  const b = useMemo(() => {
    const lats = stops.map((s) => s.lat);
    const lngs = stops.map((s) => s.lng);
    return { s: Math.min(...lats), n: Math.max(...lats), w: Math.min(...lngs), e: Math.max(...lngs) };
  }, [stops]);

  return (
    <View style={[styles.wrap, { height }]}>
      {stops.map((s, i) => (
        <View
          key={s.id}
          style={[
            styles.pin,
            route ? styles.numbered : styles.dot,
            {
              backgroundColor: s.color ?? colors.primary,
              top: `${12 + (1 - (s.lat - b.s) / (b.n - b.s || 1)) * 70}%`,
              left: `${8 + ((s.lng - b.w) / (b.e - b.w || 1)) * 84}%`,
            },
          ]}>
          {route ? <Text style={styles.num}>{i + 1}</Text> : null}
        </View>
      ))}
      <Text style={styles.note}>Map preview (native map on iOS and Android)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface },
  pin: { position: 'absolute', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  numbered: { width: 28, height: 28, borderRadius: 14 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  num: { color: '#0B0B0D', fontFamily: fonts.display, fontSize: 13 },
  note: { position: 'absolute', left: space.lg, top: space.sm, color: colors.textFaint, fontFamily: fonts.body, fontSize: 11 },
});
