import { AppState } from 'react-native';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { JoinPolicy, JoinRequest, joinRequests as seedRequests, people as seedPeople, Person, Relation } from '@/data/mock';
import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';

type SocialValue = {
  people: Person[];
  joinRequests: JoinRequest[];
  addFriend: (id: string) => void;
  accept: (id: string) => void;
  decline: (id: string) => void;
  removeFriend: (id: string) => void;
  join: (id: string) => void;
  resolveJoinRequest: (id: string, approve: boolean) => void;
};

const SocialContext = createContext<SocialValue | null>(null);

const PALETTE = ['#FF3D81', '#2D9CFF', '#FFD60A', '#37E08A', '#FF5C00', '#B06CFF'];
const colorFor = (id: string) => PALETTE[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % PALETTE.length];

type FriendshipRow = { requester_id: string; addressee_id: string; status: 'pending' | 'accepted' };
type NightRow = {
  id: string;
  owner_id: string;
  experience_id: string | null;
  current_stop: number | null;
  join_policy: JoinPolicy;
  experiences: { title: string } | null;
};
type PendingRow = { session_id: string; user_id: string; status: string; profiles: { username: string | null } | null };

export function SocialProvider({ children }: { children: ReactNode }) {
  const { session: auth } = useAuth();
  const me = supabaseConfigured ? auth?.user.id : undefined;

  const [people, setPeople] = useState<Person[]>(me ? [] : seedPeople);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>(me ? [] : seedRequests);

  const refresh = useCallback(async () => {
    if (!me) return;
    const [profiles, friendships, nights, myJoins, memberships, pending] = await Promise.all([
      supabase.from('profiles').select('id,username').neq('id', me).limit(100),
      supabase.from('friendships').select('requester_id,addressee_id,status'),
      supabase
        .from('night_sessions')
        .select('id,owner_id,experience_id,current_stop,join_policy,experiences(title)')
        .is('ended_at', null)
        .neq('owner_id', me),
      supabase.from('join_requests').select('session_id,status').eq('user_id', me),
      supabase.from('session_members').select('session_id').eq('user_id', me),
      supabase
        .from('join_requests')
        .select('session_id,user_id,status,profiles(username)')
        .eq('status', 'pending')
        .neq('user_id', me),
    ]);

    const fs = (friendships.data ?? []) as FriendshipRow[];
    const ns = (nights.data ?? []) as unknown as NightRow[];
    const requested = new Set((myJoins.data ?? []).filter((r) => r.status === 'pending').map((r) => r.session_id));
    const joined = new Set((memberships.data ?? []).map((m) => m.session_id));

    const relationTo = (id: string): Relation => {
      const f = fs.find(
        (x) => (x.requester_id === me && x.addressee_id === id) || (x.requester_id === id && x.addressee_id === me),
      );
      if (!f) return 'none';
      if (f.status === 'accepted') return 'friend';
      return f.requester_id === me ? 'sent' : 'incoming';
    };

    setPeople(
      (profiles.data ?? []).map((p) => {
        const name = p.username ?? 'Someone';
        const night = ns.find((n) => n.owner_id === p.id);
        return {
          id: p.id,
          name,
          handle: name,
          color: colorFor(p.id),
          relation: relationTo(p.id),
          live: night
            ? {
                sessionId: night.id,
                where: night.experience_id ? `Stop ${night.current_stop ?? 1}` : 'Out now',
                plan: night.experiences?.title ?? null,
                policy: night.join_policy,
                join: joined.has(night.id) ? 'joined' : requested.has(night.id) ? 'requested' : 'none',
              }
            : undefined,
        } satisfies Person;
      }),
    );

    setJoinRequests(
      ((pending.data ?? []) as unknown as PendingRow[]).map((r) => {
        const name = r.profiles?.username ?? 'Someone';
        return {
          id: `${r.session_id}:${r.user_id}`,
          name,
          handle: name,
          color: colorFor(r.user_id),
          sessionId: r.session_id,
          userId: r.user_id,
        };
      }),
    );
  }, [me]);

  // Load on sign-in and poll so friends' live nights and join requests show up.
  useEffect(() => {
    if (!me) return;
    refresh();
    // Poll gently (and only while the app is open) to stay inside the free tier.
    const t = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, 60000);
    return () => clearInterval(t);
  }, [me, refresh]);

  const patch = useCallback((id: string, fn: (p: Person) => Person) => {
    setPeople((list) => list.map((p) => (p.id === id ? fn(p) : p)));
  }, []);

  const addFriend = useCallback(
    (id: string) => {
      patch(id, (p) => ({ ...p, relation: 'sent' }));
      if (me) supabase.from('friendships').insert({ requester_id: me, addressee_id: id }).then(refresh);
    },
    [me, patch, refresh],
  );

  const accept = useCallback(
    (id: string) => {
      patch(id, (p) => ({ ...p, relation: 'friend' }));
      if (me) {
        supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('requester_id', id)
          .eq('addressee_id', me)
          .then(refresh);
      }
    },
    [me, patch, refresh],
  );

  const decline = useCallback(
    (id: string) => {
      patch(id, (p) => ({ ...p, relation: 'none' }));
      if (me) supabase.from('friendships').delete().eq('requester_id', id).eq('addressee_id', me).then(refresh);
    },
    [me, patch, refresh],
  );

  const removeFriend = useCallback(
    (id: string) => {
      patch(id, (p) => ({ ...p, relation: 'none', live: undefined }));
      if (me) {
        supabase
          .from('friendships')
          .delete()
          .or(`and(requester_id.eq.${me},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${me})`)
          .then(refresh);
      }
    },
    [me, patch, refresh],
  );

  // "friends" policy joins instantly; "invite" sends a request the host must approve.
  const join = useCallback(
    (id: string) => {
      const target = people.find((p) => p.id === id);
      if (!target?.live || target.live.join !== 'none') return;
      if (me && target.live.sessionId) {
        supabase.rpc('join_night', { p_session: target.live.sessionId }).then(refresh);
        return;
      }
      patch(id, (p) => {
        if (!p.live) return p;
        if (p.live.policy === 'friends') return { ...p, live: { ...p.live, join: 'joined' } };
        if (p.live.policy === 'invite') return { ...p, live: { ...p.live, join: 'requested' } };
        return p;
      });
    },
    [me, people, patch, refresh],
  );

  const resolveJoinRequest = useCallback(
    (id: string, approve: boolean) => {
      const req = joinRequests.find((r) => r.id === id);
      setJoinRequests((list) => list.filter((r) => r.id !== id));
      if (me && req?.sessionId && req.userId) {
        supabase
          .rpc('answer_join_request', { p_session: req.sessionId, p_user: req.userId, p_approve: approve })
          .then(refresh);
      }
    },
    [me, joinRequests, refresh],
  );

  const value = useMemo(
    () => ({ people, joinRequests, addFriend, accept, decline, removeFriend, join, resolveJoinRequest }),
    [people, joinRequests, addFriend, accept, decline, removeFriend, join, resolveJoinRequest],
  );
  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error('useSocial must be used inside SocialProvider');
  return ctx;
}
