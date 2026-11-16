import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Poster } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { Experience } from '@/data/mock';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { useLive } from '@/lib/live';
import { Tag, tagsFor, Tone } from '@/lib/tags';
import { vibeImage, vibeOf } from '@/lib/vibes';

const kmLabel = (km: number) => `${km < 10 ? km.toFixed(1) : Math.round(km)} km away`;

const TONE: Record<Tone, string> = { price: colors.yellow, hot: colors.primary, cool: colors.blue, plain: colors.textDim };

export function TagRow({ tags }: { tags: Tag[] }) {
  return (
    <View style={styles.tags}>
      {tags.map((t) => (
        <View key={t.label} style={[styles.tag, { borderColor: `${TONE[t.tone]}66` }]}>
          <Text style={[styles.tagText, { color: TONE[t.tone] }]}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** Total straight-line walking distance between the stops, when their positions are known. */
function walkTotal(e: Experience) {
  const p = e.stopPlaces ?? [];
  if (p.length < 2) return undefined;
  const m = p.slice(1).reduce((sum, s, i) => (e.stopInfo?.[i + 1]?.ride ? sum : sum + distanceMeters(p[i], s)), 0);
  return m > 0 ? formatDistance(m) : undefined;
}

/**
 * `card` is the narrow carousel card. `wide` is the full-width card used in lists, with the route and a
 * Start button.
 */
export function ExperienceCard({ e, variant = 'card' }: { e: Experience; variant?: 'card' | 'wide' }) {
  const { start } = useLive();
  const vibe = vibeOf(e);
  const wide = variant === 'wide';
  const walk = walkTotal(e);
  const last = e.route[e.route.length - 1];

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/experience/[id]', params: { id: e.id } })}
      style={[styles.shadow, wide ? styles.wide : styles.narrow]}>
      <View style={styles.clip}>
        <Poster gradient={e.gradient} emoji={e.emoji} image={vibe ? vibeImage(vibe.id) : undefined} height={230}>
          <View style={[styles.chip, styles.chipLeft, { borderColor: `${colors.primary}66` }]}>
            <Text style={[styles.chipText, { color: colors.primary, letterSpacing: 1 }]}>{e.badge}</Text>
          </View>
          {e.rating > 0 ? (
            <View style={[styles.chip, styles.chipRight]}>
              <Text style={styles.chipText}>
                <Text style={{ color: colors.yellow }}>★ </Text>
                {e.rating}
                {e.reviews ? <Text style={{ color: colors.textDim }}> ({e.reviews})</Text> : null}
              </Text>
            </View>
          ) : e.distanceKm != null ? (
            <View style={[styles.chip, styles.chipRight]}>
              <Text style={styles.chipText}>{kmLabel(e.distanceKm)}</Text>
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {e.title}
          </Text>
        </Poster>

        <View style={styles.info}>
          <View style={styles.metaRow}>
            <Text style={styles.meta} numberOfLines={1}>
              <Text style={{ color: colors.blue, fontFamily: fonts.bodyBold }}>{e.duration}</Text>
              {`  •  ${e.stops} stops`}
            </Text>
            {walk ? <Text style={styles.walk}>{walk} on foot</Text> : null}
          </View>

          <TagRow tags={tagsFor(e, wide ? 5 : 4)} />

          {wide ? (
            <>
              <View style={styles.route}>
                <Text style={styles.routeText} numberOfLines={2}>
                  {e.route.slice(0, -1).join('  →  ')}
                  {e.route.length > 1 ? '  →  ' : ''}
                  <Text style={{ color: colors.blue }}>{last}</Text>
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  start('experience', e.id);
                  router.navigate('/live');
                }}
                style={styles.start}>
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.startText}>Start Experience</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Outer view carries the drop shadow; the inner one clips the rounded corners.
  shadow: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 12,
  },
  clip: { borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.line },
  narrow: { width: 260 },
  wide: { marginHorizontal: space.lg },
  chip: {
    position: 'absolute',
    top: space.md,
    backgroundColor: 'rgba(20,20,23,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipLeft: { left: space.md },
  chipRight: { right: space.md },
  chipText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 11 },
  title: {
    position: 'absolute',
    left: space.md + 2,
    bottom: space.md,
    right: space.md,
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 27,
    letterSpacing: -0.6,
  },
  info: { padding: space.md + 2, gap: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meta: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13, flexShrink: 1 },
  walk: { color: colors.textFaint, fontFamily: fonts.bodyMedium, fontSize: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  route: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  routeText: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 19 },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  startText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
});
