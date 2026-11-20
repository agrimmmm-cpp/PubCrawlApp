import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { NightCard } from '@/components/NightCard';
import { StopsMap } from '@/components/StopsMap';
import { Button, Display, Divider, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { LEVEL_POINTS, nightTitle } from '@/data/quests';
import { drinkMeta } from '@/data/drinks';
import { useAuth } from '@/lib/auth';
import { useExperience } from '@/lib/experiences';
import { formatElapsed, LogKind, useLive } from '@/lib/live';
import { useQuests } from '@/lib/quests';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const NAME: Record<LogKind, string> = {
  beer: 'Beer', cocktail: 'Cocktail', shot: 'Shot', wine: 'Wine', water: 'Water', food: 'Food', moment: 'Moment',
};
const TALLY: Exclude<LogKind, 'moment' | 'food'>[] = ['beer', 'cocktail', 'wine', 'shot', 'water'];

const duration = (ms: number) => {
  const mins = Math.max(1, Math.round(ms / 60000));
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};

export default function Recap() {
  const { finished, dismissFinished } = useLive();
  const { session } = useAuth();
  const { experience } = useExperience(finished?.experienceId);
  const quests = useQuests();
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);
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

  const count = (kind: LogKind) => finished.log.filter((l) => l.kind === kind).length;
  const drinks = ['beer', 'cocktail', 'shot', 'wine'].reduce((n, k) => n + count(k as LogKind), 0);
  const water = count('water');
  const moments = finished.log.filter((l) => l.kind === 'moment' && l.uri);
  const priced = finished.log.filter((l) => l.price !== undefined);
  const spent = priced.reduce((n, l) => n + (l.price ?? 0), 0);
  const rated = finished.log.filter((l) => l.rating && l.item && l.kind !== 'moment' && l.kind !== 'water');
  const topPour = rated.length ? rated.reduce((a, b) => ((b.rating ?? 0) > (a.rating ?? 0) ? b : a)) : undefined;
  const chaos = quests.results.filter((r) => r.status === 'done').reduce((n, r) => n + LEVEL_POINTS[r.quest.level], 0);
  const questsDone = quests.results.filter((r) => r.status === 'done').length;
  const visited = (experience?.stopPlaces ?? []).slice(0, finished.stop + 1);
  const timeline = [...finished.log].reverse();
  const title = experience ? experience.title : 'Freestyle night';

  // Food, grouped: "Poutine" twice becomes one row with a count.
  const food = Object.entries(
    finished.log
      .filter((l) => l.kind === 'food')
      .reduce<Record<string, number>>((m, l) => ({ ...m, [l.item ?? 'Something to eat']: (m[l.item ?? 'Something to eat'] ?? 0) + 1 }), {}),
  );

  const card = {
    title,
    date: new Date(finished.startedAt).toLocaleDateString('en-CA', { weekday: 'short', day: 'numeric', month: 'short' }),
    duration: duration(finished.endedAt - finished.startedAt),
    stops: experience ? `${visited.length}/${experience.stops}` : '—',
    chaos,
    moments: moments.length,
    rank: nightTitle(chaos),
    balanced: drinks > 0 && water * 2 >= drinks,
  };

  const shareCard = async () => {
    setSharing(true);
    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your night' });
      } else {
        await Share.share({ message: `${title}: ${card.duration} out, ${card.stops} stops, ${chaos} chaos points. #DrunkVA` });
      }
    } catch {
      // Sharing was cancelled or is not available; nothing to do.
    } finally {
      setSharing(false);
    }
  };

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
        <View style={{ padding: space.lg, gap: space.xs }}>
          <Text style={styles.kicker}>NIGHT COMPLETE</Text>
          <Display>
            The morning{'\n'}
            <Text style={{ color: colors.primary }}>after.</Text>
          </Display>
          <Text style={styles.dim}>Your night, in one card. Check your stats before you hydrate.</Text>
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          <NightCard cardRef={cardRef} data={card} />
          <View style={{ marginTop: space.lg }}>
            <Button label={sharing ? 'Preparing…' : 'Share your night'} icon="share-outline" onPress={shareCard} />
          </View>
        </View>

        {/* The tally: private, and only what was logged. It is not scored. */}
        {drinks + water > 0 ? (
          <>
            <SectionTitle title="The tally" right="Only you see this" />
            <View style={styles.tiles}>
              {TALLY.filter((k) => count(k) > 0).map((k) => {
                const m = drinkMeta(k);
                return (
                  <View key={k} style={styles.tile}>
                    <MaterialCommunityIcons name={m.icon} size={26} color={m.color} />
                    <Text style={styles.tileNum}>{count(k)}</Text>
                    <Text style={styles.tileLabel}>{m.label}</Text>
                  </View>
                );
              })}
            </View>
            {priced.length > 0 ? <Text style={[styles.dim, { paddingHorizontal: space.lg, marginTop: space.sm }]}>💸 ${spent % 1 === 0 ? spent : spent.toFixed(2)} across {priced.length} priced {priced.length === 1 ? 'item' : 'items'} (logged prices only)</Text> : null}
          </>
        ) : null}

        {topPour ? (
          <View style={styles.top}>
            <Text style={styles.kicker}>TOP OF THE NIGHT</Text>
            <Text style={styles.topName}>{topPour.item}</Text>
            <Text style={styles.dim}>
              {'★'.repeat(topPour.rating ?? 0)}
              {topPour.note ? `  ${topPour.note}` : ''}
            </Text>
          </View>
        ) : null}

        {food.length > 0 ? (
          <>
            <SectionTitle title="What you ate" />
            {food.map(([name, n]) => (
              <View key={name} style={styles.foodRow}>
                <MaterialCommunityIcons name="food" size={20} color={colors.green} />
                <Text style={styles.foodName}>{name}</Text>
                <Text style={styles.foodCount}>{n > 1 ? `× ${n}` : ''}</Text>
              </View>
            ))}
          </>
        ) : null}

        {visited.length > 0 ? (
          <>
            <SectionTitle title="Crawl path" right={`${visited.length} stops`} />
            <StopsMap route stops={visited} height={200} />
          </>
        ) : null}

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

        {moments.length > 0 ? (
          <>
            <SectionTitle title="Moments" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
              {[...moments].reverse().map((l) => (
                <View key={l.id} style={styles.moment}>
                  {l.mediaType === 'video' ? <Text style={styles.videoTag}>🎥</Text> : <Image source={{ uri: l.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
                  {l.questId ? <Text style={styles.questTag}>🎯</Text> : null}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {quests.results.length > 0 ? (
          <>
            <SectionTitle title="Side quests" right={`${questsDone} of ${quests.results.length}`} />
            {[...quests.results].reverse().map((r) => (
              <View key={`${r.quest.id}-${r.at}`} style={styles.row}>
                <Text style={{ fontSize: 20 }}>{r.status === 'done' ? '✅' : '➖'}</Text>
                <Text style={[styles.stopName, r.status !== 'done' && { color: colors.textFaint }]}>{r.quest.text}</Text>
              </View>
            ))}
          </>
        ) : null}

        <SectionTitle title="Your night" right={`${timeline.length} entries`} />
        {timeline.length === 0 ? (
          <Text style={[styles.dim, { paddingHorizontal: space.lg }]}>You didn&apos;t log anything. That&apos;s fine too.</Text>
        ) : (
          timeline.map((l) => {
            const m = l.kind === 'moment' ? null : drinkMeta(l.kind);
            return (
              <View key={l.id} style={styles.row}>
                {m ? <MaterialCommunityIcons name={m.icon} size={22} color={m.color} /> : <MaterialCommunityIcons name="camera" size={22} color={colors.pink} />}
                <Text style={styles.stopName}>
                  {l.item ?? NAME[l.kind]}
                  {l.item ? <Text style={styles.dim}>{`  ${NAME[l.kind]}`}</Text> : null}
                </Text>
                <Text style={styles.dim}>{formatElapsed(l.at - finished.startedAt)}</Text>
              </View>
            );
          })
        )}

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <Button label="Done" icon="checkmark" onPress={done} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  dim: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg },
  tile: { flexGrow: 1, minWidth: 88, alignItems: 'center', gap: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.surface },
  tileNum: { color: colors.text, fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.8 },
  tileLabel: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 11 },
  top: { marginHorizontal: space.lg, marginTop: space.lg, padding: space.lg, borderRadius: 14, backgroundColor: colors.surface, gap: 3 },
  topName: { color: colors.text, fontFamily: fonts.display, fontSize: 26, letterSpacing: -0.8 },
  foodRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginBottom: 6, paddingVertical: 12, paddingHorizontal: space.md, borderRadius: 12, backgroundColor: colors.surface },
  foodName: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  foodCount: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  num: { color: colors.primary, fontFamily: fonts.display, fontSize: 16, width: 18 },
  stopName: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  thumb: { fontSize: 26, opacity: 0.35 },
  on: { opacity: 1 },
  moment: { width: 120, height: 120, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  videoTag: { fontSize: 32 },
  questTag: { position: 'absolute', left: 6, top: 4, fontSize: 16 },
  note: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11, paddingHorizontal: space.lg, marginTop: space.sm },
});
