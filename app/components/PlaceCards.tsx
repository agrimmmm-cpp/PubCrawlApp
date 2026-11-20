import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoChip, PriceSigns, RatingText } from '@/components/GoogleBits';
import { colors, fonts, space } from '@/constants/theme';
import { Place } from '@/data/mock';
import { Group, Layout } from '@/lib/categories';
import { useGoogleInfo, GoogleInfo } from '@/lib/googlePlace';
import { photoFor } from '@/lib/story';
import { vibeById, vibeImage } from '@/lib/vibes';

const SCREEN_W = Dimensions.get('window').width;
export const PAGER_W = SCREEN_W - space.lg * 2 - 8;

/** The best picture we have of a place: its own from Google, then Wikimedia, then a stock photo that fits its kind. */
export function usePlacePhoto(place: Place, group?: Group, card = true) {
  // Places with no Google id yet are looked up by name and position; real places have UUID ids, sample ones do not.
  const lookup = !place.googleId && /^[0-9a-f-]{36}$/.test(place.id) ? { id: place.id, name: place.name, lat: place.lat, lng: place.lng } : undefined;
  const g = useGoogleInfo(place.googleId, 'details', true, card, lookup);
  const stock = photoFor(place);
  const fallback = group ? vibeImage(group.vibeId, place.id) : stock?.image;
  const image = g?.photoUri ? { uri: g.photoUri } : place.photo ? { uri: place.photo.url } : (stock?.real ? stock.image : fallback ?? stock?.image);
  return { image: image as never, google: g, gradient: (group ? vibeById(group.vibeId)?.gradient : stock?.gradient) ?? (['#2A1F14', '#FF5C00'] as [string, string]) };
}

const kindLabel = (p: Place) => (p.subcategory ? p.subcategory[0].toUpperCase() + p.subcategory.slice(1) : '');
// Google's price level shows as its own chip. Without one, an honest estimate: about what one person spends.
const estimate = (p: Place, g: GoogleInfo | null | undefined) => (g?.priceLevel != null || p.estCad == null ? null : p.estCad === 0 ? 'Free' : `about $${p.estCad}`);

function Credit({ g }: { g: GoogleInfo | null | undefined }) {
  return g?.photoUri ? (
    <Text style={styles.credit} numberOfLines={1}>
      📷 {g.photoBy ?? 'Google contributor'} · Google Maps
    </Text>
  ) : null;
}

/** "★ 4.4 (1.2k)  $$" on one line, for cards that have the room underneath the photo. */
function ReviewLine({ g, size = 12 }: { g: GoogleInfo | null | undefined; size?: number }) {
  if (!g || (!g.rating && g.priceLevel == null)) return null;
  return (
    <View style={styles.review}>
      {g.rating ? <RatingText rating={g.rating} count={g.ratingCount} size={size} /> : null}
      <PriceSigns level={g.priceLevel} size={size} />
    </View>
  );
}

/**
 * One place, drawn five ways so a long page does not read as the same box repeated: a tall poster, a plain square with
 * its text underneath, a wide photo, a borderless row, and a full-width hero for paging through.
 */
