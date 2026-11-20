import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space } from '@/constants/theme';
import { vibeImage } from '@/lib/vibes';

/**
 * Full-width pauses between the lists on Explore. They have no card edges and are all type and picture, so the page
 * changes pace instead of repeating one shape.
 */

/** Huge type over a photo that runs edge to edge. */
export function BigTypeBreak({ kicker, line1, line2, vibeId, seed, cta, onPress, tint = colors.primary }: { kicker: string; line1: string; line2: string; vibeId: string; seed: string; cta?: string; onPress?: () => void; tint?: string }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={styles.big}>
      <Image source={vibeImage(vibeId, seed)} style={StyleSheet.absoluteFill} contentFit="cover" />
      <LinearGradient colors={['rgba(11,11,13,0.2)', 'rgba(11,11,13,0.9)']} style={StyleSheet.absoluteFill} />
      <View style={styles.bigText}>
        <Text style={[styles.kicker, { color: tint }]}>{kicker}</Text>
        <Text style={styles.bigLine}>{line1}</Text>
        <Text style={[styles.bigLine, { color: tint }]}>{line2}</Text>
        {cta ? <Text style={styles.cta}>{cta}  →</Text> : null}
      </View>
    </Pressable>
  );
}

/** Three photos slanted into a strip, with a line of type across them. */
export function MosaicBreak({ kicker, line, vibeIds, seed }: { kicker: string; line: string; vibeIds: string[]; seed: string }) {
  return (
    <View style={styles.mosaic}>
      <View style={styles.strip}>
        {vibeIds.slice(0, 3).map((v, i) => (
          <View key={v + i} style={[styles.slant, { transform: [{ rotate: i === 1 ? '3deg' : '-3deg' }, { translateY: i === 1 ? 10 : 0 }] }]}>
            <Image source={vibeImage(v, seed + i)} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        ))}
      </View>
      <Text style={[styles.kicker, { marginTop: space.lg }]}>{kicker}</Text>
      <Text style={styles.mosaicLine}>{line}</Text>
    </View>
  );
}

/** One big number and what it counts. */
export function StatBreak({ value, label, cta, onPress }: { value: string; label: string; cta?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <LinearGradient colors={['#2B0D4D', '#B8330A', '#FF5C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stat}>
        <Text style={styles.statNum}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        {cta ? <Text style={[styles.cta, { color: '#fff' }]}>{cta}  →</Text> : null}
      </LinearGradient>
    </Pressable>
  );
}

/** A line of type between two thin rules, nothing else. */
export function QuoteBreak({ text }: { text: string }) {
  return (
    <View style={styles.quote}>
      <View style={styles.rule} />
      <Text style={styles.quoteText}>{text}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2 },
  cta: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14, marginTop: space.md },
  big: { height: 236, justifyContent: 'flex-end', backgroundColor: colors.surface },
  bigText: { padding: space.lg, paddingBottom: space.xl, gap: 2 },
  bigLine: { color: '#fff', fontFamily: fonts.display, fontSize: 38, lineHeight: 38, letterSpacing: -1.6 },
  mosaic: { paddingVertical: space.xl, paddingHorizontal: space.lg },
  strip: { flexDirection: 'row', gap: 10, height: 120 },
  slant: { flex: 1, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface },
  mosaicLine: { color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 32, letterSpacing: -1.2, marginTop: 6 },
  stat: { paddingVertical: 34, paddingHorizontal: space.lg, gap: 4 },
  statNum: { color: '#fff', fontFamily: fonts.display, fontSize: 76, lineHeight: 76, letterSpacing: -4 },
  statLabel: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.bodyBold, fontSize: 17, maxWidth: 300, lineHeight: 22 },
  quote: { paddingVertical: space.xl, paddingHorizontal: space.lg, gap: space.lg },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, width: '100%' },
  quoteText: { color: colors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 29, letterSpacing: -1, textAlign: 'center' },
});
