import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { TagRow } from '@/components/ExperienceCard';
import { StopsMap } from '@/components/StopsMap';
import { Button, Display, Poster, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { Place, PlaceCategory } from '@/data/mock';
import { experienceCost } from '@/lib/cost';
import { useExperience } from '@/lib/experiences';
import { distanceMeters, formatDistance, rideMinutes, walkMinutes } from '@/lib/geo';
import { buildTimeline, clock } from '@/lib/timeline';
import { useLive } from '@/lib/live';
import { tagsFor } from '@/lib/tags';
import { actName, doingAt, photoFor, teaser } from '@/lib/story';
import { formatMinutes, sunset } from '@/lib/sun';
import { vibeImage, vibeOf } from '@/lib/vibes';
import { openNow } from '@/lib/hours';
import { PriceSigns, Stars } from '@/components/GoogleBits';
import { googleProblem, useGoogleInfo } from '@/lib/googlePlace';
import { supabase, supabaseConfigured } from '@/lib/supabase';

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
  const [about, setAbout] = useState(false);
  const [more, setMore] = useState<Record<number, boolean>>({});
  const [reminded, setReminded] = useState(false);
  const [nights, setNights] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  // One Google photo for the whole page: the first stop that has a Google place id. Costs one small request, and
  // falls back to the Wikimedia or stock cover if Google is not set up or the daily budget is used.
  const leadId = e?.stopPlaces?.find((p) => p.googleId)?.googleId;
  const lead = useGoogleInfo(leadId, 'details'); // the same request the stop card makes, so it is paid for once

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Real social proof only: how many nights have been started on this experience, shown once it is 3 or more.
  useEffect(() => {
    if (!supabaseConfigured || !id) return;
    supabase
      .from('experience_stats')
      .select('nights')
      .eq('experience_id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data) setNights(Number((data as { nights: number }).nights));
      });
  }, [id]);

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
  // Cover: a real photo of one of the stops when there is one (the finale first), otherwise stock for the mood.
  const realPhoto = [...places].reverse().find((p) => p.photo);
  const leadPlace = places.find((p) => p.googleId === leadId);
  const cover = lead?.photoUri
    ? { image: { uri: lead.photoUri }, credit: undefined, real: false }
    : realPhoto
      ? photoFor(realPhoto)
      : vibeOf(e)
        ? { image: vibeImage(vibeOf(e)!.id, e.id), credit: undefined, real: false }
        : undefined;
  const credited = places.filter((p) => p.photo?.credit);
  const sunsetMin = last?.category === 'viewpoint' ? sunset(new Date(), last.lat, last.lng) : null;
  const hook = teaser(e);
  const open = openNow(places, now);
  const startAt = (() => {
    if (!e.startTime) return null;
    const [h, m] = e.startTime.split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  })();
  const untilStart = startAt ? Math.round((startAt.getTime() - now.getTime()) / 60000) : null;
  const startLine =
    untilStart === null
      ? null
      : untilStart > 90
        ? `Starts at ${clock(e.startTime!, 0)}, in ${Math.floor(untilStart / 60)}h ${untilStart % 60}m`
        : untilStart > 0
          ? `Starts at ${clock(e.startTime!, 0)}, in ${untilStart} min`
          : untilStart > -120
            ? 'Starting time has passed. You can start now and catch the rest.'
            : null;
  const remind = async () => {
    if (!startAt) return;
    const when = new Date(startAt.getTime() - 30 * 60000);
    if (when.getTime() < Date.now()) when.setDate(when.getDate() + 1);
    if (Platform.OS === 'web') {
      setReminded(true);
      return;
    }
    try {
      const perm = await Notifications.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Notifications are off', 'Turn them on in Settings to get a reminder.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: { title: `Get ready: ${e.title}`, body: `Starts at ${clock(e.startTime!, 0)}. Tap to start your night.` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      });
      setReminded(true);
    } catch {
      Alert.alert("Couldn't set the reminder", 'Try again in a moment.');
    }
  };
  const share = () => Share.share({ message: `${e.title}: ${hook || e.description || 'A night out'} Find it on DrunkVA.` });

  const go = () => {
    start('experience', e.id);
    router.navigate('/live');
  };

  return (
    <Screen>
      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Poster gradient={e.gradient} emoji={e.emoji} image={cover ? (cover.image as never) : undefined} height={260}>
          <Ionicons name="chevron-back" size={28} color="#fff" style={styles.back} onPress={() => router.back()} />
          <Text style={styles.badge}>{e.badge}</Text>
          {lead?.photoUri ? (
            <Text style={styles.credit} numberOfLines={1}>
              📷 {leadPlace?.name}: {lead.photoBy ?? 'Google contributor'} · Google Maps
            </Text>
          ) : cover?.real && realPhoto?.photo?.credit ? (
            <Text style={styles.credit} numberOfLines={1}>
              📷 {realPhoto.name}: {realPhoto.photo.credit} · {realPhoto.photo.license}
            </Text>
          ) : null}
        </Poster>

        <View style={{ padding: space.lg, gap: space.sm }}>
          <Display style={{ fontSize: 34, lineHeight: 36 }}>{e.title}</Display>
          {hook ? <Text style={styles.hook}>{hook}</Text> : null}
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
              About ${cost.cad} per person <Text style={{ color: colors.textFaint }}>(estimate)</Text>
            </Text>
          ) : null}
          {nights !== null && nights >= 3 ? <Text style={styles.proof}>🔥 {nights} nights started on this one</Text> : null}
        </View>

        {__DEV__ ? (
          <Text style={styles.devNote}>
            {!leadId
              ? 'Dev note: none of this experience\'s stops has a Google id yet, so no Google photo. Run 014_google_place_ids.sql, or open a generated experience.'
              : lead === undefined
                ? 'Dev note: asking Google for the cover photo…'
                : lead === null
                  ? `Dev note: Google did not answer: ${googleProblem(leadId, 'photo') ?? 'unknown'}`
                  : lead.photoUri
                    ? 'Dev note: Google photo loaded.'
                    : 'Dev note: Google answered but this place has no photo.'}
          </Text>
        ) : null}

        {(open.open > 0 || startLine) && places.length > 0 ? (
          <View style={styles.tonight}>
            <Text style={styles.tonightTitle}>Tonight</Text>
            {open.open + open.closed > 0 ? (
              <Text style={styles.tonightLine}>
                <Text style={{ color: open.closed === 0 ? colors.green : colors.yellow }}>● </Text>
                {open.open} of {places.length} stops open right now
                {open.closed > 0 ? `, ${open.closed} closed` : ''}
                {open.unknown > 0 ? `, ${open.unknown} unknown` : ''}
              </Text>
            ) : null}
            {startLine ? <Text style={styles.tonightLine}>{startLine}</Text> : null}
          </View>
        ) : null}

        <Pressable style={styles.questTease} onPress={go}>
          <Text style={{ fontSize: 26 }}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.questTeaseTitle}>Side quests are waiting</Text>
            <Text style={styles.questTeaseBody}>Surprise dares pop up as you go. Do them, skip them, or snap the proof.</Text>
          </View>
        </Pressable>

        {e.description || e.whyOrder ? (
          <View style={{ paddingHorizontal: space.lg, marginTop: space.md }}>
            <Pressable onPress={() => setAbout(!about)} style={styles.aboutHead}>
              <Text style={styles.aboutTitle}>About this night</Text>
              <Ionicons name={about ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
            </Pressable>
            {about ? (
              <View style={{ gap: space.sm, paddingTop: space.sm }}>
                {e.description ? <Text style={styles.desc}>{e.description}</Text> : null}
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
            ) : null}
          </View>
        ) : null}

        {places.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peek}>
            {places.map((p, i) => (
              <PeekThumb key={p.id} place={p} gradient={e.gradient} n={i + 1} />
            ))}
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
                  <StopHero place={place} gradient={e.gradient} index={i} total={all.length} arrive={timeline?.arrive[i]} />
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
                      {place.late ? <Text style={styles.late}>● Open late</Text> : null}
                      <Pressable onPress={() => setMore((m) => ({ ...m, [i]: !m[i] }))} hitSlop={8}>
                        <Text style={styles.moreLink}>{more[i] ? 'Less' : 'Hours, address and tips'}</Text>
                      </Pressable>
                      {more[i] ? (
                        <View style={{ gap: 3 }}>
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
                          {place.googleId ? <GoogleDetails placeId={place.googleId} /> : null}
                        </View>
                      ) : null}
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
        {credited.length > 0 ? (
          <Text style={styles.note}>
            Photos from Wikimedia Commons: {credited.map((p) => `${p.name} by ${p.photo?.credit} (${p.photo?.license})`).join('; ')}. Other
            pictures are stock photos that show a mood, never a specific venue.
          </Text>
        ) : (
          <Text style={styles.note}>The pictures are stock photos that show a mood, never a specific venue.</Text>
        )}
        <Text style={styles.note}>
          Hours and walking times are estimates (hours from OpenStreetMap contributors, walking at about 80 m/min in a
          straight line).
        </Text>
      </ScrollView>
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <Button label={untilStart !== null && untilStart > 0 && untilStart < 24 * 60 ? 'Start this night' : 'Start now'} icon="play" onPress={go} />
        </View>
        <Ionicons
          name={reminded ? 'notifications' : 'notifications-outline'}
          size={26}
          color={reminded ? colors.primary : colors.text}
          style={styles.share}
          onPress={remind}
          accessibilityLabel="Remind me"
        />
        <Ionicons name="person-add-outline" size={25} color={colors.text} style={styles.share} onPress={share} accessibilityLabel="Invite friends" />
      </View>
      </View>
    </Screen>
  );
}

