import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/theme';

export type NightCardData = {
  title: string; // the crawl, or "Freestyle night"
  date: string; // "Sat, 16 Nov"
  duration: string; // "4h 12m"
  stops: string; // "4 of 5" or "Freestyle"
  chaos: number; // side-quest points. Never from drinks.
  moments: number;
  rank: string; // the night title, e.g. "Chaos Agent"
  balanced: boolean; // water kept pace with drinks
};

const INK = '#2A0F00';

/**
 * The card people share. It is drawn to be captured as a picture, so it only uses plain views and one gradient.
 * Nothing on it rewards drinking: the big numbers are time, stops and quest points.
 */
export function NightCard({ data, cardRef }: { data: NightCardData; cardRef?: Ref<ComponentRef<typeof View>> }) {
  return (
    <View ref={cardRef} collapsable={false} style={styles.shadow}>
      <LinearGradient colors={['#FF9B4D', '#F2641F', '#D9480F']} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.card}>
        <View style={styles.top}>
          <Text style={styles.brand}>DRUNKVA</Text>
          <Text style={styles.tag}>NIGHT REPORT</Text>
        </View>

        <Text style={styles.label}>TIME OUT</Text>
        <Text style={styles.big}>{data.duration}</Text>

        <View style={styles.grid}>
          <View style={styles.cell}>
            <Text style={styles.label}>STOPS</Text>
            <Text style={styles.mid}>{data.stops}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>CHAOS POINTS</Text>
            <Text style={styles.mid}>{data.chaos}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.label}>MOMENTS</Text>
            <Text style={styles.mid}>{data.moments}</Text>
          </View>
        </View>

        <View style={styles.badges}>
          <Text style={styles.badge}>{data.rank}</Text>
          {data.balanced ? <Text style={styles.badge}>Stayed hydrated 💧</Text> : null}
        </View>

        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{data.date}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {data.title}
            </Text>
          </View>
          <Text style={styles.mark}>d.</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 26, shadowColor: '#FF5C00', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.35, shadowRadius: 24, elevation: 14 },
  card: { borderRadius: 26, padding: 22, gap: 6, minHeight: 440 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brand: { color: INK, fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4 },
  tag: { color: INK, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, borderWidth: 1, borderColor: 'rgba(42,15,0,0.45)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  label: { color: 'rgba(42,15,0,0.62)', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.6 },
  big: { color: INK, fontFamily: fonts.display, fontSize: 72, lineHeight: 76, letterSpacing: -3, marginBottom: 14 },
  grid: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  cell: { flex: 1, gap: 2 },
  mid: { color: INK, fontFamily: fonts.display, fontSize: 30, letterSpacing: -1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { color: '#FFF3E8', backgroundColor: 'rgba(42,15,0,0.78)', fontFamily: fonts.bodyBold, fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, overflow: 'hidden' },
  footer: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 'auto', paddingTop: 22 },
  date: { color: 'rgba(42,15,0,0.62)', fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1 },
  title: { color: INK, fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.6, marginTop: 2 },
  mark: { color: INK, fontFamily: fonts.display, fontSize: 34, letterSpacing: -2 },
});
