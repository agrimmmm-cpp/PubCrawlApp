import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { StopsMap } from '@/components/StopsMap';
import { Button, Chip, Display, Divider, Header, Screen, TextTabs, VibeTile } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { PlaceCategory } from '@/data/mock';
import { useNearMe } from '@/lib/location';
import { CITIES, PriceBand, placeTier, usePlaceSearch } from '@/lib/places';
import { VIBES, vibeImage } from '@/lib/vibes';

const NEAR = 'Near me';

const pinColor: Record<PlaceCategory, string> = {
  bar: colors.primary,
  nightclub: colors.pink,
  food: colors.yellow,
  activity: colors.blue,
  viewpoint: colors.green,
};

const label: Record<PlaceCategory, string> = {
  bar: 'Bar',
  nightclub: 'Nightclub',
  food: 'Food',
  activity: 'Games',
  viewpoint: 'Viewpoint',
};

export default function Explore() {
  const { near, note, request } = useNearMe();
  const [choice, setChoice] = useState('Vancouver');
  const [vibe, setVibe] = useState<string | undefined>();
  const [lateOnly, setLateOnly] = useState(false);
  const [price, setPrice] = useState<PriceBand>('any');
  const [q, setQ] = useState('');
  const isNear = choice === NEAR && !!near;
  const { places: shown, loading, capped } = usePlaceSearch({
    city: choice === NEAR ? undefined : choice,
    near: isNear ? near : undefined,
    vibe,
    lateOnly,
    price,
    query: q,
  });

  const pickPlace = async (value: string) => {
    if (value !== NEAR) {
      setChoice(value);
    } else if (await request()) {
      setChoice(NEAR);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header place={isNear ? 'Near you' : choice === NEAR ? 'Vancouver' : choice} />

        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
          <Display style={{ fontSize: 34, lineHeight: 36 }}>
            Find your <Text style={{ color: colors.pink }}>vibe</Text>
          </Display>
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={colors.primary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search places…"
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
            />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.lg }}>
          <TextTabs glow items={[NEAR, ...CITIES]} active={isNear ? NEAR : choice === NEAR ? 'Vancouver' : choice} onChange={pickPlace} />
        </ScrollView>
        {note ? <Text style={styles.note}>{note}</Text> : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={{ marginTop: space.lg }}>
          {VIBES.map((v) => (
            <VibeTile
              key={v.id}
              label={v.label}
              emoji={v.emoji}
              gradient={v.gradient}
              image={vibeImage(v.id)}
              active={vibe === v.id}
              onPress={() => setVibe(vibe === v.id ? undefined : v.id)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, { marginTop: space.md }]}>
          {(['any', 'free', '$', '$$', '$$$'] as PriceBand[]).map((b) => (
            <Chip key={b} label={b === 'any' ? 'Any price' : b === 'free' ? 'Free' : b} active={price === b} onPress={() => setPrice(b)} />
          ))}
          <Chip label="Open late" active={lateOnly} onPress={() => setLateOnly(!lateOnly)} />
        </ScrollView>

        <View style={{ marginTop: space.lg }}>
          {shown.length > 0 ? (
            <StopsMap stops={shown.map((p) => ({ ...p, color: pinColor[p.category] }))} height={240} />
          ) : null}
          <Text style={styles.mapLabel}>{loading ? 'Loading…' : `${shown.length} places`}</Text>
        </View>

        <View style={{ marginTop: space.md }}>
          {shown.map((p) => (
            <View key={p.id}>
              <View style={styles.rowItem}>
                <View style={[styles.thumb, { backgroundColor: pinColor[p.category] }]}>
                  <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.meta}>
                    {[
                      p.distanceKm != null ? `${p.distanceKm < 10 ? p.distanceKm.toFixed(1) : Math.round(p.distanceKm)} km` : '',
                      p.subcategory ? p.subcategory[0].toUpperCase() + p.subcategory.slice(1) : label[p.category],
                      p.priceLevel ? '$'.repeat(p.priceLevel) : placeTier(p.estCad),
                      p.age19 ? '19+' : '',
                      p.address,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {p.whyGo ? <Text style={styles.whyGo}>{p.whyGo}</Text> : null}
                  {p.vibe?.length ? <Text style={styles.vibeTags}>{p.vibe.join(' · ')}</Text> : null}
                  {p.hours ? (
                    <Text style={styles.hours} numberOfLines={1}>
                      {p.hours}
                    </Text>
                  ) : null}
                  {p.late ? <Text style={styles.late}>● Open late</Text> : null}
                </View>
                <Button label="Add" icon="add" style={{ flex: 0, flexShrink: 0, minWidth: 68, paddingHorizontal: 12, paddingVertical: 8 }} />
              </View>
              <Divider />
            </View>
          ))}
          {!loading && shown.length === 0 ? <Text style={[styles.meta, { padding: space.lg }]}>No places match.</Text> : null}
        </View>

        {capped ? <Text style={styles.credit}>Showing the top {shown.length}. Pick a mood or search to narrow it down.</Text> : null}
        <Text style={styles.credit}>Place data © OpenStreetMap contributors. Hours may be out of date.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 16, fontFamily: fonts.bodyMedium },
  note: { color: colors.yellow, fontFamily: fonts.bodyMedium, fontSize: 12, paddingHorizontal: space.lg, marginTop: space.sm },
  row: { paddingHorizontal: space.lg, gap: space.md },
  mapLabel: {
    position: 'absolute',
    left: space.lg,
    top: space.md,
    backgroundColor: 'rgba(11,11,13,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    color: colors.textDim,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  thumb: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  whyGo: { color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  vibeTags: { color: colors.blue, fontFamily: fonts.bodyMedium, fontSize: 11 },
  hours: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11 },
  late: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
  credit: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11, padding: space.lg },
});
