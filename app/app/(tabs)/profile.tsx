import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Display, Divider, Header, Meter, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { badges } from '@/data/mock';
import { useAuth } from '@/lib/auth';

const stats = [
  { label: 'nights', value: '24' },
  { label: 'places', value: '67' },
  { label: 'cities', value: '3' },
  { label: 'memories', value: '212' },
];

export default function Profile() {
  const { configured, session, signOut } = useAuth();
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header title="passport" />

        <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.md }}>
          <Text style={styles.kicker}>LEVEL 42 · WEEKEND WANDERER</Text>
          <Display>
            Night{'\n'}
            <Text style={{ color: colors.yellow }}>Owl</Text> 🦉
          </Display>
          <Meter value={0.68} color={colors.yellow} />
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

        <SectionTitle title="Badges" right="3 of 6" />
        <View style={styles.badges}>
          {badges.map((b) => (
            <View key={b.id} style={[styles.badge, !b.earned && { opacity: 0.3 }]}>
              <Text style={{ fontSize: 34 }}>{b.emoji}</Text>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </View>
          ))}
        </View>

        <SectionTitle title="Private journal" />
        <Text style={styles.note}>
          Optional, only you see it, never ranked. Pace Insight is an estimate and never a measure of whether you
          are safe to drive.
        </Text>

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
  note: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, paddingHorizontal: space.lg },
});
