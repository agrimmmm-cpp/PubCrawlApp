import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StopsMap } from '@/components/StopsMap';
import { Button, Display, Poster, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { PlaceCategory } from '@/data/mock';
import { useExperience } from '@/lib/experiences';
import { distanceMeters, formatDistance, walkMinutes } from '@/lib/geo';
import { buildTimeline, clock } from '@/lib/timeline';
import { useLive } from '@/lib/live';
import { vibeImage, vibeOf } from '@/lib/vibes';

const label: Record<PlaceCategory, string> = {
  bar: 'Bar',
  nightclub: 'Nightclub',
  food: 'Food',
  activity: 'Games',
  viewpoint: 'Viewpoint',
};

export default function ExperienceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { start } = useLive();
  const { experience: e, loading } = useExperience(id);

  if (!e) {
    return (
      <Screen>
        <Text style={[styles.meta, { padding: space.lg }]} onPress={() => router.back()}>
          {loading ? 'Loading…' : "That experience isn't available. Tap to go back."}
        </Text>
      </Screen>
    );
  }

  const places = e.stopPlaces ?? [];
  const legs = places.slice(1).map((p, i) => distanceMeters(places[i], p));
  const totalWalk = legs.reduce((a, b) => a + b, 0);
  const missingHours = places.filter((p) => !p.hours).length;
  const timeline = buildTimeline(
    e.startTime,
    places.map((_, i) => e.stopInfo?.[i]?.stay),
    legs.map(walkMinutes),
  );

  const go = () => {
    start('experience', e.id);
    router.navigate('/live');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Poster gradient={e.gradient} emoji={e.emoji} image={vibeOf(e) ? vibeImage(vibeOf(e)!.id) : undefined} height={260}>
          <Ionicons name="chevron-back" size={28} color="#fff" style={styles.back} onPress={() => router.back()} />
          <Text style={styles.badge}>{e.badge}</Text>
        </Poster>

        <View style={{ padding: space.lg, gap: space.sm }}>
          <Display style={{ fontSize: 34, lineHeight: 36 }}>{e.title}</Display>
          {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
          <Text style={styles.summary}>
            {[
              e.duration,
              `${e.stops} stops`,
              places.length > 1 ? `${formatDistance(totalWalk)} on foot` : '',
              e.cost,
              e.bestNight ? `Best ${e.bestNight}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
 {e.whyOrder ? (
            <Text style={styles.why}>
              <Text style={{ fontFamily: fonts.bodyBold, color: colors.text }}>Why this order  </Text>
              {e.whyOrder}
            </Text>
          ) : null}
          {timeline && e.startTime ? (
            <Text style={styles.summary}>
              {clock(e.startTime, 0)} start · ends around {timeline.end}
            </Text>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: space.lg }}>
          <Button label="Start this night" icon="play" onPress={go} />
        </View>

        {places.length > 0 ? (
          <View style={{ marginTop: space.lg }}>
            <StopsMap route stops={places} />
          </View>
        ) : null}

        <SectionTitle title="The route" right={`${e.stops} stops`} />
        {(places.length ? places : e.route.map((name, i) => ({ id: String(i), name }) as never)).map((p, i, all) => {
          const place = e.stopPlaces?.[i];
          const leg = i > 0 ? legs[i - 1] : undefined;
          return (
            <View key={place?.id ?? String(i)}>
              {leg !== undefined ? (
                <View style={styles.legRow}>
                  <View style={styles.line} />
                  <Text style={styles.leg}>
                    {walkMinutes(leg)} min walk · {formatDistance(leg)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.stop}>
                <View style={styles.num}>
                  <Text style={styles.numText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={styles.name}>
                    {place ? `${place.emoji} ` : ''}
                    {(all[i] as { name: string }).name}
                  </Text>
                  {timeline ? (
                    <Text style={styles.arrive}>
                      {timeline.arrive[i]} · about {e.stopInfo?.[i]?.stay} min
                    </Text>
                  ) : null}
                  {place ? (
                    <>
                      {place.whyGo ? <Text style={styles.whyGo}>{place.whyGo}</Text> : null}
                      {e.stopInfo?.[i]?.tip ? <Text style={styles.tip}>💡 {e.stopInfo[i].tip}</Text> : null}
                      <Text style={styles.meta}>
                        {[
                          label[place.category],
                          place.priceLevel ? '$'.repeat(place.priceLevel) : '',
                          place.age19 ? '19+' : '',
                          place.address,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                      {place.vibe?.length ? <Text style={styles.vibe}>{place.vibe.join(' · ')}</Text> : null}
                      <Text style={styles.hours}>{place.hours || 'Hours unknown. Check before you go.'}</Text>
                      {place.late ? <Text style={styles.late}>● Open late</Text> : null}
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}

        {missingHours > 0 ? (
          <Text style={styles.note}>
            Heads up: {missingHours} stop{missingHours > 1 ? 's have' : ' has'} no listed hours. Check before you go.
          </Text>
        ) : null}
        <Text style={styles.note}>
          Hours and walking times are estimates (hours from OpenStreetMap contributors, walking at about 80 m/min in a
          straight line).
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: space.md, left: space.md },
  badge: {
    position: 'absolute',
    bottom: space.lg,
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
  why: { color: colors.textDim, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: space.xs },
  arrive: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 12 },
  whyGo: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  tip: { color: colors.yellow, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 17 },
  vibe: { color: colors.blue, fontFamily: fonts.bodyMedium, fontSize: 11 },
  desc: { color: colors.textDim, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  summary: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14, marginTop: space.xs },
  stop: { flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm },
  num: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { color: '#0B0B0D', fontFamily: fonts.display, fontSize: 14 },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.3 },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  hours: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11 },
  late: { color: colors.primary, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
  legRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg + 13 },
  line: { width: 2, height: 22, backgroundColor: colors.line },
  leg: { color: colors.textFaint, fontFamily: fonts.bodyMedium, fontSize: 12, marginLeft: space.md },
  note: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, paddingHorizontal: space.lg, marginTop: space.md },
});
