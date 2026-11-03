import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Display, Divider, Header, Screen, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { places } from '@/data/mock';

const categories = ['Bars', 'Food', 'Late', 'Arcade', 'Hidden'];

export default function Explore() {
  const [active, setActive] = useState('Bars');

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header />

        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
          <Display style={{ fontSize: 34, lineHeight: 36 }}>
            Find your <Text style={{ color: colors.pink }}>vibe</Text>
          </Display>
          <View style={styles.vibe}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <TextInput
              placeholder="loud but not a club…"
              placeholderTextColor={colors.textFaint}
              style={styles.vibeInput}
            />
          </View>
        </View>

        {/* Map placeholder: swap for react-native-maps once place data is live. */}
        <View style={styles.map}>
          {[
            { top: 40, left: 90, c: colors.primary },
            { top: 90, left: 220, c: colors.blue },
            { top: 120, left: 50, c: colors.yellow },
            { top: 60, left: 290, c: colors.pink },
          ].map((p, i) => (
            <View key={i} style={[styles.pin, { top: p.top, left: p.left, backgroundColor: p.c }]} />
          ))}
          <Text style={styles.mapLabel}>42 venues nearby</Text>
        </View>

        <View style={{ marginTop: space.lg }}>
          <TextTabs items={categories} active={active} onChange={setActive} />
        </View>

        <View style={{ marginTop: space.md }}>
          {places.map((p) => (
            <View key={p.id}>
              <View style={styles.row}>
                <View style={[styles.thumb, { backgroundColor: p.gradient[1] }]}>
                  <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.meta}>{p.meta}</Text>
                  <Text style={styles.note}>{p.note}</Text>
                  <Text style={styles.crowd}>
                    <Text style={{ color: p.capacity > 80 ? colors.primary : colors.green }}>● </Text>
                    {p.capacity > 80 ? 'Packed' : p.capacity > 60 ? 'Lively' : 'Chill'} · {p.walk}
                  </Text>
                </View>
                <Button label="Add" icon="add" style={{ flex: 0, flexShrink: 0, minWidth: 68, paddingHorizontal: 12, paddingVertical: 8 }} />
              </View>
              <Divider />
            </View>
          ))}
        </View>
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
  map: { height: 180, marginTop: space.lg, backgroundColor: colors.surface },
  pin: { position: 'absolute', width: 14, height: 14, borderRadius: 7 },
  mapLabel: { position: 'absolute', left: space.lg, bottom: space.md, color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  thumb: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  note: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 12 },
  crowd: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
});