/** A small numbered photo for the strip under the cover. Shares the stop card's Google request, so it costs nothing extra. */
function PeekThumb({ place, gradient, n }: { place: Place; gradient: [string, string]; n: number }) {
  const g = useGoogleInfo(place.googleId, 'details');
  const ph = photoFor(place);
  return (
    <View style={styles.peekItem}>
      <Poster gradient={ph?.gradient ?? gradient} emoji={place.emoji} image={(g?.photoUri ? { uri: g.photoUri } : ph?.image) as never} height={72}>
        <Text style={styles.peekNum}>{n}</Text>
      </Poster>
    </View>
  );
}

/**
 * The photo of one stop with its name on it, then its stars and price. The photo is the place's own, from Google, when
 * Google has it; otherwise a Wikimedia photo, otherwise a stock photo for that kind of place. Nothing here is stored.
 */
function StopHero({ place, gradient, index, total, arrive }: { place: Place; gradient: [string, string]; index: number; total: number; arrive?: string }) {
  const g = useGoogleInfo(place.googleId, 'details');
  const fallback = photoFor(place);
  const image = g?.photoUri ? { uri: g.photoUri } : fallback?.image;
  return (
    <>
      <Poster gradient={fallback?.gradient ?? gradient} emoji={place.emoji} image={image as never} height={190}>
        <View style={styles.stopOverlay}>
          <Text style={styles.act}>
            {index + 1} · {actName(place, index, total)}
            {arrive ? `  ·  ${arrive}` : ''}
          </Text>
          <Text style={styles.stopName}>{place.name}</Text>
        </View>
        {g?.photoUri ? (
          <Text style={[styles.credit, { top: space.sm, bottom: undefined }]} numberOfLines={1}>
            📷 {g.photoBy ?? 'Google contributor'} · Google Maps
          </Text>
        ) : place.photo?.credit ? (
          <Text style={[styles.credit, { top: space.sm, bottom: undefined }]} numberOfLines={1}>
            📷 {place.photo.credit} · {place.photo.license}
          </Text>
        ) : null}
      </Poster>
      {g && (g.rating || g.priceLevel != null || g.openNow != null) ? (
        <View style={styles.reviewBar}>
          {g.rating ? <Stars rating={g.rating} count={g.ratingCount} size={15} /> : null}
          <View style={styles.reviewRight}>
            <PriceSigns level={g.priceLevel} size={14} />
            {g.openNow != null ? <Text style={[styles.openTag, { color: g.openNow ? colors.green : colors.pink }]}>{g.openNow ? 'Open now' : 'Closed now'}</Text> : null}
          </View>
        </View>
      ) : null}
    </>
  );
}

