import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExperienceCard } from '@/components/ExperienceCard';
import type { Experience } from '@/data/mock';
import { Chip, Display, Header, Screen, SectionTitle, TextTabs, VibeTile } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { useExperienceCities, useExperienceFeed } from '@/lib/experiences';
import { useNearMe } from '@/lib/location';
import { VIBES, vibeById, vibeImage } from '@/lib/vibes';

const NEAR = 'Near me';
const BEST = 'Best crawls';

// Drinking crawls, in the order they are offered. An experience belongs to the first type it carries.
const CRAWL_TYPES = [
  { tag: 'brewery', title: 'Brewery crawls', emoji: '🍻' },
  { tag: 'cocktails', title: 'Cocktail crawls', emoji: '🍸' },
  { tag: 'pubs', title: 'Pub crawls', emoji: '🍺' },
  { tag: 'bars', title: 'Bar crawls', emoji: '🪩' },
];

/** Best first within each type, then a top list that takes turns across types so breweries are not crowded out. */
function groupCrawls(list: Experience[]) {
  const groups = CRAWL_TYPES.map((t) => ({ ...t, items: [] as Experience[] }));
  for (const e of list) groups.find((g) => e.tags?.includes(g.tag))?.items.push(e);
  const top: Experience[] = [];
  for (let i = 0; top.length < 10 && groups.some((g) => i < g.items.length); i++) {
    for (const g of groups) if (g.items[i] && top.length < 10) top.push(g.items[i]);
  }
  return { top, groups: groups.filter((g) => g.items.length > 0) };
}

export default function Discover() {
  const cities = useExperienceCities();
  // Opens on Near me. If location is off, it falls back to the first city and says why.
  const [choice, setChoice] = useState<string | null>(NEAR);
  const [locating, setLocating] = useState(true);
  const { near, note, request } = useNearMe();
  const [vibeId, setVibeId] = useState<string | null>(null);
  const [maxCost, setMaxCost] = useState<number | undefined>();
  const [student, setStudent] = useState(false);
  const [allAges, setAllAges] = useState(false);
  // Day and time shown in the hero, read once when the screen opens.
  const [now] = useState(() => new Date());

  useEffect(() => {
    let live = true;
    request().then((ok) => {
      if (!live) return;
      if (!ok) setChoice(null);
      setLocating(false);
    });
    return () => {
      live = false;
    };
  }, [request]);

  const isBest = choice === BEST;
  const city = choice && choice !== NEAR && choice !== BEST ? choice : cities[0];
  const required = [student ? 'student' : '', allAges ? 'all-ages' : ''].filter(Boolean);
  const place = { ...(choice === NEAR ? { near } : { city }), maxCost, required };
  const vibe = vibeId ? vibeById(vibeId) : undefined;

  const waiting = choice === NEAR && !near; // Near me chosen but the position has not arrived yet
  const base = useExperienceFeed({ ...place, skip: isBest || waiting });
  const picked = useExperienceFeed({ ...place, tags: vibe?.tags, skip: !vibe || isBest || waiting });
  const bestFeed = useExperienceFeed({ best: true, tags: ['crawl'], maxCost, required, skip: !isBest });
  const crawls = useMemo(() => groupCrawls(bestFeed.experiences), [bestFeed.experiences]);
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
    if (value === BEST) {
      setChoice(BEST);
    } else if (value !== NEAR) {
      setChoice(value);
    } else if (await request()) {
      setChoice(NEAR);
    }
  };

  const where = choice === NEAR ? 'near you' : `in ${city}`;
  const loading = locating || base.loading || (!!vibe && picked.loading) || (isBest && bestFeed.loading);
  const status = isBest
    ? bestFeed.loading
      ? 'Loading…'
      : `Top-scored crawls across Metro Vancouver. Ranked by how walkable, open and well-rated their stops are.`
    : note ?? (locating ? 'Finding you…' : loading ? 'Loading…' : vibe ? `${picked.experiences.length} ${vibe.label.toLowerCase()} nights ${where}` : `${all.length} nights ${where}`);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
        <Header place={isBest ? 'Metro Vancouver' : choice === NEAR ? 'Near you' : city} />

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
            <TextTabs glow items={[NEAR, BEST, ...cities]} active={choice === NEAR || isBest ? choice : city} onChange={pick} />
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {[undefined, 30, 50, 80].map((c) => (
              <Chip key={c ?? 'any'} label={c ? 'Under $' + c : 'Any price'} active={maxCost === c} onPress={() => setMaxCost(c)} />
            ))}
            <Chip label="Student" active={student} onPress={() => setStudent(!student)} />
            <Chip label="All ages" active={allAges} onPress={() => setAllAges(!allAges)} />
          </ScrollView>
        </View>

        <Text style={styles.status}>{status}</Text>

        {!isBest && moods.length > 0 ? (
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

        {isBest ? (
          <>
            {crawls.top.length > 0 ? (
              <>
                <SectionTitle title="Best of the best" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {crawls.top.map((e) => (
                    <ExperienceCard key={e.id} e={e} />
                  ))}
                </ScrollView>
              </>
            ) : null}
            {crawls.groups.map((g) => (
              <View key={g.tag}>
                <SectionTitle title={`${g.emoji} ${g.title}`} right={`${g.items.length}`} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                  {g.items.slice(0, 8).map((e) => (
                    <ExperienceCard key={e.id} e={e} />
                  ))}
                </ScrollView>
              </View>
            ))}
            {!bestFeed.loading && crawls.groups.length === 0 ? (
              <Text style={styles.status}>No crawls match these filters yet. Load the generated experiences in Supabase to see them.</Text>
            ) : null}
          </>
        ) : vibe ? (
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
  filters: { paddingHorizontal: space.lg, gap: space.sm, paddingVertical: space.sm },
});