export function PlaceCard({ place, layout, group, onOpen }: { place: Place; layout: Layout; group?: Group; onOpen: (p: Place) => void }) {
  const { image, google: g, gradient } = usePlacePhoto(place, group);
  const open = () => onOpen(place);
  const meta = [kindLabel(place), estimate(place, g), place.distanceKm != null ? `${place.distanceKm < 10 ? place.distanceKm.toFixed(1) : Math.round(place.distanceKm)} km` : '']
    .filter(Boolean)
    .join(' · ');

  if (layout === 'row') {
    return (
      <Pressable onPress={open} style={styles.row}>
        <View style={styles.rowImg}>
          <Photo image={image} gradient={gradient} emoji={place.emoji} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            {place.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
          <ReviewLine g={g} />
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    );
  }

  if (layout === 'square') {
    return (
      <Pressable onPress={open} style={styles.square}>
        <View style={styles.squareImg}>
          <Photo image={image} gradient={gradient} emoji={place.emoji} />
          <Credit g={g} />
        </View>
        <Text style={styles.sqName} numberOfLines={2}>
          {place.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
        <ReviewLine g={g} size={11} />
      </Pressable>
    );
  }

  const tall = layout === 'poster';
  const pager = layout === 'pager';
  const w = pager ? PAGER_W : tall ? 146 : 252;
  const h = pager ? 232 : tall ? 206 : 148;
  return (
    <Pressable onPress={open} style={{ width: w }}>
      <View style={[styles.hero, { height: h }]}>
        <Photo image={image} gradient={gradient} emoji={place.emoji} />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.82)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
        {!tall && g?.openNow ? (
          <View style={styles.statusChip}>
            <View style={[styles.statusDot, { backgroundColor: colors.green }]} />
            <Text style={styles.statusText}>Open now</Text>
          </View>
        ) : !tall && place.late ? (
          <View style={styles.statusChip}>
            <View style={[styles.statusDot, { backgroundColor: colors.yellow }]} />
            <Text style={styles.statusText}>Open late</Text>
          </View>
        ) : null}
        {g && (g.rating || g.priceLevel != null) ? (
          <View style={styles.topRight}>
            {g.rating ? (
              <PhotoChip>
                <RatingText rating={g.rating} count={g.ratingCount} size={tall ? 11 : 12} light />
              </PhotoChip>
            ) : null}
            {g.priceLevel != null ? (
              <PhotoChip>
                <PriceSigns level={g.priceLevel} size={tall ? 11 : 12} />
              </PhotoChip>
            ) : null}
          </View>
        ) : null}
        <View style={styles.heroText}>
          <Text style={[styles.heroName, pager && { fontSize: 24, lineHeight: 26 }]} numberOfLines={2}>
            {place.name}
          </Text>
          <View style={styles.metaRow}>
            {tall && (g?.openNow || place.late) ? <View style={[styles.statusDot, { backgroundColor: g?.openNow ? colors.green : colors.yellow }]} /> : null}
            <Text style={[styles.heroMeta, { flexShrink: 1 }]} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Photo({ image, gradient, emoji }: { image: never; gradient: [string, string]; emoji: string }) {
  return image ? (
    <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
  ) : (
    <LinearGradient colors={gradient} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  credit: { position: 'absolute', left: 8, bottom: 3, maxWidth: '90%', color: 'rgba(255,255,255,0.75)', fontFamily: fonts.body, fontSize: 9 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // row
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 8 },
  rowImg: { width: 62, height: 62, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface },
  rowName: { color: colors.text, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.4 },
  chev: { color: colors.textFaint, fontSize: 26 },
  // square
  square: { width: 124, gap: 3 },
  squareImg: { width: 124, height: 124, borderRadius: 18, overflow: 'hidden', backgroundColor: colors.surface, marginBottom: 4 },
  sqName: { color: colors.text, fontFamily: fonts.display, fontSize: 14, lineHeight: 16, letterSpacing: -0.3 },
  // poster, wide and pager
  hero: { borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surface },
  heroText: { position: 'absolute', left: space.md, right: space.md, bottom: space.md - 2, gap: 1 },
  heroName: { color: '#fff', fontFamily: fonts.display, fontSize: 18, lineHeight: 20, letterSpacing: -0.5 },
  heroMeta: { color: 'rgba(255,255,255,0.78)', fontFamily: fonts.bodyMedium, fontSize: 12 },
  topRight: { position: 'absolute', top: space.sm + 2, right: space.sm + 2, alignItems: 'flex-end', gap: 4 },
  statusChip: { position: 'absolute', top: space.sm + 2, left: space.sm + 2, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(14,14,16,0.78)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 10 },
  lateTag: { position: 'absolute', left: space.md, top: space.md, color: '#0B0B0D', backgroundColor: colors.yellow, fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden', borderRadius: 4 },
  under: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingHorizontal: 2 },
  openTag: { fontFamily: fonts.bodyBold, fontSize: 11 },
});
