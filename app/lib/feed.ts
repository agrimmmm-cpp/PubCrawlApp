import { File } from 'expo-file-system';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';

/**
 * Shared nights. A post carries the night card numbers, a caption and the photos someone chose, and nothing about
 * what was drunk, how much or what it cost. Nothing is posted until the person taps Post on their recap.
 */
export type PostStats = { duration?: string; stops?: string; chaos?: number; rank?: string; moments?: number };

export type Post = {
  id: string;
  authorId: string;
  author: string;
  mine: boolean;
  title: string;
  caption: string;
  stats: PostStats;
  photos: string[]; // signed URLs, short-lived
  cheers: number;
  cheered: boolean;
  createdAt: number;
  experienceId: string | null;
};

type PostRow = {
  id: string;
  author_id: string;
  experience_id: string | null;
  title: string;
  caption: string | null;
  stats: PostStats | null;
  photos: string[] | null;
  created_at: string;
  profiles: { username: string | null } | null;
  post_cheers: { user_id: string }[] | null;
};

const SELECT = 'id,author_id,experience_id,title,caption,stats,photos,created_at,profiles(username),post_cheers(user_id)';

export function useFeed() {
  const { session } = useAuth();
  const me = supabaseConfigured ? session?.user.id : undefined;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(Boolean(me));

  const refresh = useCallback(async () => {
    if (!me) return;
    const { data } = await supabase.from('night_posts').select(SELECT).order('created_at', { ascending: false }).limit(30);
    const rows = (data ?? []) as unknown as PostRow[];

    // Sign every photo in one call. The URLs expire, so they are never stored.
    const paths = rows.flatMap((r) => r.photos ?? []);
    const signed = new Map<string, string>();
    if (paths.length) {
      const res = await supabase.storage.from('shared').createSignedUrls(paths, 3600);
      (res.data ?? []).forEach((s) => s.path && s.signedUrl && signed.set(s.path, s.signedUrl));
    }

    setPosts(
      rows.map((r) => ({
        id: r.id,
        authorId: r.author_id,
        author: r.profiles?.username ?? 'Someone',
        mine: r.author_id === me,
        title: r.title,
        caption: r.caption ?? '',
        stats: r.stats ?? {},
        photos: (r.photos ?? []).map((p) => signed.get(p)).filter((u): u is string => Boolean(u)),
        cheers: r.post_cheers?.length ?? 0,
        cheered: Boolean(r.post_cheers?.some((c) => c.user_id === me)),
        createdAt: new Date(r.created_at).getTime(),
        experienceId: r.experience_id,
      })),
    );
    setLoading(false);
  }, [me]);

  useEffect(() => {
    // Fetch on mount; the setStates happen after the awaited request, not during the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const cheer = useCallback(
    (id: string) => {
      if (!me) return;
      const post = posts.find((p) => p.id === id);
      if (!post) return;
      const on = !post.cheered;
      setPosts((list) => list.map((p) => (p.id === id ? { ...p, cheered: on, cheers: p.cheers + (on ? 1 : -1) } : p)));
      const req = on
        ? supabase.from('post_cheers').insert({ post_id: id, user_id: me })
        : supabase.from('post_cheers').delete().eq('post_id', id).eq('user_id', me);
      req.then(({ error }) => {
        if (error) refresh();
      });
    },
    [me, posts, refresh],
  );

  const remove = useCallback(
    (id: string) => {
      setPosts((list) => list.filter((p) => p.id !== id));
      supabase.from('night_posts').delete().eq('id', id).then();
    },
    [],
  );

  return { live: Boolean(me), posts, loading, refresh, cheer, remove };
}

/** Post a finished night. Uploads only the photos passed in, which the person picked one by one. */
export async function publishNight(input: {
  userId: string;
  sessionId?: string;
  experienceId?: string;
  title: string;
  caption: string;
  stats: PostStats;
  photoUris: string[];
}): Promise<'posted' | 'already' | 'failed'> {
  const { data, error } = await supabase
    .from('night_posts')
    .insert({
      author_id: input.userId,
      session_id: input.sessionId ?? null,
      experience_id: input.experienceId ?? null,
      title: input.title.slice(0, 80),
      caption: input.caption.trim().slice(0, 280) || null,
      stats: input.stats,
    })
    .select('id')
    .single();
  if (error?.code === '23505') return 'already'; // one post per night
  if (error || !data) return 'failed';

  const paths: string[] = [];
  for (const [i, uri] of input.photoUris.slice(0, 6).entries()) {
    try {
      const path = `${input.userId}/${data.id}/${i}.jpg`;
      const up = await supabase.storage.from('shared').upload(path, await new File(uri).arrayBuffer(), { contentType: 'image/jpeg', upsert: true });
      if (!up.error) paths.push(path);
    } catch {
      // Skip a photo that cannot be read; the post still goes up.
    }
  }
  if (paths.length) await supabase.from('night_posts').update({ photos: paths }).eq('id', data.id);
  return 'posted';
}

/** The code other people use to add you, and a way to use someone else's. */
export function useInviteCode() {
  const { session } = useAuth();
  const me = supabaseConfigured ? session?.user.id : undefined;
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (!me) return;
    supabase
      .from('profiles')
      .select('invite_code')
      .eq('id', me)
      .single()
      .then(({ data }) => setCode((data as { invite_code?: string } | null)?.invite_code ?? null));
  }, [me]);

  return code;
}

export type CodeResult = 'not_found' | 'self' | 'friends' | 'requested' | 'pending' | 'accepted' | 'error';

export async function addByCode(code: string): Promise<CodeResult> {
  const { data, error } = await supabase.rpc('friend_request_by_code', { p_code: code });
  return error ? 'error' : (data as CodeResult);
}

export const CODE_MESSAGE: Record<CodeResult, string> = {
  not_found: "That code didn't match anyone.",
  self: "That's your own code.",
  friends: "You're already friends.",
  requested: 'Request sent. They will see it in Friends.',
  pending: 'You already sent them a request.',
  accepted: "You're friends now.",
  error: 'Something went wrong. Try again.',
};
