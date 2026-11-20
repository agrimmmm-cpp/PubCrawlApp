import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { JoinPolicy } from '@/data/mock';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export type LogKind = 'beer' | 'cocktail' | 'shot' | 'wine' | 'water' | 'food' | 'moment';

export type LogEntry = {
  id: string;
  kind: LogKind;
  at: number;
  stop?: number;
  // A captured moment: where the photo or video is on the phone, and the side quest it answered (if any).
  uri?: string;
  mediaType?: 'photo' | 'video';
  questId?: string;
  caption?: string;
  // What a drink or snack was, filled in by the person after logging (all optional, all private).
  item?: string;
  size?: string;
  price?: number; // CAD
  rating?: number; // 1 to 5
  note?: string;
  dbId?: string; // the drink_logs row, so edits and Undo reach the database
};
export type LogExtra = Pick<LogEntry, 'uri' | 'mediaType' | 'questId' | 'caption' | 'item' | 'size' | 'price' | 'rating' | 'note'>;

export type LiveSession = {
  id?: string; // night_sessions row id, set once saved to Supabase
  mode: 'freestyle' | 'experience';
  experienceId?: string;
  startedAt: number;
  stop: number; // 0-based index into the experience route
  joinPolicy: JoinPolicy; // who may join this night
  log: LogEntry[];
};

export type FinishedNight = LiveSession & { endedAt: number };

type LiveContextValue = {
  session: LiveSession | null;
  /** The night that just ended, kept so the recap screen can show it. */
  finished: FinishedNight | null;
  dismissFinished: () => void;
  /** True right after start() so the Live tab can play the Go Live animation once. */
  burst: boolean;
  clearBurst: () => void;
  start: (mode: LiveSession['mode'], experienceId?: string) => void;
  end: () => void;
  add: (kind: LogKind, extra?: LogExtra) => string | undefined;
  /** Remove one log entry, for Undo. */
  remove: (id: string) => void;
  /** Change the details of one entry: what it was, size, price, rating, note. */
  update: (id: string, patch: LogExtra) => void;
  nextStop: (max: number) => void;
  setJoinPolicy: (policy: JoinPolicy) => void;
};

const LiveContext = createContext<LiveContextValue | null>(null);

const isUuid = (v?: string) => !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export function LiveProvider({ children }: { children: ReactNode }) {
  const { session: auth } = useAuth();
  const userId = supabaseConfigured ? auth?.user.id : undefined;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [burst, setBurst] = useState(false);
  const [finished, setFinished] = useState<FinishedNight | null>(null);
  const dismissFinished = useCallback(() => setFinished(null), []);
  const clearBurst = useCallback(() => setBurst(false), []);

  // Latest session for callbacks that persist to Supabase.
  const ref = useRef<LiveSession | null>(null);
  useEffect(() => {
    ref.current = session;
  }, [session]);

  const start = useCallback(
    (mode: LiveSession['mode'], experienceId?: string) => {
      setSession({ mode, experienceId, startedAt: Date.now(), stop: 0, joinPolicy: 'friends', log: [] });
      setBurst(true);
      if (!userId) return;
      supabase
        .from('night_sessions')
        .insert({ owner_id: userId, experience_id: isUuid(experienceId) ? experienceId : null, join_policy: 'friends' })
        .select('id')
        .single()
        .then(({ data }) => {
          if (data) setSession((s) => (s ? { ...s, id: data.id } : s));
        });
    },
    [userId],
  );

  const end = useCallback(() => {
    const cur = ref.current;
    if (cur?.id) supabase.from('night_sessions').update({ ended_at: new Date().toISOString() }).eq('id', cur.id).then();
    if (cur) setFinished({ ...cur, endedAt: Date.now() });
    setSession(null);
    setBurst(false);
  }, []);

  const add = useCallback(
    (kind: LogKind, extra?: LogExtra) => {
      const s = ref.current;
      if (!s) return undefined;
      const id = `${Date.now()}-${s.log.length}`;
      // Drinks, water and food go to the (private) drink log; moments live on the phone until shared.
      if (s.id && userId && kind !== 'moment') {
        supabase
          .from('drink_logs')
          .insert({ session_id: s.id, user_id: userId, kind, stop: s.stop })
          .select('id')
          .single()
          .then(({ data }) => {
            if (data) setSession((cur) => (cur ? { ...cur, log: cur.log.map((l) => (l.id === id ? { ...l, dbId: data.id } : l)) } : cur));
          });
      }
      setSession((cur) => (cur ? { ...cur, log: [{ id, kind, at: Date.now(), stop: cur.stop, ...extra }, ...cur.log] } : cur));
      return id;
    },
    [userId],
  );

  const remove = useCallback((id: string) => {
    const dbId = ref.current?.log.find((l) => l.id === id)?.dbId;
    if (dbId) supabase.from('drink_logs').delete().eq('id', dbId).then();
    setSession((cur) => (cur ? { ...cur, log: cur.log.filter((l) => l.id !== id) } : cur));
  }, []);

  const update = useCallback((id: string, patch: LogExtra) => {
    const dbId = ref.current?.log.find((l) => l.id === id)?.dbId;
    // The extra columns arrive with migration 013; before it runs this update simply fails and the details stay on the phone.
    if (dbId) {
      supabase
        .from('drink_logs')
        .update({ item: patch.item ?? null, size: patch.size ?? null, price_cad: patch.price ?? null, rating: patch.rating ?? null, note: patch.note ?? null })
        .eq('id', dbId)
        .then();
    }
    setSession((cur) => (cur ? { ...cur, log: cur.log.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : cur));
  }, []);

  const nextStop = useCallback((max: number) => {
    const s = ref.current;
    if (!s) return;
    const stop = Math.min(s.stop + 1, max - 1);
    if (s.id) supabase.from('night_sessions').update({ current_stop: stop + 1 }).eq('id', s.id).then();
    setSession((cur) => (cur ? { ...cur, stop } : cur));
  }, []);

  const setJoinPolicy = useCallback((joinPolicy: JoinPolicy) => {
    const id = ref.current?.id;
    if (id) supabase.from('night_sessions').update({ join_policy: joinPolicy }).eq('id', id).then();
    setSession((cur) => (cur ? { ...cur, joinPolicy } : cur));
  }, []);

  const value = useMemo(
    () => ({ session, finished, dismissFinished, burst, clearBurst, start, end, add, remove, update, nextStop, setJoinPolicy }),
    [session, finished, dismissFinished, burst, clearBurst, start, end, add, remove, update, nextStop, setJoinPolicy],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error('useLive must be used inside LiveProvider');
  return ctx;
}

export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
