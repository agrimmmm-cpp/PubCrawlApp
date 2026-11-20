import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { Quest, QUESTS, WATER_BREAK } from '@/data/quests';
import { useExperience } from '@/lib/experiences';
import { useAuth } from '@/lib/auth';
import { LogEntry, useLive } from '@/lib/live';
import { supabase, supabaseConfigured } from '@/lib/supabase';

const MIN = 60_000;
const MAX_PER_NIGHT = 6;
const FIRST_DELAY: [number, number] = [15, 40]; // minutes after the night starts
const NEXT_DELAY: [number, number] = [20, 40]; // minutes after the last quest is dealt with
const EXPIRES_IN = 10 * MIN; // a quest that is ignored for this long is quietly missed, with no penalty
const SNOOZE = 10 * MIN;
const STORE = 'drunkva.quests.settings';
const native = Platform.OS !== 'web';

// A quest shows its own big card in the app, so the system banner is only needed when the app is in the background.
if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export type QuestResult = { quest: Quest; status: 'done' | 'skipped' | 'missed'; at: number; uri?: string; mediaType?: 'photo' | 'video' };
type Active = { quest: Quest; expiresAt: number };
type Pending = { quest: Quest; at: number };

type QuestContextValue = {
  /** The quest on screen right now, if any. */
  active: Active | null;
  results: QuestResult[];
  /** How many quests have been dealt this night (snoozed ones are not counted twice). */
  dealt: number;
  max: number;
  paused: boolean;
  setPaused: (v: boolean) => void;
  solo: boolean;
  setSolo: (v: boolean) => void;
  /** True once the person has confirmed they are 19 or over; the adults-only quests stay off until then. */
  adult: boolean;
  confirmAdult: () => void;
  complete: (media?: { uri: string; type: 'photo' | 'video' }) => void;
  skip: () => void;
  later: () => void;
  /** Deal a quest right now. For trying it out. */
  triggerNow: () => void;
};

const QuestContext = createContext<QuestContextValue | null>(null);

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const DRINKS = ['beer', 'cocktail', 'shot', 'wine'];

