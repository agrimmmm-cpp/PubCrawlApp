import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, space } from '@/constants/theme';
import { CATEGORY_LABEL, LEVEL_LABEL, LEVEL_POINTS, Quest } from '@/data/quests';
import { capture, Captured } from '@/lib/media';
import { useQuests } from '@/lib/quests';

const LEVEL_COLOR = { 1: colors.green, 2: colors.yellow, 3: colors.pink } as const;

/**
 * The big card a side quest arrives on. Shown over whatever screen the person is on. A photo or video is optional:
 * "Mark done" works without one, and "Skip" never costs anything.
 */
export function QuestCard() {
  const { active } = useQuests();
  // Keyed by the quest, so a new quest always starts with a clean card (no leftover photo or message).
  return active ? <Card key={active.quest.id} quest={active.quest} expiresAt={active.expiresAt} /> : null;
}

function Card({ quest, expiresAt }: { quest: Quest; expiresAt: number }) {
  const { complete, skip, later } = useQuests();
  const [shot, setShot] = useState<Captured | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  // A timed quest has its own clock, started by the person when everyone is ready.
  const [clockEnds, setClockEnds] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = Math.max(0, Math.ceil((expiresAt - nowMs) / 1000));
  const clockLeft = clockEnds === null ? null : Math.max(0, Math.ceil((clockEnds - nowMs) / 1000));
  const clockDone = clockLeft === 0;

  // Buzz once when the clock hits zero. A ref, not state, so it never causes an extra render.
  const buzzed = useRef(false);
  useEffect(() => {
    if (clockDone && !buzzed.current) {
      buzzed.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [clockDone]);
  const cat = CATEGORY_LABEL[quest.cat];
  const wantsMedia = quest.media !== 'none';
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  const shoot = async () => {
    setNote(null);
    const res = await capture(quest.media === 'none' ? 'photo' : quest.media);
    if (res.ok) setShot(res.media);
    else if (res.reason === 'denied') setNote('Camera is off for DrunkVA. You can still mark it done, or turn the camera on in Settings.');
    else if (res.reason === 'error') setNote("The camera didn't open. You can still mark it done.");
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={later} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <LinearGradient colors={['#3A0F5C', '#FF5C00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <ScrollView contentContainerStyle={{ gap: space.md }} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.top}>
            <Text style={styles.kicker}>
              {cat.emoji} {cat.stamp}
            </Text>
            <Text style={styles.timer}>{mmss}</Text>
          </View>

          <View style={styles.pills}>
            <Text style={[styles.pill, { color: LEVEL_COLOR[quest.level] }]}>
              {LEVEL_LABEL[quest.level]} · +{LEVEL_POINTS[quest.level]} chaos
            </Text>
            {wantsMedia ? (
              <Text style={styles.pill}>{quest.media === 'video' ? '🎥 Video' : quest.media === 'photo' ? '📸 Photo' : '📸 Photo or video'}</Text>
            ) : null}
          </View>

          <Text style={[styles.text, quest.text.length > 95 && { fontSize: 24, lineHeight: 28 }]}>{quest.text}</Text>

          {quest.seconds ? (
            clockEnds === null ? (
              <Pressable style={styles.clockBtn} onPress={() => setClockEnds(Date.now() + quest.seconds! * 1000)}>
                <Ionicons name="timer" size={24} color="#fff" />
                <Text style={styles.clockBtnText}>Start the {quest.seconds}s clock</Text>
              </Pressable>
            ) : (
              <View style={styles.clockBox}>
                <Text style={styles.clockNum}>{clockDone ? "Time's up!" : clockLeft}</Text>
              </View>
            )
          ) : null}

          {shot ? (
            <View style={styles.preview}>
              {shot.type === 'photo' ? (
                <Image source={{ uri: shot.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <View style={styles.videoTile}>
                  <Ionicons name="videocam" size={40} color="#fff" />
                  <Text style={styles.videoText}>Video saved</Text>
                </View>
              )}
            </View>
          ) : null}

          {note ? <Text style={styles.note}>{note}</Text> : null}

          <View style={styles.actions}>
            {shot ? (
              <>
                <Pressable style={styles.primary} onPress={() => complete(shot)}>
                  <Ionicons name="checkmark-circle" size={22} color="#0B0B0D" />
                  <Text style={styles.primaryText}>Done</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={shoot}>
                  <Text style={styles.secondaryText}>Retake</Text>
                </Pressable>
              </>
            ) : wantsMedia ? (
              <>
                <Pressable style={styles.primary} onPress={shoot}>
                  <Ionicons name="camera" size={22} color="#0B0B0D" />
                  <Text style={styles.primaryText}>Do it</Text>
                </Pressable>
                <Pressable style={styles.secondary} onPress={() => complete()}>
                  <Text style={styles.secondaryText}>Done, no photo</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.primary} onPress={() => complete()}>
                <Ionicons name="checkmark-circle" size={22} color="#0B0B0D" />
                <Text style={styles.primaryText}>Done</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.bottom}>
            <Pressable onPress={later} hitSlop={10}>
              <Text style={styles.link}>Later (10 min)</Text>
            </Pressable>
            <Pressable onPress={skip} hitSlop={10}>
              <Text style={styles.link}>Skip</Text>
            </Pressable>
          </View>
          <Text style={styles.fine}>
            {quest.cat === 'flirt' || quest.cat === 'stranger'
              ? 'Respect every no: if someone is not into it, smile and move on. Only film or photograph people who say yes.'
              : 'Only film or photograph people who say yes. Skip anything you are not comfortable with.'}
          </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end', padding: space.md },
  card: { borderRadius: 22, overflow: 'hidden', padding: space.lg, maxHeight: '94%' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 2 },
  timer: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.display, fontSize: 18 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    color: '#fff',
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    overflow: 'hidden',
  },
  text: { color: '#fff', fontFamily: fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  preview: { height: 180, borderRadius: 14, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.35)' },
  videoTile: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  videoText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 14 },
  clockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.4)', paddingVertical: 14, borderRadius: 14 },
  clockBtnText: { color: '#fff', fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.3 },
  clockBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 14, paddingVertical: 10 },
  clockNum: { color: '#fff', fontFamily: fonts.display, fontSize: 56, lineHeight: 62, letterSpacing: -2 },
  note: { color: '#fff', fontFamily: fonts.bodyMedium, fontSize: 13, backgroundColor: 'rgba(0,0,0,0.35)', padding: space.sm, borderRadius: 10, overflow: 'hidden' },
  actions: { gap: space.sm },
  primary: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 16, borderRadius: 14 },
  primaryText: { color: '#0B0B0D', fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.4 },
  secondary: { alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)' },
  secondaryText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 15 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: 'rgba(255,255,255,0.9)', fontFamily: fonts.bodyBold, fontSize: 14 },
  fine: { color: 'rgba(255,255,255,0.65)', fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
});
