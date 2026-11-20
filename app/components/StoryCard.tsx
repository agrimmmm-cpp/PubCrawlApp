import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/theme';

/** Instagram Stories size: 9:16. Drawn at 360 x 640 and captured at 1080 x 1920. */
export const STORY_W = 360;
export const STORY_H = 640;

export type StoryData = {
  title: string;
  date: string;
  duration: string;
  stops: string; // "4 of 5" or "Freestyle"
  chaos: number;
  distance?: string; // "2.4 km"
  rank: string;
  balanced: boolean;
  quests?: string; // "3 of 5"
  tally?: { emoji: string; count: number }[]; // drinks and food, only when the person turns them on
};

export type StoryVariant = 'photo' | 'collage' | 'card';

type Pt = { lat: number; lng: number };

const ORANGE = '#FF5C00';

/**
 * A sketch of the route: the stops as dots joined by a line, scaled to fit. Plain views only (no map, no SVG), so it
 * is drawn the same on every device and captures cleanly into the shared picture.
 */
function RouteSketch({ points, width, height }: { points: Pt[]; width: number; height: number }) {
  if (points.length === 0) return null;
  const k = Math.cos((points[0].lat * Math.PI) / 180);
  const xs = points.map((p) => p.lng * k);
  const ys = points.map((p) => -p.lat);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const span = Math.max(maxX - minX, maxY - minY, 1e-6);
  const pad = 14;
  const scale = Math.min((width - pad * 2) / span, (height - pad * 2) / span);
  const offX = (width - (maxX - minX) * scale) / 2;
  const offY = (height - (maxY - minY) * scale) / 2;
  const pos = points.map((_, i) => ({ x: offX + (xs[i] - minX) * scale, y: offY + (ys[i] - minY) * scale }));

  return (
    <View style={{ width, height }}>
      {pos.slice(1).map((b, i) => {
        const a = pos[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        return <View key={i} style={[styles.seg, { width: len, left: (a.x + b.x) / 2 - len / 2, top: (a.y + b.y) / 2 - 2, transform: [{ rotate: `${angle}rad` }] }]} />;
      })}
      {pos.map((p, i) => {
        const end = i === 0 || i === pos.length - 1;
        return <View key={i} style={[styles.dot, end ? styles.dotEnd : null, { left: p.x - (end ? 8 : 5), top: p.y - (end ? 8 : 5) }, end && { backgroundColor: i === 0 ? '#37E08A' : ORANGE }]} />;
      })}
    </View>
  );
}

/**
 * The picture shared to Instagram Stories and anywhere else: full-bleed photo (or the brand gradient), the route, and
 * the numbers that matter. Nothing on it counts or rewards drinks.
 */
function Tally({ tally }: { tally?: StoryData['tally'] }) {
  if (!tally?.length) return null;
  return (
    <View style={styles.tally}>
      {tally.map((t) => (
        <View key={t.emoji} style={styles.tallyItem}>
          <Text style={styles.tallyEmoji}>{t.emoji}</Text>
          <Text style={styles.tallyCount}>{t.count}</Text>
        </View>
      ))}
    </View>
  );
}

// Which photos go in which row of the collage, for 1 to 6 photos.
const ROWS: number[][][] = [[], [[0]], [[0], [1]], [[0, 1], [2]], [[0, 1], [2, 3]], [[0, 1], [2, 3, 4]], [[0, 1, 2], [3, 4, 5]]];

function Collage({ photos }: { photos: string[] }) {
  const n = Math.min(photos.length, 6);
  const rows = ROWS[n];
  return (
    <View style={styles.collage}>
      {rows.map((row, r) => (
        <View key={r} style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          {row.map((idx) => (
            <View key={idx} style={styles.cell}>
              <Image source={{ uri: photos[idx] }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The picture shared to Instagram Stories and anywhere else, in three styles: a full-bleed photo, a collage of the
 * night's photos, or just the card. The drinks and food tally is shown only when the person switches it on. It is a
 * plain count, never scored.
 */
export function StoryCard({ data, route, photo, photos = [], variant = 'photo', cardRef }: { data: StoryData; route: Pt[]; photo?: string; photos?: string[]; variant?: StoryVariant; cardRef?: Ref<ComponentRef<typeof View>> }) {
  const stats = [
    { label: 'STOPS', value: data.stops },
    { label: 'CHAOS', value: String(data.chaos) },
    ...(data.distance ? [{ label: 'WALKED', value: data.distance }] : data.quests ? [{ label: 'QUESTS', value: data.quests }] : []),
  ];
  const collage = variant === 'collage' && photos.length > 0;
  const bgPhoto = variant === 'photo' ? photo : undefined;

  const header = (
    <View style={styles.top}>
      <Text style={styles.brand}>
        drunkva<Text style={{ color: ORANGE }}>.</Text>
      </Text>
      <Text style={styles.tag}>NIGHT REPORT</Text>
    </View>
  );

  const numbers = (
    <>
      <Text style={styles.label}>TIME OUT</Text>
      <Text style={[styles.big, collage && { fontSize: 56, lineHeight: 58, marginBottom: 6 }]}>{data.duration}</Text>
      <View style={styles.row}>
        {stats.map((s) => (
          <View key={s.label} style={{ flex: 1 }}>
            <Text style={styles.label}>{s.label}</Text>
            <Text style={[styles.stat, collage && { fontSize: 24 }]} numberOfLines={1} adjustsFontSizeToFit>
              {s.value}
            </Text>
          </View>
        ))}
      </View>
      <Tally tally={data.tally} />
      <View style={styles.pills}>
        <Text style={[styles.pill, { backgroundColor: ORANGE, color: '#1A0A00' }]}>{data.rank}</Text>
        {data.balanced ? <Text style={styles.pill}>Stayed hydrated 💧</Text> : null}
      </View>
      <Text style={styles.foot}>#DRUNKVA · GO OUT BETTER</Text>
    </>
  );

  if (collage) {
    return (
      <View ref={cardRef} collapsable={false} style={styles.card}>
        <LinearGradient colors={['#1B0B2E', '#0B0B0D']} style={StyleSheet.absoluteFill} />
        {header}
        <Collage photos={photos} />
        <View>
          <Text style={styles.date}>{data.date.toUpperCase()}</Text>
          <Text style={[styles.title, { fontSize: 30, lineHeight: 32, marginBottom: 12 }]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
            {data.title}
          </Text>
        </View>
        <View style={styles.bottom}>{numbers}</View>
      </View>
    );
  }

  return (
    <View ref={cardRef} collapsable={false} style={styles.card}>
      {bgPhoto ? (
        <>
          <Image source={{ uri: bgPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={['rgba(11,11,13,0.7)', 'rgba(11,11,13,0.05)', 'rgba(11,11,13,0.2)', 'rgba(11,11,13,0.92)']} locations={[0, 0.28, 0.5, 0.88]} style={StyleSheet.absoluteFill} />
        </>
      ) : (
        <>
          <LinearGradient colors={['#2B0D4D', '#8A2A0A', ORANGE]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
          <Text style={styles.watermark}>d.</Text>
          <LinearGradient colors={['rgba(11,11,13,0)', 'rgba(11,11,13,0.55)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
        </>
      )}
      {header}
      <View style={[styles.mid, bgPhoto ? { justifyContent: 'flex-start', paddingTop: 14 } : null]}>
        <Text style={styles.date}>{data.date.toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.6}>
          {data.title}
        </Text>
        {bgPhoto ? null : (
          <View style={{ marginTop: 14 }}>
            <RouteSketch points={route} width={STORY_W - 48} height={150} />
          </View>
        )}
      </View>
      <View style={styles.bottom}>{numbers}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: STORY_W, height: STORY_H, backgroundColor: '#0B0B0D', overflow: 'hidden', padding: 24, justifyContent: 'space-between' },
  watermark: { position: 'absolute', right: -30, top: 150, color: 'rgba(255,255,255,0.07)', fontFamily: fonts.display, fontSize: 420, letterSpacing: -20, lineHeight: 420 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 22 },
  brand: { color: '#fff', fontFamily: fonts.display, fontSize: 30, letterSpacing: -1.2 },
  tag: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 5 },
  mid: { flex: 1, justifyContent: 'center', paddingTop: 18 },
  date: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2 },
  title: { color: '#fff', fontFamily: fonts.display, fontSize: 42, lineHeight: 44, letterSpacing: -1.8, marginTop: 4 },
  bottom: { gap: 2, paddingBottom: 8 },
  label: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 2 },
  big: { color: '#fff', fontFamily: fonts.display, fontSize: 76, lineHeight: 78, letterSpacing: -4, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  stat: { color: '#fff', fontFamily: fonts.display, fontSize: 28, letterSpacing: -1 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { color: '#fff', backgroundColor: 'rgba(255,255,255,0.16)', fontFamily: fonts.bodyBold, fontSize: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, overflow: 'hidden' },
  foot: { color: 'rgba(255,255,255,0.55)', fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 2, marginTop: 14 },
  collage: { height: 196, gap: 6, marginTop: 14, marginBottom: 14 },
  cell: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#1C1C20' },
  tally: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 12 },
  tallyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tallyEmoji: { fontSize: 20 },
  tallyCount: { color: '#fff', fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.5 },
  seg: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: '#fff' },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff', borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)' },
  dotEnd: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#fff' },
});
