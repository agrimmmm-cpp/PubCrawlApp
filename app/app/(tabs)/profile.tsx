import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Display, Divider, Header, Meter, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import credits from '@/assets/vibes/credits.json';
import { useIsAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { BADGES, tierFor, usePassport } from '@/lib/passport';

export default function Profile() {
  const { configured, session, signOut } = useAuth();
  const passport = usePassport();
  const isAdmin = useIsAdmin();
  const tier = tierFor(passport.nights);
  const stats = [
    { label: 'nights', value: passport.nights },
    { label: 'places', value: passport.places },
    { label: 'cities', value: passport.cities },
    { label: 'moments', value: passport.moments },
  ];
  const earned = BADGES.filter((b) => b.earned(passport));
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header title="passport" />

        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md }}>
          <Text style={styles.kicker}>{tier.next ? `NEXT: ${tier.next.toUpperCase()}` : 'TOP TIER'}</Text>
          <Display>
            {tier.name.split(' ')[0]}
            {tier.name.includes(' ') ? '\n' : ''}
            <Text style={{ color: colors.yellow }}>{tier.name.split(' ').slice(1).join(' ')}</Text>
          </Display>
          <Meter value={tier.progress} color={colors.yellow} />
        </View>

        <View style={styles.stats}>
          {stats.map((s) => (
            <View key={s.label} style={{ flex: 1 }}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <Divider />

        <SectionTitle title="Badges" right={`${earned.length} of ${BADGES.length}`} />
        <View style={styles.badges}>
          {BADGES.map((b) => (
            <View key={b.id} style={[styles.badge, !b.earned(passport) && { opacity: 0.3 }]}>
              <Text style={{ fontSize: 34 }}>{b.emoji}</Text>
              <Text style={styles.badgeLabel}>{b.label}</Text>
              {!b.earned(passport) ? <Text style={styles.need}>{b.need}</Text> : null}
            </View>
          ))}
        </View>

        <SectionTitle title="Private journal" />
        <Text style={styles.note}>
          Optional, only you see it, never ranked. Pace Insight is an estimate and never a measure of whether you
          are safe to drive.
        </Text>

        {credits.length > 0 ? (
          <Text style={[styles.note, { marginTop: space.xl }]}>
            Photos by {credits.map((c) => c.photographer).join(', ')} on {[...new Set(credits.map((c) => c.source))].join(' and ')}.
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
            <Text style={styles.note}>Signed in as {session.user.email}</Text>
            <Button label="Sign out" variant="ghost" onPress={signOut} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  stats: { flexDirection: 'row', padding: space.lg, marginTop: space.md },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 30, letterSpacing: -1 },
  statLabel: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, rowGap: space.lg },
  badge: { width: '33.33%', alignItems: 'center', gap: 6 },
  badgeLabel: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 11, textAlign: 'center' },
  need: { color: colors.textDim, fontFamily: fonts.body, fontSize: 10 },
  note: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingHorizontal: space.lg },
});
