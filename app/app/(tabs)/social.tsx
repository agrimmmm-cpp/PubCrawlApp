import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Button, Divider, Header, Poster, Screen, SectionTitle, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { JoinPolicy, Person, posts } from '@/data/mock';
import { addByCode, CODE_MESSAGE, Post, useFeed, useInviteCode } from '@/lib/feed';
import { useSocial } from '@/lib/social';

const tabs = ['Feed', 'Friends', 'Find'];

const policyLabel: Record<JoinPolicy, string> = {
  friends: 'Friends can join',
  invite: 'Ask to join',
  closed: 'Private night',
};

export default function Social() {
  const [tab, setTab] = useState(tabs[0]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <Header />
        <TextTabs items={tabs} active={tab} onChange={setTab} />
        {tab === 'Feed' ? <Feed /> : tab === 'Friends' ? <Friends /> : <Find />}
      </ScrollView>
    </Screen>
  );
}

function LiveNowCard({ person }: { person: Person }) {
  const { join } = useSocial();
  const live = person.live!;
  const action =
    live.join === 'joined' ? (
      <Text style={styles.joined}>✓ You&apos;re in</Text>
    ) : live.join === 'requested' ? (
      <Text style={styles.pending}>Request sent</Text>
    ) : live.policy === 'closed' ? (
      <Text style={styles.pending}>Private</Text>
    ) : (
      <Button
        label={live.policy === 'friends' ? 'Join' : 'Ask'}
        icon={live.policy === 'friends' ? 'flash' : 'hand-left'}
        onPress={() => join(person.id)}
        style={styles.small}
      />
    );

  return (
    <View style={styles.liveCard}>
      <Avatar name={person.name} color={person.color} size={46} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={styles.liveDot} />
          <Text style={styles.name}>{person.name}</Text>
        </View>
        <Text style={styles.dim}>{live.plan ? `${live.plan} · ${live.where}` : `Freestyle · ${live.where}`}</Text>
        <Text style={styles.policy}>{policyLabel[live.policy]}</Text>
      </View>
      {action}
    </View>
  );
}

const GRADIENTS: [string, string][] = [['#3A0F5C', '#FF5C00'], ['#0B2A4A', '#0096FF'], ['#4A0B2A', '#FF3D81'], ['#0B3A2A', '#37E08A']];
const gradientFor = (id: string) => GRADIENTS[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % GRADIENTS.length];
const palette = ['#FF3D81', '#2D9CFF', '#FFD60A', '#37E08A', '#FF5C00', '#B06CFF'];
const colorFor = (id: string) => palette[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % palette.length];

