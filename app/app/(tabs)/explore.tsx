import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { StopsMap } from '@/components/StopsMap';
import { Button, Display, Divider, Header, Screen, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { Place, PlaceCategory } from '@/data/mock';
import { usePlaces } from '@/lib/places';

const filters: Record<string, (p: Place) => boolean> = {
  All: () => true,
  Bars: (p) => p.category === 'bar' || p.category === 'nightclub',
  Food: (p) => p.category === 'food',
  Late: (p) => p.late,
  Games: (p) => p.category === 'activity',
};

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
  const places = usePlaces();
  const [active, setActive] = useState('All');
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    return places.filter((p) => filters[active](p) && (!query || p.name.toLowerCase().includes(query)));
  }, [places, active, q]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header />

        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
          <Display style={{ fontSize: 34, lineHeight: 36 }}>
            Find your <Text style={{ color: colors.pink }}>vibe</Text>
          </Display>
          <View style={styles.vibe}>
            <Ionicons name="search" size={16} color={colors.primary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search places…"
              placeholderTextColor={colors.textFaint}
              style={styles.vibeInput}
            />
          </View>
        </View>

        <View style={{ marginTop: space.lg }}>
          {shown.length > 0 ? (
            <StopsMap stops={shown.map((p) => ({ ...p, color: pinColor[p.category] }))} height={240} />
          ) : null}
          <Text style={styles.mapLabel}>{shown.length} places</Text>
        </View>

        <View style={{ marginTop: space.lg }}>
          <TextTabs items={Object.keys(filters)} active={active} onChange={setActive} />
        </View>

        <View style={{ marginTop: space.md }}>
          {shown.map((p) => (
            <View key={p.id}>
              <View style={styles.row}>
                <View style={[styles.thumb, { backgroundColor: pinColor[p.category] }]}>
                  <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.meta}>
                    {label[p.category]}
                    {p.address ? ` · ${p.address}` : ''}
                  </Text>
                  {p.hours ? (
                    <Text style={styles.note} numberOfLines={1}>
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
          {shown.length === 0 ? <Text style={[styles.meta, { padding: space.lg }]}>No places match.</Text> : null}
        </View>

        <Text style={styles.credit}>Place data © OpenStreetMap contributors. Hours may be out of date.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  vibe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  vibeInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 16, fontFamily: fonts.bodyMedium },
  mapLabel: { position: 'absolute', left: space.lg, top: space.md, backgroundColor: 'rgba(11,11,13,0.7)', paddingHorizontal: 8, paddingVertical: 3, color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  thumb: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  note: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11 },
  late: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
  credit: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11, padding: space.lg },
});