/** Live hours and a Google Maps link for one stop, fetched only when the person opens "Hours, address and tips". */
function GoogleDetails({ placeId }: { placeId: string }) {
  const info = useGoogleInfo(placeId, 'details');
  if (info === undefined) return <Text style={styles.gMuted}>Checking Google Maps…</Text>;
  if (info === null) return null;
  const today = info.weekdayText?.[(new Date().getDay() + 6) % 7];
  return (
    <View style={styles.gBox}>
      {today ? <Text style={styles.meta}>{today}</Text> : null}
      <Pressable onPress={() => info.mapsUri && Linking.openURL(info.mapsUri).catch(() => {})} disabled={!info.mapsUri} hitSlop={8}>
        <Text style={styles.gAttr}>Google Maps{info.mapsUri ? '  ›' : ''}</Text>
      </Pressable>
    </View>
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
  credit: { position: 'absolute', right: space.md, bottom: space.sm, left: space.md, textAlign: 'right', color: 'rgba(255,255,255,0.75)', fontFamily: fonts.body, fontSize: 10 },
  reviewBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: space.sm },
  reviewRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  openTag: { fontFamily: fonts.bodyBold, fontSize: 12 },
  gBox: { gap: 4, marginTop: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  gPhoto: { height: 120, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface },
  gLine: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  gMuted: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  gAttr: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 },
  devNote: { color: colors.yellow, fontFamily: fonts.body, fontSize: 11, lineHeight: 15, marginHorizontal: space.lg, marginTop: space.sm },
  proof: { color: colors.yellow, fontFamily: fonts.bodyBold, fontSize: 13, marginTop: 2 },
  tonight: { marginHorizontal: space.lg, marginTop: space.sm, padding: space.md, borderRadius: 12, backgroundColor: colors.surface, gap: 3 },
  tonightTitle: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  tonightLine: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  questTease: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.md, padding: space.md, borderRadius: 12, backgroundColor: 'rgba(255,214,10,0.08)', borderWidth: 1, borderColor: 'rgba(255,214,10,0.25)' },
  questTeaseTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3 },
  questTeaseBody: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  aboutHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  aboutTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  moreLink: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 12, marginTop: 2 },
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
