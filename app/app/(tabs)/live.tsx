import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { GoLiveBurst } from '@/components/GoLiveBurst';
import { Avatar, Button, Display, Divider, Header, Meter, Screen, SectionTitle, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { JoinPolicy } from '@/data/mock';
import { useExperiences } from '@/lib/experiences';
import { formatElapsed, LogKind, useLive } from '@/lib/live';
import { useSocial } from '@/lib/social';

const quickLogs: { kind: LogKind; emoji: string; label: string }[] = [
  { kind: 'beer', emoji: '🍺', label: 'Beer' },
  { kind: 'cocktail', emoji: '🍸', label: 'Cocktail' },
  { kind: 'shot', emoji: '🥃', label: 'Shot' },
  { kind: 'wine', emoji: '🍷', label: 'Wine' },
  { kind: 'water', emoji: '💧', label: 'Water' },
  { kind: 'food', emoji: '🍟', label: 'Food' },
];

const policies: { label: string; value: JoinPolicy }[] = [
  { label: 'Friends', value: 'friends' },
  { label: 'Ask first', value: 'invite' },
  { label: 'Private', value: 'closed' },
];

const policyHint: Record<JoinPolicy, string> = {
  friends: 'Any friend can tap Join and show up.',
  invite: 'Friends can ask to join. You approve each one.',
  closed: 'Nobody can see or join this night.',
};

const emojiFor = (kind: LogKind) => (kind === 'moment' ? '📸' : quickLogs.find((q) => q.kind === kind)?.emoji ?? '•');

export default function Live() {
  const { session, start, burst, clearBurst } = useLive();
  const go = start;

  return (
    <Screen>
      {session ? <ActiveNight /> : <Idle go={go} />}
      {burst && session ? <GoLiveBurst mode={session.mode} onDone={clearBurst} /> : null}
    </Screen>
  );
}

function Idle({ go }: { go: (mode: 'freestyle' | 'experience', id?: string) => void }) {
  const experiences = useExperiences();
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <Header />
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm }}>
        <Text style={styles.kicker}>READY WHEN YOU ARE</Text>
        <Display>
          Start the{'\n'}
          <Text style={{ color: colors.primary }}>night.</Text>
        </Display>
      </View>

      <View style={{ paddingHorizontal: space.lg, marginTop: space.xl, gap: space.sm }}>
        <Pressable style={styles.goLive} onPress={() => go('freestyle')}>
          <Text style={styles.goEmoji}>⚡</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.goTitle}>Go live</Text>
            <Text style={styles.goSub}>No plan. Log drinks, snap moments, see where it goes.</Text>
          </View>
        </Pressable>
      </View>

      <SectionTitle title="Or follow a plan" />
      {experiences.map((e) => (
        <View key={e.id}>
          <Pressable style={styles.planRow} onPress={() => go('experience', e.id)}>
            <Text style={{ fontSize: 34 }}>{e.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>{e.title}</Text>
              <Text style={styles.meta}>
                {e.duration} · {e.stops} stops · {e.cost}
              </Text>
            </View>
            <Ionicons name="play-circle" size={30} color={colors.primary} />
          </Pressable>
          <Divider />
        </View>
      ))}
    </ScrollView>
  );
}

