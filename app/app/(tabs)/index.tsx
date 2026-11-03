import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Display, Header, Meter, Poster, Screen, SectionTitle, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { useExperiences } from '@/lib/experiences';
import { useLive } from '@/lib/live';

const categories = ['Tonight', 'Under $50', 'Date night', 'Hidden gems'];

export default function Discover() {
  const { start } = useLive();
  const experiences = useExperiences();
  const [active, setActive] = useState(categories[0]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header />

        <View style={styles.hero}>
          <Text style={styles.kicker}>FRIDAY · 10:42 PM</Text>
          <Display>
            What&apos;s the{'\n'}
            <Text style={{ color: colors.primary }}>move</Text> tonight?
          </Display>
        </View>

        <View style={styles.heat}>
          <View style={styles.dot} />
          <Text style={styles.heatText}>Gastown is lively right now</Text>
          <View style={{ flex: 1, marginLeft: space.md }}>
            <Meter value={0.87} />
          </View>
        </View>

        <View style={{ marginTop: space.xl }}>
          <TextTabs items={categories} active={active} onChange={setActive} />
        </View>

        {experiences.map((e) => (
          <View key={e.id} style={styles.item}>
            <Poster gradient={e.gradient} emoji={e.emoji} height={280}>
              <Text style={styles.badge}>{e.badge}</Text>
              <Text style={styles.title}>{e.title}</Text>
            </Poster>
            <View style={styles.info}>
              <Text style={styles.meta}>
                {e.duration} · {e.stops} stops · {e.cost} · <Text style={{ color: colors.yellow }}>★ {e.rating}</Text>
              </Text>
              <Text style={styles.route}>{e.route.join('  →  ')}</Text>
              <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
                <Button
                  label="Start"
                  icon="play"
                  onPress={() => {
                    start('experience', e.id);
                    router.navigate('/live');
                  }}
                />
                <Button label="Remix" icon="shuffle" variant="ghost" />
              </View>
            </View>
          </View>
        ))}

        <SectionTitle title="Not feeling these?" />
        <View style={{ paddingHorizontal: space.lg }}>
          <Button label="Build my night" icon="sparkles" />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  kicker: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  heat: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: space.lg, marginTop: space.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  heatText: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12 },
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
