import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { GoLiveBurst } from '@/components/GoLiveBurst';
import { LogSheet } from '@/components/LogSheet';
import { Avatar, Button, Display, Divider, Header, Poster, Screen, SectionTitle, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { JoinPolicy } from '@/data/mock';
import { drinkMeta } from '@/data/drinks';
import { useExperience, useExperiences } from '@/lib/experiences';
import { distanceMeters, formatDistance, rideMinutes, walkMinutes } from '@/lib/geo';
import { BEST_MOMENT, formatElapsed, LogKind, useLive } from '@/lib/live';
import { capture, shareMoment } from '@/lib/media';
import { useQuests } from '@/lib/quests';
import { useSocial } from '@/lib/social';
import { useAuth } from '@/lib/auth';
import { photoFor } from '@/lib/story';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// One tap each. Colour and icon tell them apart without reading.
const DOCK: { kind: LogKind; icon: IconName; label: string; color: string }[] = [
  { kind: 'beer', icon: 'beer', label: 'Beer', color: '#FFB020' },
  { kind: 'cocktail', icon: 'glass-cocktail', label: 'Cocktail', color: '#FF3D81' },
  { kind: 'shot', icon: 'glass-tulip', label: 'Shot', color: '#B06BFF' },
  { kind: 'wine', icon: 'glass-wine', label: 'Wine', color: '#E0457B' },
  { kind: 'water', icon: 'cup-water', label: 'Water', color: '#2D9CFF' },
  { kind: 'food', icon: 'food', label: 'Food', color: '#37E08A' },
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

const DRINKS: LogKind[] = ['beer', 'cocktail', 'shot', 'wine'];
const dockMeta = (kind: LogKind) => DOCK.find((d) => d.kind === kind);

const ask = (title: string, message: string, yes: string, onYes: () => void) => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [{ text: 'Not yet', style: 'cancel' }, { text: yes, onPress: onYes }]);
};

