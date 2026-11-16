import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { TagRow } from '@/components/ExperienceCard';
import { StopsMap } from '@/components/StopsMap';
import { Button, Display, Poster, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { PlaceCategory } from '@/data/mock';
import { experienceCost } from '@/lib/cost';
import { useExperience } from '@/lib/experiences';
import { distanceMeters, formatDistance, rideMinutes, walkMinutes } from '@/lib/geo';
import { buildTimeline, clock } from '@/lib/timeline';
import { useLive } from '@/lib/live';
import { tagsFor } from '@/lib/tags';
import { actName, doingAt, photoFor, teaser } from '@/lib/story';
import { formatMinutes, sunset } from '@/lib/sun';
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
  const rides = places.slice(1).map((_, i) => !!e.stopInfo?.[i + 1]?.ride);
  const legMins = legs.map((m, i) => (rides[i] ? rideMinutes(m) : walkMinutes(m)));
  const totalWalk = legs.reduce((a, m, i) => (rides[i] ? a : a + m), 0);
  const rideCount = rides.filter(Boolean).length;
  const missingHours = places.filter((p) => !p.hours).length;
  const cost = experienceCost(e);
  const timeline = buildTimeline(
    e.startTime,
    places.map((_, i) => e.stopInfo?.[i]?.stay),
    legMins,
  );

  const last = places[places.length - 1];
  const sunsetMin = last?.category === 'viewpoint' ? sunset(new Date(), last.lat, last.lng) : null;
  const hook = teaser(e);
  const share = () => Share.share({ message: `${e.title}: ${hook || e.description || 'A night out'} Find it on DrunkVA.` });

  const go = () => {
    start('experience', e.id);
    router.navigate('/live');
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Poster gradient={e.gradient} emoji={e.emoji} image={vibeOf(e) ? vibeImage(vibeOf(e)!.id) : undefined} height={260}>
          <Ionicons name="chevron-back" size={28} color="#fff" style={styles.back} onPress={() => router.back()} />
          <Text style={styles.badge}>{e.badge}</Text>
        </Poster>

        <View style={{ padding: space.lg, gap: space.sm }}>
          <Display style={{ fontSize: 34, lineHeight: 36 }}>{e.title}</Display>
          {hook ? <Text style={styles.hook}>{hook}</Text> : null}
          {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
          <Text style={styles.summary}>
            {[
              e.duration,
              `${e.stops} stops`,
              places.length > 1 && totalWalk > 0 ? `${formatDistance(totalWalk)} on foot` : '',
              rideCount ? `${rideCount} ride${rideCount > 1 ? 's' : ''}` : '',
              e.bestNight ? `Best ${e.bestNight}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <TagRow tags={tagsFor(e, 6)} />
          {cost?.cad ? (
            <Text style={styles.summary}>
              About ${cost.cad} per person <Text style={{ color: colors.textFaint }}>(estimate: a meal, drinks and entry)</Text>
            </Text>
          ) : null}
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

        {places.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peek}>
            {places.map((p, i) => {
              const ph = photoFor(p);
              return (
                <View key={p.id} style={styles.peekItem}>
                  <Poster gradient={ph?.gradient ?? e.gradient} emoji={p.emoji} image={ph?.image} height={72}>
                    <Text style={styles.peekNum}>{i + 1}</Text>
                  </Poster>
                </View>
              );
            })}
          </ScrollView>
        ) : null}

        {sunsetMin !== null ? (
          <View style={styles.sun}>
            <Text style={styles.sunTitle}>🌇 Sunset today at {formatMinutes(sunsetMin)}</Text>
            <Text style={styles.sunBody}>
              {last.name} is the finale. Time it so you arrive about 20 minutes before for the best light.
            </Text>
          </View>
        ) : null}

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
                    {legMins[i - 1]} min {rides[i - 1] ? 'ride' : 'walk'} · {formatDistance(leg)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.stopCard}>
                {place ? (
                  <Poster
                    gradient={photoFor(place)?.gradient ?? e.gradient}
                    emoji={place.emoji}
                    image={photoFor(place)?.image}
                    height={190}
                  >
                    <View style={styles.stopOverlay}>
                      <Text style={styles.act}>
                        {i + 1} · {actName(place, i, all.length)}
                        {timeline ? `  ·  ${timeline.arrive[i]}` : ''}
                      </Text>
                      <Text style={styles.stopName}>{place.name}</Text>
                    </View>
                  </Poster>
                ) : null}
                <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: 3 }}>
                  {!place ? <Text style={styles.name}>{(all[i] as { name: string }).name}</Text> : null}
                  {place ? (
                    <>
                      <Text style={styles.doing}>{doingAt(place)}</Text>
                      {timeline ? (
                        <Text style={styles.arrive}>
                          {timeline.arrive[i]} · about {e.stopInfo?.[i]?.stay} min
                        </Text>
                      ) : null}
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

        {rideCount > 0 ? (
          <Text style={styles.note}>
            Some stops are too far to walk. Take a rideshare, taxi or transit between them, and never drive after
            drinking.
          </Text>
        ) : null}
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
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Button label="Start this night" icon="play" onPress={go} />
        </View>
        <Ionicons name="share-outline" size={26} color={colors.text} style={styles.share} onPress={share} />
      </View>
      </View>
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
  hook: { color: colors.text, fontFamily: fonts.display, fontSize: 19, lineHeight: 24, letterSpacing: -0.3 },
  peek: { gap: 8, paddingHorizontal: space.lg, paddingTop: space.md },
  peekItem: { width: 72, height: 72, borderRadius: 8, overflow: 'hidden' },
  peekNum: { position: 'absolute', left: 6, bottom: 4, color: '#fff', fontFamily: fonts.display, fontSize: 16 },
  sun: { marginHorizontal: space.lg, marginTop: space.lg, padding: space.md, borderLeftWidth: 3, borderLeftColor: colors.yellow, gap: 2 },
  sunTitle: { color: colors.yellow, fontFamily: fonts.bodyBold, fontSize: 14 },
  sunBody: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  stopCard: { marginTop: space.md, paddingBottom: space.sm },
  stopOverlay: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md, gap: 2 },
  act: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  stopName: { color: '#fff', fontFamily: fonts.display, fontSize: 26, lineHeight: 28, letterSpacing: -0.5 },
  doing: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.lg,
    backgroundColor: 'rgba(11,11,13,0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  share: { padding: 6 },
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