const ago = (t: number) => {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

function PostCard({ post, onCheer, onRemove }: { post: Post; onCheer: () => void; onRemove: () => void }) {
  const [photo, setPhoto] = useState(0);
  const s = post.stats;
  const bits = [s.duration, s.stops ? `${s.stops} stops` : null, s.chaos ? `${s.chaos} chaos` : null].filter(Boolean).join(' · ');
  const hero = post.photos[photo];

  return (
    <View style={{ marginTop: space.xl }}>
      <View style={styles.author}>
        <Avatar name={post.author} color={colorFor(post.authorId)} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{post.mine ? 'You' : post.author}</Text>
          <Text style={styles.dim}>{ago(post.createdAt)}</Text>
        </View>
        {post.mine ? (
          <Pressable
            hitSlop={10}
            onPress={() =>
              Platform.OS === 'web'
                ? onRemove()
                : Alert.alert('Delete this post?', 'Your friends will no longer see it.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: onRemove }])
            }>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
          </Pressable>
        ) : null}
      </View>

      <Pressable onPress={() => setPhoto((i) => (post.photos.length ? (i + 1) % post.photos.length : 0))}>
        <Poster gradient={gradientFor(post.id)} emoji="🌙" height={hero ? 320 : 190} image={hero ? { uri: hero } : undefined}>
          <View style={styles.postText}>
            <Text style={styles.postRank}>{s.rank ? s.rank.toUpperCase() : 'NIGHT OUT'}</Text>
            <Text style={styles.postTitle}>{post.title}</Text>
            {bits ? <Text style={styles.stats2}>{bits}</Text> : null}
          </View>
          {post.photos.length > 1 ? (
            <View style={styles.dots}>
              {post.photos.map((_, i) => (
                <View key={i} style={[styles.pdot, i === photo && { backgroundColor: '#fff' }]} />
              ))}
            </View>
          ) : null}
        </Poster>
      </Pressable>

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, gap: space.md }}>
        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
        <View style={styles.actions}>
          <Pressable onPress={onCheer} hitSlop={8} style={[styles.cheer, post.cheered && styles.cheerOn]}>
            <Text style={{ fontSize: 16 }}>🍻</Text>
            <Text style={[styles.cheerText, post.cheered && { color: '#0B0B0D' }]}>{post.cheers > 0 ? `${post.cheers} cheers` : 'Cheers'}</Text>
          </Pressable>
          {post.experienceId ? (
            <Pressable onPress={() => router.push({ pathname: '/experience/[id]', params: { id: post.experienceId as string } })} hitSlop={8}>
              <Text style={styles.recreate}>Recreate this night →</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function Feed() {
  const { people } = useSocial();
  const { live, posts: real, loading, cheer, remove } = useFeed();
  const liveNow = people.filter((p) => p.relation === 'friend' && p.live);

  return (
    <View>
      {liveNow.length ? (
        <>
          <SectionTitle title="Live now" right={`${liveNow.length} friends out`} />
          {liveNow.map((p) => (
            <LiveNowCard key={p.id} person={p} />
          ))}
        </>
      ) : null}

      {live ? (
        loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: space.xl }} />
        ) : real.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyBig}>Nothing posted yet.</Text>
            <Text style={styles.dim}>
              When you or a friend finishes a night and taps Post, it shows up here. Nothing is shared unless it is posted, and drinks and spending never are.
            </Text>
          </View>
        ) : (
          real.map((p) => <PostCard key={p.id} post={p} onCheer={() => cheer(p.id)} onRemove={() => remove(p.id)} />)
        )
      ) : (
        posts.map((p, i) => (
          <View key={p.id} style={{ marginTop: space.xl }}>
            <View style={styles.author}>
              <Avatar name={p.author} color={i ? colors.blue : colors.pink} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {p.author} <Text style={styles.dim}>{p.with}</Text>
                </Text>
                <Text style={styles.dim}>{p.sub}</Text>
              </View>
            </View>
            <Poster gradient={p.gradient} emoji={i ? '🌊' : '🍹'} height={300}>
              <Text style={styles.stats}>
                {p.stops} stops · {p.duration} · {p.spend}
              </Text>
            </Poster>
            <View style={{ padding: space.lg, gap: space.md }}>
              <Text style={styles.caption}>{p.caption}</Text>
              <View style={styles.actions}>
                <Ionicons name="heart-outline" size={20} color={colors.text} />
                <Text style={styles.dim}>{p.likes}</Text>
                <Ionicons name="chatbubble-outline" size={19} color={colors.text} />
                <Text style={styles.dim}>{p.comments}</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function Friends() {
  const { people, accept, decline, removeFriend } = useSocial();
  const requests = people.filter((p) => p.relation === 'incoming');
  const friends = people.filter((p) => p.relation === 'friend');

  return (
    <View>
      {requests.length ? (
        <>
          <SectionTitle title="Friend requests" />
          {requests.map((p) => (
            <View key={p.id}>
              <View style={styles.row}>
                <Avatar name={p.name} color={p.color} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={styles.dim}>@{p.handle}</Text>
                </View>
                <Button label="Accept" onPress={() => accept(p.id)} style={styles.small} />
                <Button label="Ignore" variant="ghost" onPress={() => decline(p.id)} style={styles.small} />
              </View>
              <Divider />
            </View>
          ))}
        </>
      ) : null}

      <SectionTitle title="Your crew" right={`${friends.length} friends`} />
      {friends.map((p) => (
        <View key={p.id}>
          <View style={styles.row}>
            <Avatar name={p.name} color={p.color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.dim}>{p.live ? `● Live · ${p.live.where}` : `@${p.handle}`}</Text>
            </View>
            <Pressable
              hitSlop={10}
              onPress={() =>
                Platform.OS === 'web'
                  ? removeFriend(p.id)
                  : Alert.alert(`Remove ${p.name}?`, 'They will stop seeing your posts and live nights.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => removeFriend(p.id) }])
              }>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
            </Pressable>
          </View>
          <Divider />
        </View>
      ))}
    </View>
  );
}

function Find() {
  const { people, addFriend } = useSocial();
  const [q, setQ] = useState('');
  const code = useInviteCode();
  const [entered, setEntered] = useState('');
  const [msg, setMsg] = useState('');
  const query = q.trim().toLowerCase().replace(/^@/, '');
  const results = people.filter(
    (p) =>
      (p.relation === 'none' || p.relation === 'sent') &&
      (!query || p.name.toLowerCase().includes(query) || p.handle.includes(query)),
  );

  const shareCode = () => {
    if (!code) return;
    Share.share({ message: `Add me on DrunkVA. Tap drunkva://add/${code} or enter my code ${code} in Find.` }).catch(() => {});
  };
  const submitCode = async () => {
    if (entered.trim().length < 4) return;
    setMsg('…');
    setMsg(CODE_MESSAGE[await addByCode(entered)]);
    setEntered('');
  };

  return (
    <View>
      {code ? (
        <View style={styles.invite}>
          <Text style={styles.inviteKicker}>YOUR CODE</Text>
          <Text style={styles.inviteCode} selectable>
            {code}
          </Text>
          <Text style={styles.dim}>Send it to a friend. They get a request to you, and you both stay private until you accept.</Text>
          <Button label="Share my code" icon="share-outline" onPress={shareCode} />
          <View style={styles.codeRow}>
            <TextInput
              value={entered}
              onChangeText={setEntered}
              placeholder="Got a code? Enter it"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              onSubmitEditing={submitCode}
              style={styles.codeInput}
            />
            <Button label="Add" variant="ghost" onPress={submitCode} style={styles.small} />
          </View>
          {msg ? <Text style={styles.inviteMsg}>{msg}</Text> : null}
        </View>
      ) : null}

      <View style={styles.search}>
        <Ionicons name="search" size={16} color={colors.primary} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search by name or @username"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>

      <SectionTitle title={query ? 'Results' : 'People you may know'} />
      {results.length === 0 ? <Text style={[styles.dim, { paddingHorizontal: space.lg }]}>No one found.</Text> : null}
      {results.map((p) => (
        <View key={p.id}>
          <View style={styles.row}>
            <Avatar name={p.name} color={p.color} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.dim}>@{p.handle}</Text>
            </View>
            {p.relation === 'sent' ? (
              <Text style={styles.pending}>Requested</Text>
            ) : (
              <Button label="Add" icon="person-add" onPress={() => addFriend(p.id)} style={styles.small} />
            )}
          </View>
          <Divider />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  postText: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, gap: 2 },
  postRank: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  postTitle: { color: '#fff', fontFamily: fonts.display, fontSize: 30, lineHeight: 31, letterSpacing: -1.2 },
  stats2: { color: 'rgba(255,255,255,0.85)', fontFamily: fonts.bodyBold, fontSize: 13, marginTop: 2 },
  dots: { position: 'absolute', top: 12, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  pdot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  cheer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface },
  cheerOn: { backgroundColor: colors.primary },
  cheerText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  recreate: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 13 },
  empty: { padding: space.lg, marginTop: space.xl, gap: space.sm },
  emptyBig: { color: colors.text, fontFamily: fonts.display, fontSize: 26, letterSpacing: -1 },
  invite: { margin: space.lg, padding: space.lg, borderRadius: 14, backgroundColor: colors.surface, gap: space.md },
  inviteKicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  inviteCode: { color: colors.text, fontFamily: fonts.display, fontSize: 36, letterSpacing: 4 },
  inviteMsg: { color: colors.green, fontFamily: fonts.bodyMedium, fontSize: 13 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: space.md },
  codeInput: { flex: 1, color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16, letterSpacing: 2, paddingVertical: 8 },
  author: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  name: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  dim: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  policy: { color: colors.blue, fontFamily: fonts.bodyMedium, fontSize: 11 },
  stats: { position: 'absolute', left: space.lg, bottom: space.lg, color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 },
  caption: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  small: { flex: 0, flexShrink: 0, minWidth: 76, paddingHorizontal: 12, paddingVertical: 8 },
  liveCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pink },
  joined: { color: colors.green, fontFamily: fonts.bodyBold, fontSize: 12 },
  pending: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.lg,
    marginTop: space.lg,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 16, fontFamily: fonts.bodyMedium },
});
