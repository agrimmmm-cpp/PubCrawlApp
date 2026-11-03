import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExperienceCard } from '@/components/ExperienceCard';
import { Display, Header, Screen, SectionTitle, TextTabs, VibeTile } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { useExperienceCities, useExperienceFeed } from '@/lib/experiences';
import { useNearMe } from '@/lib/location';
import { VIBES, vibeById, vibeImage } from '@/lib/vibes';

const NEAR = 'Near me';

export default function Discover() {
  const cities = useExperienceCities();
  const [choice, setChoice] = useState<string | null>(null);
  const { near, note, request } = useNearMe();
  const [vibeId, setVibeId] = useState<string | null>(null);
  // Day and time shown in the hero, read once when the screen opens.
  const [now] = useState(() => new Date());

  const city = choice && choice !== NEAR ? choice : cities[0];
  const place = choice === NEAR ? { near } : { city };
  const vibe = vibeId ? vibeById(vibeId) : undefined;

  const base = useExperienceFeed(place);
  const picked = useExperienceFeed({ ...place, tags: vibe?.tags, skip: !vibe });
  const all = base.experiences;

  // Only offer moods that have at least one experience here.
  const moods = useMemo(() => VIBES.filter((v) => all.some((e) => e.tags?.some((t) => v.tags.includes(t)))), [all]);
  const sections = useMemo(
    () =>
      moods
        .map((v) => ({ v, items: all.filter((e) => e.tags?.some((t) => v.tags.includes(t))) }))
        .filter((s) => s.items.length > 0),
    [moods, all],
  );

  const pick = async (value: string) => {
    setVibeId(null);
    if (value !== NEAR) {
      setChoice(value);
    } else if (await request()) {
      setChoice(NEAR);
    }
  };

  const where = choice === NEAR ? 'near you' : `in ${city}`;
  const loading = base.loading || (!!vibe && picked.loading);
  const status = note ?? (loading ? 'Loading…' : vibe ? `${picked.experiences.length} ${vibe.label.toLowerCase()} nights ${where}` : `${all.length} nights ${where}`);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
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

        {/* Sticky: stays on screen while you scroll. */}
        <View style={styles.sticky}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TextTabs glow items={[NEAR, ...cities]} active={choice === NEAR ? NEAR : city} onChange={pick} />
          </ScrollView>
        </View>

        <Text style={styles.status}>{status}</Text>

        {moods.length > 0 ? (
          <>
            <SectionTitle title="What's the mood?" right={vibe ? 'Tap again to clear' : undefined} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {moods.map((v) => (
                <VibeTile
                  key={v.id}
                  label={v.label}
                  emoji={v.emoji}
                  gradient={v.gradient}
                  image={vibeImage(v.id)}
                  active={vibeId === v.id}
                  onPress={() => setVibeId(vibeId === v.id ? null : v.id)}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        {vibe ? (
          <View style={{ marginTop: space.lg, gap: space.xl }}>
            {picked.experiences.map((e) => (
              <ExperienceCard key={e.id} e={e} variant="wide" />
            ))}
            {!picked.loading && picked.experiences.length === 0 ? (
              <Text style={styles.status}>No {vibe.label.toLowerCase()} nights here yet.</Text>
            ) : null}
          </View>
        ) : (
          <>
            {all.length > 0 ? (
              <>
                <SectionTitle title="Top picks" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {all.slice(0, 8).map((e) => (
                    <ExperienceCard key={e.id} e={e} />
                  ))}
                </ScrollView>
              </>
            ) : null}
            {sections.map(({ v, items }) => (
              <View key={v.id}>
                <SectionTitle title={`${v.emoji} ${v.label}`} right={`${items.length}`} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {items.slice(0, 8).map((e) => (
                    <ExperienceCard key={e.id} e={e} />
                  ))}
                </ScrollView>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm, marginBottom: space.lg },
  kicker: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  sticky: { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.line },
  status: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12, paddingHorizontal: space.lg, marginTop: space.md },
  row: { paddingHorizontal: space.lg, gap: space.md },
});
