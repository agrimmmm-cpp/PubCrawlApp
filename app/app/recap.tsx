import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { NightCard } from '@/components/NightCard';
import { PhotoViewer } from '@/components/PhotoViewer';
import { STORY_H, STORY_W, StoryCard, StoryVariant } from '@/components/StoryCard';
import { StopsMap } from '@/components/StopsMap';
import { Button, Display, Divider, Screen, SectionTitle } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { LEVEL_POINTS, nightTitle } from '@/data/quests';
import { drinkMeta } from '@/data/drinks';
import { useAuth } from '@/lib/auth';
import { useExperience } from '@/lib/experiences';
import { publishNight } from '@/lib/feed';
import { distanceMeters, formatDistance } from '@/lib/geo';
import { BEST_MOMENT, formatElapsed, LogKind, useLive } from '@/lib/live';
import { capture } from '@/lib/media';
import { doingAt, photoFor } from '@/lib/story';
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
  const [caption, setCaption] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const storyRef = useRef<ComponentRef<typeof View>>(null);
  const [extra, setExtra] = useState<string[]>([]); // photos added here, after the night
  const [bg, setBg] = useState<string | null>(null); // null = first photo, 'none' = the brand gradient
  const [viewer, setViewer] = useState<number | null>(null);
  const [variant, setVariant] = useState<StoryVariant>('photo');
  const [showTally, setShowTally] = useState(true); // drinks and food counts on the picture; off hides them
  const [openStop, setOpenStop] = useState<string | null>(null);
  const [posted, setPosted] = useState<'idle' | 'posting' | 'posted' | 'already' | 'failed'>('idle');
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
  const walked = visited.slice(1).reduce((m, v, i) => m + distanceMeters(visited[i], v), 0);
  const route = visited.map((v) => ({ lat: v.lat, lng: v.lng }));
  // Every photo from the night: taken during it, or added here. Anyone can add more, with or without a crawl.
  const allPhotos = [...new Set([...moments.filter((l) => l.mediaType !== 'video').map((l) => l.uri as string), ...extra])];
  const videos = moments.filter((l) => l.mediaType === 'video');
  const bestMoment = videos.find((l) => l.caption === BEST_MOMENT);
  const storyPhoto = bg === 'none' ? undefined : (bg ?? allPhotos[0]);
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
  const tally = (['beer', 'cocktail', 'shot', 'wine', 'food'] as const)
    .map((k) => ({ emoji: ({ beer: '🍺', cocktail: '🍸', shot: '🥃', wine: '🍷', food: '🍔' } as const)[k], count: count(k) }))
    .filter((x) => x.count > 0);
  const story = { tally: showTally ? tally : undefined, title, date: card.date, duration: card.duration, stops: card.stops, chaos, rank: card.rank, balanced: card.balanced, distance: walked >= 100 ? formatDistance(walked) : undefined, quests: quests.results.length ? `${questsDone} of ${quests.results.length}` : undefined };

  // 1080 x 1920 picture for Instagram Stories. The phone's share sheet lists Instagram (Story, Feed or Message) and
  // Save Image; nothing is posted until the person picks where it goes.
  const shareStory = async () => {
    setSharing(true);
    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(storyRef, { format: 'png', quality: 1, width: 1080, height: 1920 });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your night', UTI: 'public.png' });
      } else {
        await Share.share({ message: `${title}: ${card.duration} out, ${card.stops} stops, ${chaos} chaos points. #DrunkVA` });
      }
    } catch {
      // Cancelled or unavailable.
    } finally {
      setSharing(false);
    }
  };

  const addFromLibrary = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 6, quality: 0.8 });
      if (!r.canceled) setExtra((x) => [...x, ...r.assets.map((a) => a.uri)]);
    } catch {
      // Permission refused or picker closed.
    }
  };
  const addFromCamera = async () => {
    const r = await capture('photo');
    if (r.ok) setExtra((x) => [...x, r.media.uri]);
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

  // Posting to friends is opt-in. Photos are only sent when picked here, and videos are not posted.
  const canPost = supabaseConfigured && !!session && !!finished.id;
  const postable = allPhotos;
  const post = async () => {
    if (!session) return;
    setPosted('posting');
    const photoUris = postable.filter((u) => picked.includes(u));
    setPosted(
      await publishNight({
        userId: session.user.id,
        sessionId: finished.id,
        experienceId: finished.experienceId,
        title,
        caption,
        stats: { duration: card.duration, stops: card.stops, chaos, rank: card.rank, moments: photoUris.length },
        photoUris,
      }),
    );
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
          <Text style={styles.dim}>Your night as a story. Pick a photo, then share it anywhere.</Text>
        </View>

        {/* The 9:16 story. A full-size copy sits off screen and is what gets captured at 1080 x 1920. */}
        <View style={styles.hidden} pointerEvents="none">
          <StoryCard cardRef={storyRef} data={story} route={route} photo={storyPhoto} photos={allPhotos.slice(-6)} variant={variant} />
        </View>
        <View style={styles.storyBox}>
          <View style={{ transform: [{ scale: 0.62 }], transformOrigin: 'top left' }}>
            <StoryCard data={story} route={route} photo={storyPhoto} photos={allPhotos.slice(-6)} variant={variant} />
          </View>
        </View>

        <View style={styles.seg}>
          {([['photo', 'Photo'], ['collage', 'Collage'], ['card', 'Card only']] as const).map(([v, label]) => (
            <Pressable key={v} onPress={() => setVariant(v)} style={[styles.segItem, variant === v && styles.segOn]}>
              <Text style={[styles.segText, variant === v && { color: '#0B0B0D' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {variant === 'collage' && allPhotos.length === 0 ? <Text style={[styles.dim, { paddingHorizontal: space.lg, marginTop: space.sm }]}>Add photos below to fill the collage.</Text> : null}
        <View style={styles.tallyRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stopName}>Show drinks &amp; food</Text>
            <Text style={styles.dim}>A plain count of what you logged. Your choice, never scored.</Text>
          </View>
          <Switch value={showTally} onValueChange={setShowTally} trackColor={{ true: colors.primary }} />
        </View>
        {variant === 'photo' ? <Text style={[styles.dim, { paddingHorizontal: space.lg, marginTop: space.md }]}>Background</Text> : null}
        {variant === 'photo' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm, paddingTop: space.sm }}>
          <Pressable onPress={() => setBg('none')} style={[styles.bgTile, { backgroundColor: '#8A2A0A' }, !storyPhoto && styles.pickOn]}>
            <Text style={styles.bgLabel}>d.</Text>
          </Pressable>
          {allPhotos.map((u) => (
            <Pressable key={u} onPress={() => setBg(u)} style={[styles.bgTile, storyPhoto === u && styles.pickOn]}>
              <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          ))}
          <Pressable onPress={addFromLibrary} style={[styles.bgTile, styles.addTile]}>
            <Text style={styles.plus}>+</Text>
          </Pressable>
        </ScrollView> : null}

        <View style={{ paddingHorizontal: space.lg, marginTop: space.lg, gap: space.sm }}>
          <Button label={sharing ? 'Preparing…' : 'Share to Instagram'} icon="logo-instagram" onPress={shareStory} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button label="Add photos" variant="ghost" icon="images" onPress={addFromLibrary} style={{ flex: 1 }} />
            <Button label="Take photo" variant="ghost" icon="camera" onPress={addFromCamera} style={{ flex: 1 }} />
          </View>
          <Text style={styles.note2}>In the share sheet pick Instagram, then Stories. Or tap Save Image to keep it.</Text>
        </View>

        <SectionTitle title="By the numbers" />
        <View style={styles.tiles}>
          {[
            { v: card.duration, l: 'out' },
            { v: card.stops, l: 'stops' },
            { v: walked >= 100 ? formatDistance(walked) : '—', l: 'walked' },
            { v: quests.results.length ? `${questsDone}/${quests.results.length}` : '—', l: 'quests' },
            { v: String(allPhotos.length + videos.length), l: 'moments' },
            { v: String(chaos), l: 'chaos' },
          ].map((t) => (
            <View key={t.l} style={styles.tile}>
              <Text style={styles.tileNum}>{t.v}</Text>
              <Text style={styles.tileLabel}>{t.l}</Text>
            </View>
          ))}
        </View>

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl }}>
          <NightCard cardRef={cardRef} data={card} />
          <View style={{ marginTop: space.md }}>
            <Button label="Share report card" variant="ghost" icon="share-outline" onPress={shareCard} />
          </View>
        </View>

        {canPost ? (
          <>
            <SectionTitle title="Post to friends" right="Only friends see it" />
            <View style={styles.post}>
              {posted === 'posted' || posted === 'already' ? (
                <Text style={styles.postDone}>{posted === 'posted' ? '✓ Posted to your friends' : '✓ This night is already posted'}</Text>
              ) : (
                <>
                  <TextInput
                    value={caption}
                    onChangeText={setCaption}
                    placeholder="Say something about the night (optional)"
                    placeholderTextColor={colors.textFaint}
                    maxLength={280}
                    multiline
                    style={styles.caption}
                  />
                  {postable.length > 0 ? (
                    <>
                      <Text style={styles.dim}>Tap the photos you want to include. None go up unless you pick them.</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                        {[...postable].reverse().map((u) => {
                          const on = picked.includes(u);
                          return (
                            <Pressable key={u} onPress={() => setPicked((x) => (on ? x.filter((i) => i !== u) : x.length < 6 ? [...x, u] : x))} style={[styles.pick, on && styles.pickOn]}>
                              <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" />
                              {on ? <Text style={styles.tick}>✓</Text> : null}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </>
                  ) : null}
                  <Text style={styles.note}>Your card numbers go up. Your drinks and spending never do.</Text>
                  <Button label={posted === 'posting' ? 'Posting…' : 'Post to friends'} icon="paper-plane" onPress={posted === 'posting' ? undefined : post} />
                  {posted === 'failed' ? <Text style={[styles.dim, { color: colors.pink }]}>Could not post. Check your connection and try again.</Text> : null}
                </>
              )}
            </View>
          </>
        ) : null}

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
            {visited.map((p, i) => {
              const ph = photoFor(p);
              const open = openStop === p.id;
              return (
              <View key={p.id}>
                <Pressable style={styles.row} onPress={() => setOpenStop(open ? null : p.id)}>
                  <View style={styles.stopThumb}>{ph ? <Image source={ph.image as never} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stopName} numberOfLines={1}>
                      {i + 1}. {p.name}
                    </Text>
                    <Text style={styles.dim}>{doingAt(p)}</Text>
                  </View>
                  <Text style={[styles.thumb, ratings[p.id] === 1 && styles.on]} onPress={() => rate(p.id, 1)}>
                    👍
                  </Text>
                  <Text style={[styles.thumb, ratings[p.id] === -1 && styles.on]} onPress={() => rate(p.id, -1)}>
                    👎
                  </Text>
                </Pressable>
                {open ? (
                  <View style={styles.stopOpen}>
                    {ph ? <Image source={ph.image as never} style={styles.stopPhoto} contentFit="cover" /> : null}
                    <Text style={styles.dim}>{p.address}</Text>
                    {ph?.credit ? <Text style={styles.credit}>📷 {ph.credit}</Text> : null}
                  </View>
                ) : null}
                <Divider />
              </View>
              );
            })}
            <Text style={styles.note}>Ratings help rank places for everyone. Nobody sees who rated what.</Text>
          </>
        ) : null}

        {bestMoment ? (
          <>
            <SectionTitle title="Best moment" right="Your pick ⭐" />
            <View style={styles.best}>
              <Text style={{ fontSize: 34 }}>🎬</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.stopName}>Your best moment is saved</Text>
                <Text style={styles.dim}>A short video kept on your phone, only yours unless you share it.</Text>
              </View>
            </View>
          </>
        ) : null}

        <SectionTitle title="Photos" right={`${allPhotos.length + videos.length} moments`} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
          <Pressable onPress={addFromLibrary} style={[styles.moment, styles.addTile]}>
            <Text style={styles.plus}>+</Text>
            <Text style={styles.dim}>Add photos</Text>
          </Pressable>
          {[...allPhotos].reverse().map((u, i) => (
            <Pressable key={u} onPress={() => setViewer(allPhotos.length - 1 - i)} style={styles.moment}>
              <Image source={{ uri: u }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Pressable>
          ))}
          {videos.map((l) => (
            <View key={l.id} style={styles.moment}>
              <Text style={styles.videoTag}>🎥</Text>
            </View>
          ))}
        </ScrollView>
        <PhotoViewer photos={allPhotos} start={viewer} onClose={() => setViewer(null)} />

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
  post: { marginHorizontal: space.lg, padding: space.lg, borderRadius: 14, backgroundColor: colors.surface, gap: space.md },
  postDone: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 15 },
  caption: { minHeight: 60, color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, textAlignVertical: 'top' },
  pick: { width: 84, height: 84, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.bg, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  pickOn: { borderColor: colors.primary },
  tick: { color: colors.primary, fontFamily: fonts.display, fontSize: 28, textShadowColor: '#000', textShadowRadius: 6 },
  seg: { flexDirection: 'row', marginHorizontal: space.lg, marginTop: space.lg, padding: 4, borderRadius: 999, backgroundColor: colors.surface },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  segOn: { backgroundColor: colors.primary },
  segText: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 13 },
  tallyRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.md, padding: space.md, borderRadius: 14, backgroundColor: colors.surface },
  best: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, padding: space.md, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,92,0,0.35)' },
  hidden: { position: 'absolute', left: -5000, top: 0, width: STORY_W, height: STORY_H },
  storyBox: { width: STORY_W * 0.62, height: STORY_H * 0.62, alignSelf: 'center', borderRadius: 16, overflow: 'hidden', marginTop: space.sm },
  bgTile: { width: 56, height: 56, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  bgLabel: { color: '#fff', fontFamily: fonts.display, fontSize: 22 },
  addTile: { backgroundColor: colors.surface, borderColor: colors.line, borderStyle: 'dashed', borderWidth: 1.5 },
  plus: { color: colors.primary, fontFamily: fonts.display, fontSize: 28 },
  note2: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 12, textAlign: 'center' },
  stopThumb: { width: 46, height: 46, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface },
  stopOpen: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: 6 },
  stopPhoto: { width: '100%', height: 170, borderRadius: 14, backgroundColor: colors.surface },
  credit: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11 },
  note: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11, paddingHorizontal: space.lg, marginTop: space.sm },
});
