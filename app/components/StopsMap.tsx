import { useCallback, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { colors, fonts } from '@/constants/theme';

export type MapStop = { id: string; name: string; lat: number; lng: number; color?: string };

type Props = {
  stops: MapStop[];
  /** Number the pins 1..n and join them with a line (an itinerary route). */
  route?: boolean;
  height?: number;
};

/** Native map (Apple Maps on iPhone). Pins are real coordinates; the line is straight, not a walking route. */
export function StopsMap({ stops, route = false, height = 220 }: Props) {
  const ref = useRef<MapView>(null);
  const coords = stops.map((s) => ({ latitude: s.lat, longitude: s.lng }));
  const key = stops.map((s) => s.id).join(',');

  const fit = useCallback(() => {
    if (stops.length === 0) return;
    ref.current?.fitToCoordinates(
      stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
      { edgePadding: { top: 48, right: 48, bottom: 48, left: 48 }, animated: false },
    );
  }, [stops]);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        key={key}
        ref={ref}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark"
        onMapReady={fit}
        onLayout={fit}
        toolbarEnabled={false}>
        {route && coords.length > 1 ? (
          <Polyline coordinates={coords} strokeColor={colors.primary} strokeWidth={3} lineDashPattern={[6, 6]} />
        ) : null}
        {stops.map((s, i) => (
          <Marker key={s.id} coordinate={{ latitude: s.lat, longitude: s.lng }} title={s.name} tracksViewChanges={false}>
            <View style={[styles.pin, { backgroundColor: s.color ?? colors.primary }, !route && styles.dot]}>
              {route ? <Text style={styles.num}>{i + 1}</Text> : null}
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surface, overflow: 'hidden' },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  dot: { width: 16, height: 16, borderRadius: 8 },
  num: { color: '#0B0B0D', fontFamily: fonts.display, fontSize: 13 },
});
