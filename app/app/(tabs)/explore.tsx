import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BigTypeBreak, MosaicBreak, QuoteBreak, StatBreak } from '@/components/Breaks';
import { PAGER_W, PlaceCard, usePlacePhoto } from '@/components/PlaceCards';
import { PlaceSheet } from '@/components/PlaceSheet';
import { StopsMap } from '@/components/StopsMap';
import { Chip, Display, Header, Screen, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { Place, PlaceCategory } from '@/data/mock';
import { Group, GROUPS, groupById } from '@/lib/categories';
import { useNearMe } from '@/lib/location';
import { CITIES, PriceBand, useLateCount, usePlaceGroup } from '@/lib/places';
import { vibeImage } from '@/lib/vibes';

const NEAR = 'Near me';

const pinColor: Record<PlaceCategory, string> = {
  bar: colors.primary,
  nightclub: colors.pink,
  food: colors.yellow,
  activity: colors.blue,
  viewpoint: colors.green,
};

type Scope = { city?: string; near?: { lat: number; lng: number }; price?: PriceBand; late?: boolean };
type Open = (p: Place, g?: Group) => void;

// The order of the page. Lists and breaks alternate, and each list is drawn in a different shape.
type Item = { type: 'group'; id: string } | { type: 'break'; id: string };
const HOME: Item[] = [
  { type: 'group', id: 'dining' },
  { type: 'break', id: 'hungry' },
  { type: 'group', id: 'fast' },
  { type: 'group', id: 'cafes' },
  { type: 'break', id: 'mosaic' },
  { type: 'group', id: 'pubs' },
  { type: 'group', id: 'breweries' },
  { type: 'break', id: 'late' },
  { type: 'group', id: 'bars' },
  { type: 'group', id: 'clubs' },
  { type: 'break', id: 'quote' },
  { type: 'group', id: 'games' },
  { type: 'group', id: 'culture' },
  { type: 'break', id: 'view' },
  { type: 'group', id: 'scenic' },
];

export default function Explore() {
  const { near, note, request } = useNearMe();
  const [choice, setChoice] = useState('Vancouver');
  const [q, setQ] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [price, setPrice] = useState<PriceBand>('any');
  const [late, setLate] = useState(false);
  const [filters, setFilters] = useState(false);
  const [selected, setSelected] = useState<{ place: Place; group?: Group } | null>(null);

  const isNear = choice === NEAR && !!near;
  const city = choice === NEAR ? 'Vancouver' : choice;
  const scope: Scope = useMemo(
    () => ({ city: isNear ? undefined : city, near: isNear ? near : undefined, price: price === 'any' ? undefined : price, late: late || undefined }),
    [isNear, city, near, price, late],
  );
  const where = isNear ? 'near you' : `in ${city}`;
  const searching = q.trim().length >= 2;
  const group = groupId ? groupById(groupId) : undefined;
  const lateCount = useLateCount(scope.city, scope.near);
  const openPlace: Open = (place, g) => setSelected({ place, group: g });

  const pickPlace = async (value: string) => {
    if (value !== NEAR) setChoice(value);
    else if (await request()) setChoice(NEAR);
  };

  const filtersActive = price !== 'any' || late;

  const header = (
    <View>
      <Header place={isNear ? 'Near you' : city} />
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
        <Display style={{ fontSize: 36, lineHeight: 38 }}>
          Find your <Text style={{ color: colors.pink }}>vibe</Text>
        </Display>
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.primary} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search by name…" placeholderTextColor={colors.textFaint} style={styles.searchInput} />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textFaint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.lg }}>
        <TextTabs glow items={[NEAR, ...CITIES]} active={isNear ? NEAR : city} onChange={pickPlace} />
      </ScrollView>
      {note ? <Text style={styles.note}>{note}</Text> : null}

      <View style={styles.filterBar}>
        <Pressable onPress={() => setFilters(!filters)} style={styles.filterBtn}>
          <Ionicons name="options" size={15} color={colors.text} />
          <Text style={styles.filterText}>Filters</Text>
          {filtersActive ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>
      {filters ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(['any', 'free', '$', '$$', '$$$'] as PriceBand[]).map((b) => (
            <Chip key={b} label={b === 'any' ? 'Any price' : b === 'free' ? 'Free' : b} active={price === b} onPress={() => setPrice(b)} />
          ))}
          <Chip label="Open late" active={late} onPress={() => setLate(!late)} />
        </ScrollView>
      ) : null}

      {!searching && !group ? (
        <>
          <Text style={styles.railTitle}>What are you after?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
            {GROUPS.map((g) => (
              <Pressable key={g.id} onPress={() => setGroupId(g.id)} style={styles.tile}>
                <Image source={vibeImage(g.vibeId, `tile-${g.id}`)} style={StyleSheet.absoluteFill} contentFit="cover" />
                <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.tileEmoji}>{g.emoji}</Text>
                <View style={styles.tileText}>
                  <Text style={styles.tileName}>{g.title}</Text>
                  <Text style={styles.tileBlurb} numberOfLines={2}>
                    {g.blurb}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <Spotlight scope={scope} onOpen={openPlace} />
        </>
      ) : null}
    </View>
  );

  // Search: a plain list of matches.
  if (searching) {
    return (
      <Screen>
        <ResultsList header={header} title={`Results ${where}`} scope={scope} query={q} onOpen={openPlace} />
        {selected ? <PlaceSheet place={selected.place} group={selected.group} onClose={() => setSelected(null)} /> : null}
      </Screen>
    );
  }

  // One category, with a map and a longer list.
  if (group) {
    return (
      <Screen>
        <ResultsList
          header={header}
          title={`${group.emoji} ${group.title} ${where}`}
          scope={scope}
          group={group}
          onBack={() => setGroupId(null)}
          onOpen={openPlace}
        />
        {selected ? <PlaceSheet place={selected.place} group={selected.group} onClose={() => setSelected(null)} /> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={HOME}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={header}
        // Only the sections near the screen are drawn, so only they ask the database (and Google) for anything.
        initialNumToRender={3}
        windowSize={5}
        maxToRenderPerBatch={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        renderItem={({ item }) => {
          if (item.type === 'group') {
            const g = groupById(item.id)!;
            return <Section group={g} scope={scope} onOpen={openPlace} onAll={() => setGroupId(g.id)} />;
          }
          switch (item.id) {
            case 'hungry':
              return <BigTypeBreak kicker="HUNGRY?" line1="Fast, cheap" line2="and good." vibeId="eats" seed="break-hungry" cta="See fast food" onPress={() => setGroupId('fast')} />;
            case 'mosaic':
              return <MosaicBreak kicker="AFTER DARK" line="Now it gets loud." vibeIds={['pub', 'brewery', 'cocktails']} seed="break-mosaic" />;
            case 'late':
              return <StatBreak value={lateCount == null ? '…' : lateCount.toLocaleString('en-CA')} label={`places ${where} are open past midnight.`} cta={late ? 'Showing late spots' : 'Show only late spots'} onPress={() => setLate(true)} />;
            case 'quote':
              return <QuoteBreak text="Nobody ever regretted the last round of fries." />;
            default:
              return <BigTypeBreak kicker="FINISH HIGH" line1="End the night" line2="with a view." vibeId="scenic" seed="break-view" tint={colors.yellow} cta="See scenic spots" onPress={() => setGroupId('scenic')} />;
          }
        }}
        ListFooterComponent={<Text style={styles.credit}>Place data © OpenStreetMap contributors. Photos, ratings and prices from Google Maps where shown. Hours may be out of date.</Text>}
      />
      {selected ? <PlaceSheet place={selected.place} group={selected.group} onClose={() => setSelected(null)} /> : null}
    </Screen>
  );
}

/** Today's pick: one place, big, from places that have a real photo. The same one all day. */
function Spotlight({ scope, onOpen }: { scope: Scope; onOpen: Open }) {
  const { places } = usePlaceGroup({ ...scope, subs: ['bar', 'pub', 'brewery', 'restaurant'], googleOnly: true, limit: 12 });
  const [day] = useState(() => Math.floor(Date.now() / 86_400_000)); // one pick for the whole day
  const place = places.length ? places[day % places.length] : undefined;
  if (!place) return null;
  return <SpotlightCard place={place} onOpen={onOpen} />;
}

function SpotlightCard({ place, onOpen }: { place: Place; onOpen: Open }) {
  const { image, google: g, gradient } = usePlacePhoto(place, undefined, true);
  return (
    <Pressable onPress={() => onOpen(place)} style={styles.spot}>
      {image ? <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" /> : <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />}
      <LinearGradient colors={['rgba(11,11,13,0.1)', 'rgba(11,11,13,0.92)']} style={StyleSheet.absoluteFill} />
      <View style={styles.spotText}>
        <Text style={styles.spotKicker}>TONIGHT&apos;S PICK</Text>
        <Text style={styles.spotName}>{place.name}</Text>
        <Text style={styles.spotMeta}>
          {[place.subcategory, g?.rating ? `★ ${g.rating.toFixed(1)}` : '', place.late ? 'open late' : ''].filter(Boolean).join('  ·  ')}
        </Text>
      </View>
    </Pressable>
  );
}

/** One kind of place: a big title, then its places drawn in that kind's own shape. */
function Section({ group, scope, onOpen, onAll }: { group: Group; scope: Scope; onOpen: Open; onAll: () => void }) {
  const { places, loading } = usePlaceGroup({ ...scope, subs: group.subs, category: group.category, limit: group.layout === 'row' ? 5 : 10 });
  if (!loading && places.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{group.title}</Text>
          <Text style={styles.sectionBlurb}>{group.blurb}</Text>
        </View>
        <Pressable onPress={onAll} hitSlop={10}>
          <Text style={styles.seeAll}>See all ›</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.skeleton} />
      ) : group.layout === 'row' ? (
        <View>
          {places.map((p) => (
            <PlaceCard key={p.id} place={p} layout="row" group={group} onOpen={(x) => onOpen(x, group)} />
          ))}
        </View>
      ) : (
        <FlatList
          horizontal
          data={places}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: space.lg, gap: group.layout === 'pager' ? space.md : space.md }}
          snapToInterval={group.layout === 'pager' ? PAGER_W + space.md : undefined}
          decelerationRate={group.layout === 'pager' ? 'fast' : 'normal'}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          renderItem={({ item }) => <PlaceCard place={item} layout={group.layout} group={group} onOpen={(x) => onOpen(x, group)} />}
        />
      )}
    </View>
  );
}

