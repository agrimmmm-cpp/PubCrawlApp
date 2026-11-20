import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Header, Meter, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import credits from '@/assets/vibes/credits.json';
import { useIsAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { BADGES, tierFor, usePassport } from '@/lib/passport';

const TILT = [-5, 4, -3, 5, -4, 3];

export default function Profile() {
  const { configured, session, signOut } = useAuth();
  const passport = usePassport();
  const isAdmin = useIsAdmin();
  const tier = tierFor(passport.nights);
  const name = session?.user.email?.split('@')[0] ?? 'you';
  const stats = [
    { label: 'nights', value: passport.nights },
    { label: 'places', value: passport.places },
    { label: 'cities', value: passport.cities },
    { label: 'moments', value: passport.moments },
  ];
  const earned = BADGES.filter((b) => b.earned(passport));
  // The closest stamp you do not have yet.
  const nextUp = BADGES.filter((b) => !b.earned(passport)).sort((a, b) => b.value(passport) / b.goal - a.value(passport) / a.goal)[0];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header title="passport" />

        {/* The passport itself: one tall card with the name, the tier and how far to the next. */}
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
          <LinearGradient colors={['#2B0D4D', '#8A2A0A', '#FF5C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover}>
            <View style={styles.coverTop}>
              <Text style={styles.coverKicker}>DRUNKVA PASSPORT</Text>
              <Text style={styles.coverKicker}>VANCOUVER</Text>
            </View>
            <View style={styles.seal}>
              <Text style={styles.sealText}>{earned.length}</Text>
              <Text style={styles.sealSub}>STAMPS</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={styles.handle}>@{name}</Text>
              <Text style={styles.tier}>{tier.name}</Text>
              <View style={{ marginTop: space.md, gap: 6 }}>
                <Meter value={tier.progress} color="#fff" />
                <Text style={styles.coverNext}>{tier.next ? `Next rank: ${tier.next}` : 'Top rank reached'}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.stats}>
          {stats.map((s, i) => (
            <View key={s.label} style={[styles.stat, i > 0 && styles.statLine]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {nextUp ? (
          <View style={styles.nextUp}>
            <Text style={styles.nextEmoji}>{nextUp.emoji}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.nextTitle}>Next stamp: {nextUp.label}</Text>
              <Meter value={Math.min(1, nextUp.value(passport) / nextUp.goal)} color={colors.primary} />
              <Text style={styles.statLabel}>
                {nextUp.value(passport)} of {nextUp.goal} · {nextUp.need}
              </Text>
            </View>
          </View>
        ) : null}

        <SectionTitle title="Stamps" right={`${earned.length} of ${BADGES.length}`} />
        <View style={styles.stamps}>
          {BADGES.map((b, i) => {
            const got = b.earned(passport);
            return (
              <View key={b.id} style={styles.stampCell}>
                <View style={[styles.stamp, got ? styles.stampOn : styles.stampOff, got && { transform: [{ rotate: `${TILT[i % TILT.length]}deg` }] }]}>
                  <Text style={[styles.stampEmoji, !got && { opacity: 0.25 }]}>{b.emoji}</Text>
                </View>
                <Text style={[styles.stampLabel, !got && { color: colors.textFaint }]}>{b.label}</Text>
                <Text style={styles.stampNeed}>{got ? 'Earned' : `${Math.min(b.value(passport), b.goal)}/${b.goal}`}</Text>
              </View>
            );
          })}
        </View>

        <Text style={[styles.note, { marginTop: space.xl }]}>
          Your journal is private. Only you see it, and nothing here is ranked. Pace Insight is an estimate and never a measure of whether you are safe to drive.
        </Text>

        {credits.length > 0 ? (
          <Text style={[styles.note, { marginTop: space.lg }]}>
            Photos by {[...new Set(credits.map((c) => c.photographer))].length} photographers on {[...new Set(credits.map((c) => c.source))].join(' and ')}.
            Stock photos show a mood, never a specific venue. Place data © OpenStreetMap contributors.
          </Text>
        ) : null}

        {isAdmin ? (
          <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
            <Button label="Admin tools" icon="construct" onPress={() => router.push('/admin')} />
          </View>
        ) : null}

        {configured && session ? (
          <View style={{ paddingHorizontal: space.lg, marginTop: space.xl, gap: space.sm }}>
            <Text style={[styles.note, { paddingHorizontal: 0 }]}>Signed in as {session.user.email}</Text>
            <Button label="Sign out" variant="ghost" onPress={signOut} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cover: { borderRadius: 22, padding: space.lg, minHeight: 300, justifyContent: 'space-between', overflow: 'hidden' },
  coverTop: { flexDirection: 'row', justifyContent: 'space-between' },
  coverKicker: { color: 'rgba(255,255,255,0.75)', fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 2 },
  seal: { position: 'absolute', right: space.lg, top: 64, width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-10deg' }] },
  sealText: { color: '#fff', fontFamily: fonts.display, fontSize: 34, letterSpacing: -1, lineHeight: 36 },
  sealSub: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.5 },
  handle: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.bodyBold, fontSize: 14 },
  tier: { color: '#fff', fontFamily: fonts.display, fontSize: 46, lineHeight: 48, letterSpacing: -2 },
  coverNext: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.bodyMedium, fontSize: 12 },
  stats: { flexDirection: 'row', paddingHorizontal: space.lg, paddingVertical: space.xl },
  stat: { flex: 1, paddingLeft: space.md },
  statLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 30, letterSpacing: -1 },
  statLabel: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  nextUp: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginBottom: space.sm, padding: space.md, borderRadius: 16, backgroundColor: colors.surface },
  nextEmoji: { fontSize: 36 },
  nextTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, rowGap: space.xl },
  stampCell: { width: '33.33%', alignItems: 'center', gap: 4 },
  stamp: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  stampOn: { borderColor: colors.primary, backgroundColor: 'rgba(255,92,0,0.12)' },
  stampOff: { borderColor: colors.line, borderStyle: 'dashed' },
  stampEmoji: { fontSize: 36 },
  stampLabel: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 12, textAlign: 'center', marginTop: 4 },
  stampNeed: { color: colors.textDim, fontFamily: fonts.body, fontSize: 11 },
  note: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingHorizontal: space.lg },
});
