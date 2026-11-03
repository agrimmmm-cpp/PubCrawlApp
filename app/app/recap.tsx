import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Display, Divider, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useExperience } from '@/lib/experiences';
import { formatElapsed, LogKind, useLive } from '@/lib/live';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const EMOJI: Record<LogKind, string> = {
  beer: '🍺', cocktail: '🍸', shot: '🥃', wine: '🍷', water: '💧', food: '🍟', moment: '📸',
};
const NAME: Record<LogKind, string> = {
  beer: 'Beer', cocktail: 'Cocktail', shot: 'Shot', wine: 'Wine', water: 'Water', food: 'Food', moment: 'Moment',
};

const duration = (ms: number) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export default function Recap() {
  const { finished, dismissFinished } = useLive();
  const { session } = useAuth();
  const { experience } = useExperience(finished?.experienceId);
  // place id -> 1 (thumbs up) or -1 (thumbs down)
  const [ratings, setRatings] = useState<Record<string, 1 | -1>>({});

  const done = () => {
    dismissFinished();
    router.navigate('/profile');
  };

  if (!finished) {
    return (
      <Screen>
        <Text style={[styles.dim, { padding: space.lg }]} onPress={() => router.navigate('/')}>
          No night to recap. Tap to go back.
        </Text>
      </Screen>
    );
  }

  const count = (kinds: LogKind[]) => finished.log.filter((l) => kinds.includes(l.kind)).length;
  const visited = (experience?.stopPlaces ?? []).slice(0, finished.stop + 1);
  const timeline = [...finished.log].reverse();

  const rate = (placeId: string, value: 1 | -1) => {
    if (ratings[placeId] === value) return;
    setRatings((r) => ({ ...r, [placeId]: value }));
    if (supabaseConfigured && session && finished.id && !placeId.startsWith('m') /* offline sample places have ids like m1; real ones are UUIDs */) {
      supabase
        .from('stop_ratings')
        .upsert(
          { session_id: finished.id, user_id: session.user.id, place_id: placeId, rating: value },
          { onConflict: 'session_id,user_id,place_id' },
        )
        .then();
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: space.lg, gap: space.sm }}>
          <Text style={styles.kicker}>NIGHT COMPLETE</Text>
          <Display>{experience ? experience.title : 'Your freestyle night'}</Display>
          <Text style={styles.dim}>
            {duration(finished.endedAt - finished.startedAt)}
            {experience ? ` · ${visited.length} of ${experience.stops} stops` : ''}
          </Text>
        </View>

        <View style={styles.stats}>
          <Stat value={count(['beer', 'cocktail', 'shot', 'wine'])} label="drinks" />
          <Stat value={count(['water'])} label="water" />
          <Stat value={count(['food'])} label="food" />
          <Stat value={count(['moment'])} label="moments" />
        </View>
        <Divider />

        {visited.length > 0 ? (
          <>
            <SectionTitle title="How were the stops?" />
            {visited.map((p, i) => (
              <View key={p.id}>
                <View style={styles.row}>
                  <Text style={styles.num}>{i + 1}</Text>
                  <Text style={styles.stopName}>
                    {p.emoji} {p.name}
                  </Text>
                  <Text style={[styles.thumb, ratings[p.id] === 1 && styles.on]} onPress={() => rate(p.id, 1)}>
                    👍
                  </Text>
                  <Text style={[styles.thumb, ratings[p.id] === -1 && styles.on]} onPress={() => rate(p.id, -1)}>
                    👎
                  </Text>
                </View>
                <Divider />
              </View>
            ))}
            <Text style={styles.note}>Ratings help rank places for everyone. Nobody sees who rated what.</Text>
          </>
        ) : null}

        <SectionTitle title="Your night" right={`${timeline.length} entries`} />
        {timeline.length === 0 ? (
          <Text style={[styles.dim, { paddingHorizontal: space.lg }]}>You didn&apos;t log anything. That&apos;s fine too.</Text>
        ) : (
          timeline.map((l) => (
            <View key={l.id} style={styles.row}>
              <Text style={{ fontSize: 22 }}>{EMOJI[l.kind]}</Text>
              <Text style={styles.stopName}>{NAME[l.kind]}</Text>
              <Text style={styles.dim}>{formatElapsed(l.at - finished.startedAt)}</Text>
            </View>
          ))
        )}

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <Button label="Done" icon="checkmark" onPress={done} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.dim}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  dim: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
  stats: { flexDirection: 'row', padding: space.lg },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 30, letterSpacing: -1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  num: { color: colors.primary, fontFamily: fonts.display, fontSize: 16, width: 18 },
  stopName: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  thumb: { fontSize: 26, opacity: 0.35 },
  on: { opacity: 1 },
  note: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11, paddingHorizontal: space.lg, marginTop: space.sm },
});