export function QuestProvider({ children }: { children: ReactNode }) {
  const { session, add } = useLive();
  const { session: auth } = useAuth();
  const userId = supabaseConfigured ? auth?.user.id : undefined;
  const { experience: exp } = useExperience(session?.experienceId);

  const [paused, setPausedState] = useState(false);
  const [solo, setSoloState] = useState(false);
  const [adult, setAdult] = useState(false);
  const [active, setActive] = useState<Active | null>(null);
  const [results, setResults] = useState<QuestResult[]>([]);
  const [dealt, setDealt] = useState(0);

  // Everything the timers need, kept in a ref so the 1-second tick never works from stale state.
  const s = useRef({
    pending: null as Pending | null,
    active: null as Active | null,
    used: new Set<string>(),
    dealt: 0,
    lastCat: '',
    lastWaterBreak: 0,
    notificationId: null as string | null,
    paused: false,
    solo: false,
    adult: false,
  });
  const live = useRef({ session, exp });
  useEffect(() => {
    live.current = { session, exp };
  }, [session, exp]);

  useEffect(() => {
    AsyncStorage.getItem(STORE)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw) as { adult?: boolean; solo?: boolean };
        s.current.adult = !!v.adult;
        s.current.solo = !!v.solo;
        setAdult(!!v.adult);
        setSoloState(!!v.solo);
      })
      .catch(() => {});
  }, []);
  const save = () => AsyncStorage.setItem(STORE, JSON.stringify({ adult: s.current.adult, solo: s.current.solo })).catch(() => {});

  const cancelNotification = useCallback(() => {
    const id = s.current.notificationId;
    s.current.notificationId = null;
    if (id && native) Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }, []);

  /** What kind of stop the group is at, to match place-specific quests. */
  const stopKind = () => {
    const place = live.current.exp?.stopPlaces?.[live.current.session?.stop ?? 0];
    if (!place) return 'any';
    return place.category === 'bar' || place.category === 'nightclub' ? 'bar' : place.category === 'food' ? 'food' : place.category === 'viewpoint' ? 'view' : 'activity';
  };

  const pick = (): Quest | null => {
    const elapsed = (Date.now() - (live.current.session?.startedAt ?? Date.now())) / MIN;
    const here = stopKind();
    const weight = (q: Quest) => {
      // Bolder quests come later in the night by the clock, never because of how much anyone has drunk.
      const level = q.level === 1 ? 1 : q.level === 2 ? (elapsed > 45 ? 1 : 0.5) : elapsed > 60 ? 0.9 : 0;
      if (!level) return 0;
      return level * (q.place === here ? 2 : 1) * (q.cat === s.current.lastCat ? 0.4 : 1);
    };
    const pool = QUESTS.filter(
      (q) => !s.current.used.has(q.id) && (s.current.adult || !q.drink) && (!s.current.solo || q.group === 'any') && (q.place === 'any' || q.place === here),
    );
    const weights = pool.map(weight);
    const total = weights.reduce((a, b) => a + b, 0);
    if (!total) return null;
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };

  /** Line up the next quest after `delayMs`, and a system notification for it for when the app is in the background. */
  const schedule = useCallback(
    (delayMs: number, quest?: Quest | null) => {
      cancelNotification();
      s.current.pending = null;
      if (s.current.paused || s.current.dealt >= MAX_PER_NIGHT || !live.current.session) return;
      const at = Date.now() + delayMs;
      const hour = new Date(at).getHours() + new Date(at).getMinutes() / 60;
      if (hour >= 2.5 && hour < 6) return; // quiet hours
      const q = quest ?? pick();
      if (!q) return;
      s.current.pending = { quest: q, at };
      if (native) {
        Notifications.scheduleNotificationAsync({
          content: { title: '🎯 Side quest!', body: q.text, data: { questId: q.id } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
        })
          .then((id) => {
            if (s.current.pending?.quest.id === q.id) s.current.notificationId = id;
            else Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
          })
          .catch(() => {});
      }
    },
    [cancelNotification],
  );

  const resolve = useCallback(
    (status: QuestResult['status'], media?: { uri: string; type: 'photo' | 'video' }) => {
      const a = s.current.active;
      if (!a) return;
      s.current.active = null;
      setActive(null);
      setResults((r) => [{ quest: a.quest, status, at: Date.now(), uri: media?.uri, mediaType: media?.type }, ...r]);
      const night = live.current.session?.id;
      if (userId && night && a.quest.id !== WATER_BREAK.id) {
        supabase.from('quest_completions').insert({ session_id: night, user_id: userId, quest_id: a.quest.id, status }).then();
      }
      if (status === 'done') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      schedule(rand(...NEXT_DELAY) * MIN);
    },
    [schedule, userId],
  );

  const complete = useCallback(
    (media?: { uri: string; type: 'photo' | 'video' }) => {
      const a = s.current.active;
      if (a && media) add('moment', { uri: media.uri, mediaType: media.type, questId: a.quest.id, caption: a.quest.text });
      resolve('done', media);
    },
    [add, resolve],
  );

  const skip = useCallback(() => resolve('skipped'), [resolve]);

  const later = useCallback(() => {
    const a = s.current.active;
    if (!a) return;
    s.current.active = null;
    s.current.dealt = Math.max(0, s.current.dealt - 1); // a snoozed quest does not use up the night's allowance
    setDealt(s.current.dealt);
    setActive(null);
    schedule(SNOOZE, a.quest);
  }, [schedule]);

  // A night starts: reset and line up the first quest. A night ends: clear everything and cancel the notification.
  const startedAt = session?.startedAt;
  useEffect(() => {
    s.current.used = new Set();
    s.current.dealt = 0;
    s.current.lastCat = '';
    s.current.lastWaterBreak = 0;
    s.current.active = null;
    setActive(null);
    if (!startedAt) {
      // The night ended: stop everything but keep the results, so the recap can show them until the next night.
      cancelNotification();
      s.current.pending = null;
      return;
    }
    setResults([]);
    setDealt(0);
    if (native) Notifications.requestPermissionsAsync().catch(() => {}); // asks once; quests still show in the app if declined
    schedule(rand(...FIRST_DELAY) * MIN);
    return cancelNotification;
  }, [startedAt, schedule, cancelNotification]);

  // The tick: show a quest when it is due, and let an ignored one lapse.
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => {
      const now = Date.now();
      const cur = s.current;
      if (cur.active) {
        if (now >= cur.active.expiresAt) resolve('missed');
        return;
      }
      if (!cur.pending || now < cur.pending.at) return;
      let quest = cur.pending.quest;
      // If drinks are running well ahead of water, the quest turns into a water break instead.
      const log: LogEntry[] = live.current.session?.log ?? [];
      const drinks = log.filter((l) => DRINKS.includes(l.kind)).length;
      const water = log.filter((l) => l.kind === 'water').length;
      let waterBreak = false;
      if (drinks >= 3 && drinks - water >= 3 && now - cur.lastWaterBreak > 45 * MIN) {
        waterBreak = true;
        cur.lastWaterBreak = now;
        cur.pending = { quest, at: now + 10 * MIN }; // the quest we swapped out comes back later
        quest = WATER_BREAK;
      } else {
        cur.pending = null;
        cur.used.add(quest.id);
        cur.lastCat = quest.cat;
      }
      cancelNotification();
      cur.dealt += 1;
      cur.active = { quest, expiresAt: now + EXPIRES_IN };
      setDealt(cur.dealt);
      setActive(cur.active);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      if (waterBreak && cur.pending) schedule(10 * MIN, cur.pending.quest);
    }, 1000);
    return () => clearInterval(t);
  }, [startedAt, resolve, schedule, cancelNotification]);

  // Tapping the system notification brings the person to the Live tab, where the card is waiting.
  useEffect(() => {
    if (!native) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => router.navigate('/live'));
    return () => sub.remove();
  }, []);

  const setPaused = useCallback(
    (v: boolean) => {
      s.current.paused = v;
      setPausedState(v);
      if (v) {
        cancelNotification();
        s.current.pending = null;
      } else if (!s.current.active) {
        schedule(rand(...NEXT_DELAY) * MIN);
      }
    },
    [schedule, cancelNotification],
  );

  const setSolo = useCallback((v: boolean) => {
    s.current.solo = v;
    setSoloState(v);
    save();
  }, []);

  const confirmAdult = useCallback(() => {
    s.current.adult = true;
    setAdult(true);
    save();
  }, []);

  const triggerNow = useCallback(() => {
    if (s.current.active) return;
    const q = pick();
    if (!q) return;
    s.current.pending = { quest: q, at: Date.now() };
    s.current.dealt = Math.min(s.current.dealt, MAX_PER_NIGHT - 1);
  }, []);

  const value = useMemo<QuestContextValue>(
    () => ({ active, results, dealt, max: MAX_PER_NIGHT, paused, setPaused, solo, setSolo, adult, confirmAdult, complete, skip, later, triggerNow }),
    [active, results, dealt, paused, setPaused, solo, setSolo, adult, confirmAdult, complete, skip, later, triggerNow],
  );
  return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
}

export function useQuests() {
  const ctx = useContext(QuestContext);
  if (!ctx) throw new Error('useQuests must be used inside QuestProvider');
  return ctx;
}