export default function Live() {
  const { session, start, burst, clearBurst } = useLive();

  return (
    <Screen>
      {session ? <ActiveNight /> : <Idle go={start} />}
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
          <MaterialCommunityIcons name="lightning-bolt" size={46} color="#0B0B0D" />
          <View style={{ flex: 1 }}>
            <Text style={styles.goTitle}>Go live</Text>
            <Text style={styles.goSub}>No plan. Log, snap moments, and see where it goes.</Text>
          </View>
        </Pressable>
        <Text style={styles.teaser}>🎯 Surprise side quests pop up during your night. Do them, skip them, or snap the proof.</Text>
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
  const { session, add, remove, update, end, nextStop, setJoinPolicy } = useLive();
  const { session: auth } = useAuth();
  const { joinRequests, resolveJoinRequest } = useSocial();
  const quests = useQuests();
  const { experience: exp } = useExperience(session?.experienceId);
  const [now, setNow] = useState(() => Date.now());
  const [toast, setToast] = useState<{ text: string; undo?: () => void; details?: () => void } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false); // the sheet was opened by a new log, so it offers Skip
  const [open, setOpen] = useState<{ friends?: boolean; quests?: boolean; all?: boolean }>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => void (toastTimer.current && clearTimeout(toastTimer.current)), []);

  if (!session) return null;

  const places = exp?.stopPlaces ?? [];
  const stops = exp?.route ?? [];
  const here = places[session.stop];
  const next = places[session.stop + 1];
  const nextLeg = here && next ? distanceMeters(here, next) : 0;
  const nextRide = !!exp?.stopInfo?.[session.stop + 1]?.ride;
  const cover = here ? photoFor(here) : undefined;

  const count = (kinds: LogKind[]) => session.log.filter((l) => kinds.includes(l.kind)).length;
  const drinks = count(DRINKS);
  const water = count(['water']);
  const moments = session.log.filter((l) => l.kind === 'moment' && l.uri);
  const needsWater = drinks >= 2 && water * 2 < drinks;
  const questsDone = quests.results.filter((r) => r.status === 'done').length;

  const say = (text: string, undo?: () => void, details?: () => void) => {
    setToast({ text, undo, details });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), details ? 6000 : 3500);
  };

  // One tap logs it and opens the details sheet straight away. Skip (or tapping outside) keeps the quick log.
  const log = (kind: LogKind, extra?: Parameters<typeof add>[1], openSheet = true) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const id = add(kind, extra);
    const total = session.log.filter((l) => l.kind === kind).length + 1;
    const meta = dockMeta(kind);
    if (id && kind !== 'moment' && openSheet) {
      setFresh(true);
      setEditing(id);
    } else {
      say(`${extra?.item ?? meta?.label ?? kind} · ${total} tonight`, id ? () => remove(id) : undefined);
    }
  };

  const closeSheet = (saved: boolean) => {
    const entry = editingEntry;
    setEditing(null);
    if (!entry) return;
    const total = session.log.filter((l) => l.kind === entry.kind).length;
    const label = dockMeta(entry.kind)?.label ?? entry.kind;
    if (saved) say(`${entry.item ? `${entry.item} ` : ''}saved`);
    else if (fresh) say(`${label} · ${total} tonight`, () => remove(entry.id));
  };

  // The last few distinct things the person has had, one tap to have another.
  const usuals = (() => {
    const seen = new Set<string>();
    const out: { kind: LogKind; item: string; size?: string; price?: number }[] = [];
    for (const l of session.log) {
      if (!l.item || l.kind === 'moment' || l.kind === 'water') continue;
      const key = `${l.kind}|${l.item}|${l.size ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ kind: l.kind, item: l.item, size: l.size, price: l.price });
      if (out.length === 3) break;
    }
    return out;
  })();

  const lastDrink = session.log.find((l) => DRINKS.includes(l.kind));
  const sinceLast = lastDrink ? Math.max(0, Math.round((now - lastDrink.at) / 60000)) : null;
  const spent = session.log.reduce((n, l) => n + (l.price ?? 0), 0);
  const priced = session.log.filter((l) => l.price !== undefined).length;
  const hydration = drinks === 0 ? 1 : Math.min(1, water / Math.max(1, Math.ceil(drinks / 2))); // one water for every two drinks fills the bar
  const editingEntry = editing ? session.log.find((l) => l.id === editing) : undefined;
  const editingNumber = editingEntry ? session.log.filter((l) => l.kind === editingEntry.kind && l.at <= editingEntry.at).length : 0;

  const snap = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const res = await capture('either');
    if (res.ok) {
      add('moment', { uri: res.media.uri, mediaType: res.media.type });
      say(res.media.type === 'video' ? 'Video saved to your night' : 'Photo saved to your night');
    } else if (res.reason === 'denied') {
      say('Camera is off for DrunkVA. Turn it on in Settings to snap moments.');
    } else if (res.reason === 'error') {
      say("The camera didn't open. Try again.");
    }
  };

  // One video per night, picked as the best moment: a dance move, a toast, a karaoke line, anything. Recording again
  // replaces it. Nothing about how much or how fast anyone drinks.
  const best = session.log.find((l) => l.kind === 'moment' && l.caption === BEST_MOMENT);
  const recordBest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const res = await capture('video');
    if (res.ok) {
      if (best) remove(best.id);
      add('moment', { uri: res.media.uri, mediaType: 'video', caption: BEST_MOMENT });
      say('Best moment saved ⭐');
    } else if (res.reason === 'denied') {
      say('Camera is off for DrunkVA. Turn it on in Settings.');
    } else if (res.reason === 'error') {
      say("The camera didn't open. Try again.");
    }
  };

  const shareOne = async (id: string, uri: string, type: 'photo' | 'video') => {
    setSharing(id);
    const r = await shareMoment({ uri, type }, { userId: auth?.user.id, sessionId: session.id });
    setSharing(null);
    say(r === 'uploaded' ? 'Shared with your friends' : r === 'shared' ? 'Shared' : "Couldn't share that one");
  };

  const shareInvite = async () => {
    try {
      await Share.share({ message: 'Join my night on DrunkVA 🍹 drunkva://join/demo' });
    } catch {
      // Sharing is unavailable on some platforms; nothing to do.
    }
  };

  const directions = () => {
    if (!next) return;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${next.lat},${next.lng}&travelmode=${nextRide ? 'driving' : 'walking'}`).catch(() => {});
  };

  const entries = session.log.filter((l) => !(l.kind === 'moment' && l.questId));
  const shown = open.all ? entries : entries.slice(0, 4);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 170 }} showsVerticalScrollIndicator={false}>
        <Header />

        <View style={styles.timerBlock}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.kicker}>{session.mode === 'experience' ? `LIVE · ${exp?.title.toUpperCase() ?? ''}` : 'LIVE · FREESTYLE'}</Text>
          </View>
          <Display style={{ fontFamily: fonts.display, fontSize: 58, lineHeight: 60 }}>{formatElapsed(now - session.startedAt)}</Display>
          <View style={styles.pills}>
            <Pill icon="glass-mug-variant" value={drinks} label="drinks" color={colors.primary} />
            <Pill icon="cup-water" value={water} label="water" color={colors.blue} />
            <Pill icon="camera" value={moments.length} label="moments" color={colors.pink} />
          </View>
        </View>

        {session.mode === 'experience' && exp ? (
          <View style={styles.stopCard}>
            <Poster gradient={cover?.gradient ?? exp.gradient} emoji={here?.emoji ?? exp.emoji} image={cover?.image as never} height={150}>
              <View style={styles.stopOverlay}>
                <Text style={styles.stopKicker}>
                  STOP {session.stop + 1} OF {stops.length}
                </Text>
                <Text style={styles.stopName} numberOfLines={2}>
                  {stops[session.stop]}
                </Text>
              </View>
            </Poster>
            <View style={styles.dots}>
              {stops.map((_, i) => (
                <View key={i} style={[styles.dot, i <= session.stop && { backgroundColor: colors.primary }]} />
              ))}
            </View>
            {session.stop < stops.length - 1 ? (
              <View style={styles.nextRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextLabel}>UP NEXT</Text>
                  <Text style={styles.nextName} numberOfLines={1}>
                    {stops[session.stop + 1]}
                  </Text>
                  {next ? (
                    <Text style={styles.meta}>
                      {nextRide ? rideMinutes(nextLeg) : walkMinutes(nextLeg)} min {nextRide ? 'ride' : 'walk'} · {formatDistance(nextLeg)}
                    </Text>
                  ) : null}
                </View>
                {next ? (
                  <Pressable style={styles.roundBtn} onPress={directions} accessibilityLabel="Directions">
                    <Ionicons name="navigate" size={20} color={colors.text} />
                  </Pressable>
                ) : null}
                <Button label="Next stop" icon="arrow-forward" onPress={() => nextStop(stops.length)} style={{ flex: 0, flexShrink: 0, minWidth: 124, paddingVertical: 12 }} />
              </View>
            ) : (
              <Text style={[styles.meta, { padding: space.lg }]}>Last stop. Make it a good one.</Text>
            )}
          </View>
        ) : null}

        {/* One quiet line for pace and spend, with a water button only when it is useful. */}
        <View style={styles.paceLine}>
          <View style={styles.paceTrack}>
            <View style={[styles.paceFill, { width: `${Math.round(hydration * 100)}%`, backgroundColor: hydration >= 1 ? colors.green : needsWater ? colors.yellow : colors.blue }]} />
          </View>
          <View style={styles.paceText}>
            <Text style={[styles.meta, { flex: 1 }]} numberOfLines={1}>
              {drinks === 0
                ? 'Tap an icon below to log a drink, water or food.'
                : `${needsWater ? 'Water would help. ' : 'Nicely balanced. '}Last drink ${sinceLast === 0 ? 'just now' : `${sinceLast} min ago`}${priced > 0 ? ` · $${spent % 1 === 0 ? spent : spent.toFixed(2)}` : ''}`}
            </Text>
            {needsWater ? (
              <Pressable style={styles.waterChip} onPress={() => log('water', undefined, false)}>
                <MaterialCommunityIcons name="cup-water" size={16} color={colors.blue} />
                <Text style={styles.waterChipText}>Log water</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {usuals.length > 0 ? (
          <View style={{ marginTop: space.md }}>
            <Text style={[styles.label, { paddingHorizontal: space.lg }]}>ANOTHER ONE?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: 8, marginTop: 6 }}>
              {usuals.map((u) => {
                const m = drinkMeta(u.kind as never);
                return (
                  <Pressable key={`${u.kind}${u.item}${u.size}`} style={[styles.usual, { borderColor: m.color }]} onPress={() => log(u.kind, { item: u.item, size: u.size, price: u.price }, false)}>
                    <MaterialCommunityIcons name={m.icon} size={18} color={m.color} />
                    <Text style={styles.usualText}>
                      {u.item}
                      {u.size ? ` · ${u.size}` : ''}
                    </Text>
                    <Ionicons name="add-circle" size={18} color={m.color} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* Side quests: one line. The settings only open when asked for. */}
        <Pressable style={styles.row} onPress={() => setOpen((o) => ({ ...o, quests: !o.quests }))}>
          <MaterialCommunityIcons name="bullseye-arrow" size={22} color={colors.yellow} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Side quests {quests.paused ? 'paused' : 'on'}</Text>
            <Text style={styles.meta}>{questsDone} done · surprises pop up as you go</Text>
          </View>
          <Ionicons name={open.quests ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
        </Pressable>
        {open.quests ? (
          <View style={styles.rowBody}>
            <View style={styles.chipRow}>
              <Pressable style={styles.chip} onPress={() => quests.setPaused(!quests.paused)}>
                <Text style={styles.chipText}>{quests.paused ? 'Resume' : 'Pause'}</Text>
              </Pressable>
              <Pressable style={styles.chip} onPress={() => quests.setSolo(!quests.solo)}>
                <Text style={styles.chipText}>{quests.solo ? 'Playing solo' : 'With friends'}</Text>
              </Pressable>
              {!quests.adult ? (
                <Pressable
                  style={styles.chip}
                  onPress={() =>
                    ask('Adults-only quests', 'Cheeky, flirty and bar-wise dares for adults. They never involve how much you drink, and you can skip any of them. Are you 19 or over?', "I'm 19+", quests.confirmAdult)
                  }
                >
                  <Text style={styles.chipText}>Unlock 19+ quests</Text>
                </Pressable>
              ) : null}
              {__DEV__ ? (
                <Pressable style={styles.chip} onPress={quests.triggerNow}>
                  <Text style={styles.chipText}>Try one now</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <Pressable style={styles.bestCard} onPress={recordBest}>
          <View style={styles.bestIcon}>
            <Ionicons name={best ? 'checkmark' : 'videocam'} size={22} color="#0B0B0D" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.bestTitle}>{best ? 'Best moment saved ⭐' : 'Record your best moment'}</Text>
            <Text style={styles.bestSub}>{best ? 'Tap to record a better one. It replaces this.' : 'A dance move, a toast, a karaoke line. One short video, your pick.'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
        </Pressable>

        {moments.length > 0 ? (
          <>
            <SectionTitle title="Moments" right={`${moments.length}`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.sm }}>
              {moments.map((m) => (
                <View key={m.id} style={styles.thumb}>
                  {m.mediaType === 'video' ? (
                    <View style={styles.thumbVideo}>
                      <Ionicons name="videocam" size={26} color="#fff" />
                    </View>
                  ) : (
                    <Image source={{ uri: m.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  )}
                  {m.questId ? <Text style={styles.thumbBadge}>🎯</Text> : null}
                  {m.caption === BEST_MOMENT ? <Text style={styles.thumbBadge}>⭐</Text> : null}
                  <Pressable style={styles.thumbShare} onPress={() => m.uri && shareOne(m.id, m.uri, m.mediaType ?? 'photo')} hitSlop={6}>
                    <Ionicons name={sharing === m.id ? 'hourglass' : 'share-outline'} size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        <SectionTitle title="Tonight so far" right={entries.length > 4 ? `${entries.length}` : undefined} />
        {entries.length === 0 && quests.results.length === 0 ? (
          <Text style={[styles.meta, { paddingHorizontal: space.lg }]}>Nothing yet.</Text>
        ) : (
          <>
            {shown.map((l) => {
              const meta = dockMeta(l.kind);
              const sub = [l.size, l.price !== undefined ? (l.price === 0 ? 'Free' : `$${l.price}`) : '', l.note].filter(Boolean).join(' · ');
              return (
                <Pressable key={l.id} style={styles.logRow} onPress={() => { if (meta) { setFresh(false); setEditing(l.id); } }} disabled={!meta}>
                  {meta ? <MaterialCommunityIcons name={meta.icon} size={22} color={meta.color} /> : <MaterialCommunityIcons name="camera" size={22} color={colors.pink} />}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logName, { flex: 0 }]}>
                      {l.kind === 'moment' ? (l.mediaType === 'video' ? 'Video' : 'Moment') : l.item ?? meta?.label ?? l.kind}
                      {l.item && meta ? <Text style={styles.logKind}>{`  ${meta.label}`}</Text> : null}
                    </Text>
                    {sub ? (
                      <Text style={styles.meta} numberOfLines={1}>
                        {sub}
                      </Text>
                    ) : null}
                  </View>
                  {l.rating ? <Text style={styles.stars}>{'★'.repeat(l.rating)}</Text> : null}
                  <Text style={styles.meta}>{formatElapsed(l.at - session.startedAt)}</Text>
                </Pressable>
              );
            })}
            {open.all
              ? quests.results.map((r) => (
                  <View key={`${r.quest.id}-${r.at}`} style={styles.logRow}>
                    <MaterialCommunityIcons name="target" size={22} color={r.status === 'done' ? colors.yellow : colors.textFaint} />
                    <Text style={[styles.logName, r.status !== 'done' && { color: colors.textFaint }]} numberOfLines={2}>
                      {r.status === 'done' ? 'Quest done: ' : r.status === 'skipped' ? 'Skipped: ' : 'Missed: '}
                      {r.quest.text}
                    </Text>
                  </View>
                ))
              : null}
            {entries.length > 4 || quests.results.length > 0 ? (
              <Pressable onPress={() => setOpen((o) => ({ ...o, all: !o.all }))} style={{ paddingHorizontal: space.lg, paddingVertical: 8 }}>
                <Text style={styles.moreLink}>{open.all ? 'Show less' : `Show all${quests.results.length ? ' and quests' : ''}`}</Text>
              </Pressable>
            ) : null}
          </>
        )}

        {/* Friends and invites are tucked away until you want them. */}
        <Pressable style={[styles.row, { marginTop: space.lg }]} onPress={() => setOpen((o) => ({ ...o, friends: !o.friends }))}>
          <Ionicons name="people" size={22} color={colors.textDim} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>Friends and invites</Text>
            <Text style={styles.meta}>
              {policies.find((p) => p.value === session.joinPolicy)!.label}
              {joinRequests.length ? ` · ${joinRequests.length} asking to join` : ''}
            </Text>
          </View>
          <Ionicons name={open.friends ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textDim} />
        </Pressable>
        {open.friends ? (
          <View style={styles.rowBody}>
            <TextTabs
              items={policies.map((p) => p.label)}
              active={policies.find((p) => p.value === session.joinPolicy)!.label}
              onChange={(label) => setJoinPolicy(policies.find((p) => p.label === label)!.value)}
            />
            <Text style={[styles.meta, { marginTop: space.sm }]}>{policyHint[session.joinPolicy]}</Text>
            {session.joinPolicy !== 'closed' ? (
              <View style={{ marginTop: space.md }}>
                <Button label="Share invite link" icon="share-outline" variant="ghost" onPress={shareInvite} />
              </View>
            ) : null}
            {session.joinPolicy === 'invite'
              ? joinRequests.map((r) => (
                  <View key={r.id} style={[styles.logRow, { paddingHorizontal: 0 }]}>
                    <Avatar name={r.name} color={r.color} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logName}>{r.name}</Text>
                      <Text style={styles.meta}>wants to join your night</Text>
                    </View>
                    <Button label="Let in" onPress={() => resolveJoinRequest(r.id, true)} style={styles.small} />
                    <Button label="No" variant="ghost" onPress={() => resolveJoinRequest(r.id, false)} style={styles.small} />
                  </View>
                ))
              : null}
          </View>
        ) : null}

        <View style={{ paddingHorizontal: space.lg, marginTop: space.xl, gap: space.sm }}>
          <Button
            label="End night"
            icon="stop-circle"
            variant="ghost"
            onPress={() => {
              end();
              router.navigate('/recap');
            }}
          />
          <Button label="Get a safe ride home" icon="car" variant="ghost" />
        </View>
      </ScrollView>

      {toast ? (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast.text}</Text>
          {toast.undo ? (
            <Pressable
              onPress={() => {
                toast.undo?.();
                setToast(null);
              }}
              hitSlop={8}
            >
              <Text style={styles.toastUndo}>Undo</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {editingEntry && editingEntry.kind !== 'moment' ? (
        <LogSheet
          key={editingEntry.id}
          entry={editingEntry}
          number={editingNumber}
          fresh={fresh}
          onSave={(patch) => {
            update(editingEntry.id, patch);
            closeSheet(true);
          }}
          onDelete={() => {
            remove(editingEntry.id);
            setEditing(null);
          }}
          onClose={() => closeSheet(false)}
        />
      ) : null}

      <View style={styles.dock}>
        {DOCK.slice(0, 3).map((d) => (
          <DockButton key={d.kind} d={d} n={count([d.kind])} onPress={() => log(d.kind)} />
        ))}
        <Pressable style={styles.camera} onPress={snap} accessibilityLabel="Capture a moment">
          <Ionicons name="camera" size={30} color="#0B0B0D" />
        </Pressable>
        {DOCK.slice(3).map((d) => (
          <DockButton key={d.kind} d={d} n={count([d.kind])} onPress={() => log(d.kind)} />
        ))}
      </View>
    </View>
  );
}

function Pill({ icon, value, label, color }: { icon: IconName; value: number; label: string; color: string }) {
  return (
    <View style={styles.pill}>
      <MaterialCommunityIcons name={icon} size={16} color={color} />
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function DockButton({ d, n, onPress }: { d: (typeof DOCK)[number]; n: number; onPress: () => void }) {
  // A little pop on every tap, and the count badge bounces, so each log feels like it landed.
  const pop = useSharedValue(1);
  const bump = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const bumpStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));
  const press = () => {
    pop.set(withSequence(withSpring(1.3, { damping: 5, stiffness: 400 }), withSpring(1, { damping: 8 })));
    bump.set(withSequence(withSpring(1.5, { damping: 4, stiffness: 500 }), withSpring(1, { damping: 8 })));
    onPress();
  };
  return (
    <Pressable style={styles.dockItem} onPress={press} accessibilityLabel={`Log ${d.label}`}>
      <Animated.View style={[styles.dockCircle, { backgroundColor: d.color + '26', borderColor: d.color }, popStyle]}>
        <MaterialCommunityIcons name={d.icon} size={24} color={d.color} />
        {n > 0 ? (
          <Animated.View style={[styles.count, { backgroundColor: d.color }, bumpStyle]}>
            <Text style={styles.countText}>{n}</Text>
          </Animated.View>
        ) : null}
      </Animated.View>
      <Text style={styles.dockLabel}>{d.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bestCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.lg, padding: space.md, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: 'rgba(255,92,0,0.35)' },
  bestIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  bestTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  bestSub: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  kicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  meta: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
  teaser: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, marginTop: space.sm },
  goLive: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.primary, padding: space.lg, borderRadius: 6 },
  goTitle: { color: '#0B0B0D', fontFamily: fonts.display, fontSize: 32, letterSpacing: -1 },
  goSub: { color: '#0B0B0D', fontFamily: fonts.bodyMedium, fontSize: 13 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  planTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 19, letterSpacing: -0.4 },
  timerBlock: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pink },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.surface, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  pillValue: { color: colors.text, fontFamily: fonts.display, fontSize: 15 },
  pillLabel: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12 },
  stopCard: { marginTop: space.lg, backgroundColor: colors.surface },
  stopOverlay: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.md, gap: 2 },
  stopKicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  stopName: { color: '#fff', fontFamily: fonts.display, fontSize: 26, lineHeight: 28, letterSpacing: -0.6 },
  dots: { flexDirection: 'row', gap: 6, paddingHorizontal: space.lg, paddingTop: space.md },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  nextLabel: { color: colors.textFaint, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5 },
  nextName: { color: colors.text, fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line },
  freestyleCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.lg, padding: space.lg, backgroundColor: colors.surface, borderRadius: 14 },
  label: { color: colors.textFaint, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5 },
  usual: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 99, borderWidth: 1.5, backgroundColor: colors.surface },
  usualText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  pace: { marginHorizontal: space.lg, marginTop: space.lg, padding: space.md, borderRadius: 14, backgroundColor: colors.surface, gap: 8 },
  paceTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paceTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3 },
  paceTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  paceFill: { height: 6, borderRadius: 3 },
  spend: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13 },
  logKind: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 12 },
  addDetails: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 12 },
  stars: { color: colors.yellow, fontSize: 12, letterSpacing: 1 },
  paceLine: { marginHorizontal: space.lg, marginTop: space.lg, gap: 8 },
  paceText: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(45,156,255,0.14)' },
  waterChipText: { color: colors.blue, fontFamily: fonts.bodyBold, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginHorizontal: space.lg, marginTop: space.md, paddingVertical: 12, paddingHorizontal: space.md, borderRadius: 12, backgroundColor: colors.surface },
  rowTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 15, letterSpacing: -0.3 },
  rowBody: { marginHorizontal: space.lg, marginTop: 4, padding: space.md, borderRadius: 12, backgroundColor: colors.surface, gap: 4 },
  moreLink: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 12 },
  waterTip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: 12, backgroundColor: 'rgba(45,156,255,0.12)' },
  waterText: { color: colors.blue, fontFamily: fonts.bodyBold, fontSize: 13 },
  questBar: { marginHorizontal: space.lg, marginTop: space.lg, padding: space.md, borderRadius: 14, backgroundColor: 'rgba(255,214,10,0.08)', borderWidth: 1, borderColor: 'rgba(255,214,10,0.25)', gap: space.sm },
  questTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 16, letterSpacing: -0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: colors.line },
  chipText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 12 },
  thumb: { width: 92, height: 92, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.surface },
  thumbVideo: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2A30' },
  thumbBadge: { position: 'absolute', left: 6, top: 4, fontSize: 14 },
  thumbShare: { position: 'absolute', right: 5, bottom: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 8 },
  small: { flex: 0, flexShrink: 0, minWidth: 64, paddingHorizontal: 12, paddingVertical: 8 },
  logName: { flex: 1, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 14 },
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: 124,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7F5F2',
    borderRadius: 12,
    paddingHorizontal: space.md,
    paddingVertical: 12,
  },
  toastText: { flex: 1, color: '#0B0B0D', fontFamily: fonts.bodyBold, fontSize: 14 },
  toastUndo: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 14, marginLeft: space.md },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: space.sm,
    paddingBottom: 24,
    backgroundColor: 'rgba(11,11,13,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  dockItem: { alignItems: 'center', gap: 3, width: 48 },
  dockCircle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  dockLabel: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 10 },
  count: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countText: { color: '#0B0B0D', fontFamily: fonts.bodyBold, fontSize: 10 },
  camera: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
});
