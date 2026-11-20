import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

/** "1,203" or "1.2k": short enough for a small card. */
const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

/** Five stars for a rating out of 5 (half stars included), then the number and how many people rated it. For roomy places. */
export function Stars({ rating, count, size = 13 }: { rating: number; count?: number | null; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={rating >= n - 0.25 ? 'star' : rating >= n - 0.75 ? 'star-half' : 'star-outline'}
          size={size}
          color={rating >= n - 0.75 ? colors.yellow : colors.textFaint}
        />
      ))}
      <Text style={[styles.num, { fontSize: size }]}>{rating.toFixed(1)}</Text>
      {count ? <Text style={[styles.count, { fontSize: size - 1 }]}>({short(count)})</Text> : null}
    </View>
  );
}

/** One star, the number and the count on a single short line: "★ 4.4 (1.2k)". For small cards, where five stars would not fit. */
export function RatingText({ rating, count, size = 12, light = false }: { rating: number; count?: number | null; size?: number; light?: boolean }) {
  return (
    <Text style={{ fontFamily: fonts.bodyBold, fontSize: size, color: light ? '#fff' : colors.text }} numberOfLines={1}>
      <Text style={{ color: colors.yellow }}>★ </Text>
      {rating.toFixed(1)}
      {count ? <Text style={{ fontFamily: fonts.body, color: light ? 'rgba(255,255,255,0.7)' : colors.textDim }}>{` (${short(count)})`}</Text> : null}
    </Text>
  );
}

/** The price as it is: "$", "$$", "$$$", "$$$$" or Free. Only the signs that apply, in one colour, so it reads at a glance. */
export function PriceSigns({ level, size = 13 }: { level: number | null | undefined; size?: number }) {
  if (level == null) return null;
  return <Text style={{ color: colors.green, fontFamily: fonts.bodyBold, fontSize: size }}>{level === 0 ? 'Free' : '$'.repeat(Math.min(4, level))}</Text>;
}

/** A small dark chip that sits on a photo. */
export function PhotoChip({ children, tint }: { children: React.ReactNode; tint?: string }) {
  return <View style={[styles.chip, tint ? { borderColor: `${tint}88` } : null]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  num: { color: colors.text, fontFamily: fonts.bodyBold, marginLeft: 5 },
  count: { color: colors.textDim, fontFamily: fonts.body, marginLeft: 3 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(14,14,16,0.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
});