/** A longer list for search results or one category, with a map above it. */
function ResultsList({ header, title, scope, group, query, onBack, onOpen }: { header: React.ReactElement; title: string; scope: Scope; group?: Group; query?: string; onBack?: () => void; onOpen: Open }) {
  const { places, loading } = usePlaceGroup({ ...scope, subs: group?.subs, category: group?.category, query, limit: 60 });
  return (
    <FlatList
      data={places}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View>
          {header}
          <View style={styles.resultsHead}>
            {onBack ? (
              <Pressable onPress={onBack} style={styles.back} hitSlop={10}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
                <Text style={styles.backText}>All categories</Text>
              </Pressable>
            ) : null}
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionBlurb}>{loading ? 'Loading…' : `${places.length} ${places.length === 1 ? 'place' : 'places'}`}</Text>
          </View>
          {places.length > 0 && !query ? <StopsMap stops={places.map((p) => ({ ...p, color: pinColor[p.category] }))} height={200} /> : null}
        </View>
      }
      initialNumToRender={8}
      windowSize={7}
      contentContainerStyle={{ paddingBottom: 48 }}
      renderItem={({ item }) => <PlaceCard place={item} layout="row" group={group} onOpen={(x) => onOpen(x, group)} />}
      ListEmptyComponent={loading ? undefined : <Text style={[styles.sectionBlurb, { padding: space.lg }]}>No places match.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.md, borderBottomWidth: 2, borderBottomColor: colors.primary },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 16, fontFamily: fonts.bodyMedium },
  note: { color: colors.yellow, fontFamily: fonts.bodyMedium, fontSize: 12, paddingHorizontal: space.lg, marginTop: space.sm },
  filterBar: { flexDirection: 'row', paddingHorizontal: space.lg, marginTop: space.md },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: colors.line },
  filterText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  chips: { paddingHorizontal: space.lg, gap: space.sm, marginTop: space.md },
  railTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.7, paddingHorizontal: space.lg, marginTop: space.xl },
  rail: { paddingHorizontal: space.lg, gap: space.md, marginTop: space.md },
  tile: { width: 128, height: 164, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.surface },
  tileEmoji: { position: 'absolute', left: 12, top: 10, fontSize: 24 },
  tileText: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 2 },
  tileName: { color: '#fff', fontFamily: fonts.display, fontSize: 17, lineHeight: 18, letterSpacing: -0.5 },
  tileBlurb: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.body, fontSize: 11, lineHeight: 14 },
  spot: { height: 250, marginTop: space.xl, backgroundColor: colors.surface, justifyContent: 'flex-end' },
  spotText: { padding: space.lg, gap: 3 },
  spotKicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2 },
  spotName: { color: '#fff', fontFamily: fonts.display, fontSize: 34, lineHeight: 34, letterSpacing: -1.5 },
  spotMeta: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.bodyMedium, fontSize: 14, textTransform: 'capitalize' },
  section: { marginTop: space.xl },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.lg, marginBottom: space.md },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 25, letterSpacing: -1 },
  sectionBlurb: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
  seeAll: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13 },
  skeleton: { height: 150, marginHorizontal: space.lg, borderRadius: 18, backgroundColor: colors.surface, opacity: 0.6 },
  resultsHead: { paddingHorizontal: space.lg, marginTop: space.xl, marginBottom: space.md, gap: 2 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: space.sm },
  backText: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 13 },
  credit: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11, padding: space.lg, marginTop: space.lg },
});
