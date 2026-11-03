import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Display, Header, Poster, Screen, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { Near, useExperienceCities, useExperienceFeed } from '@/lib/experiences';
import { useLive } from '@/lib/live';

const NEAR = 'Near me';

export default function Discover() {
  const { start } = useLive();
  const cities = useExperienceCities();
  const [choice, setChoice] = useState<string | null>(null);
  const [near, setNear] = useState<Near | undefined>();
  const [note, setNote] = useState<string | null>(null);
  // Day and time shown in the hero, read once when the screen opens.
  const [now] = useState(() => new Date());

  const city = choice && choice !== NEAR ? choice : cities[0];
  const { experiences, loading } = useExperienceFeed(choice === NEAR ? { near } : { city });

  const pick = async (value: string) => {
    setNote(null);
    if (value !== NEAR) {
      setChoice(value);
      return;
    }
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        setNote('Location is off, so pick a city instead. You can turn it on in Settings.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setChoice(NEAR);
    } catch {
      setNote("Couldn't get your location. Pick a city instead.");
    }
  };

  const status =
    choice === NEAR
      ? loading
        ? 'Finding experiences near you…'
        : experiences.length
          ? 'Closest to you first'
          : 'Nothing close by yet. Try a city.'
      : loading
        ? `Loading ${city}…`
        : `${experiences.length} in ${city}`;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header place={choice === NEAR ? 'Near you' : city} />

        <View style={styles.hero}>
          <Text style={styles.kicker}>
            {now.toLocaleDateString('en-CA', { weekday: 'long' }).toUpperCase()} ·{' '}
            {now.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' }).replace(/\./g, '').toUpperCase()}
          </Text>
          <Display>
            What&apos;s the{'\n'}
            <Text style={{ color: colors.primary }}>move</Text> tonight?
          </Display>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.xl }}>
          <TextTabs items={[NEAR, ...cities]} active={choice === NEAR ? NEAR : city} onChange={pick} />
        </ScrollView>
        <Text style={styles.status}>{note ?? status}</Text>

        {experiences.map((e) => (
          <View key={e.id} style={styles.item}>
            <Pressable onPress={() => router.push({ pathname: '/experience/[id]', params: { id: e.id } })}>
              <Poster gradient={e.gradient} emoji={e.emoji} height={280}>
                <Text style={styles.badge}>{e.badge}</Text>
                <Text style={styles.title}>{e.title}</Text>
              </Poster>
            </Pressable>
            <View style={styles.info}>
              <Text style={styles.meta}>
                {[
                  e.distanceKm != null ? `${e.distanceKm < 10 ? e.distanceKm.toFixed(1) : Math.round(e.distanceKm)} km away` : '',
                  e.duration,
                  `${e.stops} stops`,
                  e.cost,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                {e.rating > 0 ? <Text style={{ color: colors.yellow }}> · ★ {e.rating}</Text> : null}
              </Text>
              <Text style={styles.route}>{e.route.join('  →  ')}</Text>
              <View style={{ flexDirection: 'row', marginTop: space.md }}>
                <Button
                  label="Start"
                  icon="play"
                  onPress={() => {
                    start('experience', e.id);
                    router.navigate('/live');
                  }}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  kicker: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  status: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12, paddingHorizontal: space.lg, marginTop: space.sm },
  item: { marginTop: space.xl },
  badge: {
    position: 'absolute',
    top: space.lg,
    left: space.lg,
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
    left: space.lg,
    bottom: space.lg,
    right: space.lg,
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 36,
    letterSpacing: -1,
  },
  info: { padding: space.lg, gap: 6 },
  meta: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  route: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
});