function ActiveNight() {
  const { session, add, end, nextStop, setJoinPolicy } = useLive();
  const { joinRequests, resolveJoinRequest } = useSocial();
  const experiences = useExperiences();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!session) return null;

  const exp = experiences.find((e) => e.id === session.experienceId);
  const stops = exp?.route ?? [];
  const drinks = session.log.filter((l) => ['beer', 'cocktail', 'shot', 'wine'].includes(l.kind)).length;
  const water = session.log.filter((l) => l.kind === 'water').length;
  const moments = session.log.filter((l) => l.kind === 'moment').length;
  const shareInvite = async () => {
    try {
      await Share.share({ message: 'Join my night on DrunkVA 🍹 drunkva://join/demo' });
    } catch {
      // Sharing is unavailable on some platforms; nothing to do.
    }
  };
  const needsWater = drinks >= 2 && water * 2 < drinks;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
      <Header />

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm }}>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Text style={styles.kicker}>{session.mode === 'experience' ? `LIVE · ${exp?.title.toUpperCase()}` : 'LIVE · FREESTYLE'}</Text>
        </View>
        <Display style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 58 }}>
          {formatElapsed(now - session.startedAt)}
        </Display>
      </View>

      {session.mode === 'experience' && exp ? (
        <View style={styles.stopBlock}>
          <Text style={styles.kicker}>
            STOP {session.stop + 1} OF {stops.length}
          </Text>
          <Text style={styles.stopName}>{stops[session.stop]}</Text>
          <Meter value={(session.stop + 1) / stops.length} />
          {session.stop < stops.length - 1 ? (
            <View style={styles.nextRow}>
              <Text style={styles.meta}>Up next: {stops[session.stop + 1]}</Text>
              <Button
                label="Next stop"
                icon="arrow-forward"
                onPress={() => nextStop(stops.length)}
                style={{ flex: 0, flexShrink: 0, minWidth: 120, paddingVertical: 8 }}
              />
            </View>
          ) : (
            <Text style={styles.meta}>Last stop. Make it a good one.</Text>
          )}
        </View>
      ) : (
        <Text style={styles.freestyle}>No plan. Just vibes. 🌀</Text>
      )}

      <View style={styles.stats}>
        <Stat value={drinks} label="drinks" />
        <Stat value={water} label="water" />
        <Stat value={moments} label="moments" />
      </View>
      <Divider />

      <SectionTitle title="Log it" />
      <View style={styles.grid}>
        {quickLogs.map((q) => (
          <Pressable key={q.kind} style={styles.logBtn} onPress={() => add(q.kind)}>
            <Text style={{ fontSize: 34 }}>{q.emoji}</Text>
            <Text style={styles.logLabel}>{q.label}</Text>
          </Pressable>
        ))}
      </View>

      {needsWater ? <Text style={styles.tip}>💧 Water break? Your future self will say thanks.</Text> : null}

      <View style={{ paddingHorizontal: space.lg, marginTop: space.lg }}>
        <Button label="Capture a moment" icon="camera" onPress={() => add('moment')} />
      </View>

      <SectionTitle title="Who can join" />
      <TextTabs
        items={policies.map((p) => p.label)}
        active={policies.find((p) => p.value === session.joinPolicy)!.label}
        onChange={(label) => setJoinPolicy(policies.find((p) => p.label === label)!.value)}
      />
      <Text style={[styles.meta, { paddingHorizontal: space.lg, marginTop: space.sm }]}>
        {policyHint[session.joinPolicy]}
      </Text>
      {session.joinPolicy !== 'closed' ? (
        <View style={{ paddingHorizontal: space.lg, marginTop: space.md }}>
          <Button label="Share invite link" icon="share-outline" variant="ghost" onPress={shareInvite} />
        </View>
      ) : null}
      {session.joinPolicy === 'invite' && joinRequests.length ? (
        <View style={{ marginTop: space.md }}>
          {joinRequests.map((r) => (
            <View key={r.id} style={styles.logRow}>
              <Avatar name={r.name} color={r.color} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.logName}>{r.name}</Text>
                <Text style={styles.meta}>wants to join your night</Text>
              </View>
              <Button label="Let in" onPress={() => resolveJoinRequest(r.id, true)} style={styles.small} />
              <Button label="No" variant="ghost" onPress={() => resolveJoinRequest(r.id, false)} style={styles.small} />
            </View>
          ))}
        </View>
      ) : null}

      <SectionTitle title="Tonight so far" />
      {session.log.length === 0 ? (
        <Text style={[styles.meta, { paddingHorizontal: space.lg }]}>Nothing yet. Log your first one above.</Text>
      ) : (
        session.log.map((l) => (
          <View key={l.id} style={styles.logRow}>
            <Text style={{ fontSize: 22 }}>{emojiFor(l.kind)}</Text>
            <Text style={styles.logName}>{l.kind === 'moment' ? 'Moment captured' : l.kind[0].toUpperCase() + l.kind.slice(1)}</Text>
            <Text style={styles.meta}>{formatElapsed(l.at - session.startedAt)}</Text>
          </View>
        ))
      )}

      <View style={{ paddingHorizontal: space.lg, marginTop: space.xl, gap: space.sm }}>
        <Button label="End night" icon="stop-circle" variant="ghost" onPress={end} />
        <Button label="Get a safe ride home" icon="car" variant="ghost" />
      </View>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.meta}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
  goLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.primary,
    padding: space.lg,
    borderRadius: 6,
  },
  goEmoji: { fontSize: 44 },
  goTitle: { color: '#0B0B0D', fontFamily: fonts.display, fontSize: 32, letterSpacing: -1 },
  goSub: { color: '#0B0B0D', fontFamily: fonts.bodyMedium, fontSize: 13 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  planTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pink },
  stopBlock: { padding: space.lg, gap: space.sm },
  stopName: { color: colors.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.8 },
  nextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm },
  freestyle: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 15, padding: space.lg },
  stats: { flexDirection: 'row', padding: space.lg },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 32, letterSpacing: -1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, rowGap: space.lg },
  logBtn: { width: '33.33%', alignItems: 'center', gap: 4, paddingVertical: space.sm },
  logLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 12 },
  tip: { color: colors.blue, fontFamily: fonts.bodyMedium, fontSize: 13, paddingHorizontal: space.lg, marginTop: space.md },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 8 },
  small: { flex: 0, flexShrink: 0, minWidth: 64, paddingHorizontal: 12, paddingVertical: 8 },
  logName: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
});
