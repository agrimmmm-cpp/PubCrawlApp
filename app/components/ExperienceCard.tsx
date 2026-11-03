import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Poster } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { Experience } from '@/data/mock';
import { vibeImage, vibeOf } from '@/lib/vibes';

const kmLabel = (km: number) => `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;

export function metaLine(e: Experience) {
  return [e.distanceKm != null ? kmLabel(e.distanceKm) : '', e.duration, `${e.stops} stops`, e.cost].filter(Boolean).join(' · ');
}

/** `card` is the narrow carousel card, `wide` the full-width one used in lists. */
export function ExperienceCard({ e, variant = 'card' }: { e: Experience; variant?: 'card' | 'wide' }) {
  const vibe = vibeOf(e);
  const wide = variant === 'wide';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/experience/[id]', params: { id: e.id } })}
      style={wide ? undefined : styles.card}>
      <Poster gradient={e.gradient} emoji={e.emoji} image={vibe ? vibeImage(vibe.id) : undefined} height={wide ? 280 : 300}>
        <Text style={styles.badge}>{e.badge}</Text>
        <Text style={[styles.title, wide ? { fontSize: 34, lineHeight: 36 } : null]} numberOfLines={3}>
          {e.title}
        </Text>
      </Poster>
      <View style={styles.info}>
        <Text style={styles.meta} numberOfLines={wide ? 2 : 1}>
          {metaLine(e)}
          {e.rating > 0 ? <Text style={{ color: colors.yellow }}> · ★ {e.rating}</Text> : null}
        </Text>
        {wide ? <Text style={styles.route}>{e.route.join('  →  ')}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 240 },
  badge: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    color: '#0B0B0D',
    backgroundColor: colors.yellow,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    transform: [{ rotate: '-3deg' }],
  },
  title: {
    position: 'absolute',
    left: space.md,
    bottom: space.md,
    right: space.md,
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 26,
    letterSpacing: -0.8,
  },
  info: { paddingVertical: space.sm, paddingHorizontal: 2, gap: 4 },
  meta: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13 },
  route: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
});
