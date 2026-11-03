import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Button, Divider, Header, Poster, Screen, SectionTitle, TextTabs } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { JoinPolicy, Person, posts } from '@/data/mock';
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

function Feed() {
  const { people } = useSocial();
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

      {posts.map((p, i) => (
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
            <Button label="Recreate this night" icon="flash" />
          </View>
        </View>
      ))}
    </View>
  );
}

function Friends() {
  const { people, accept, decline } = useSocial();
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
  const query = q.trim().toLowerCase().replace(/^@/, '');
  const results = people.filter(
    (p) =>
      (p.relation === 'none' || p.relation === 'sent') &&
      (!query || p.name.toLowerCase().includes(query) || p.handle.includes(query)),
  );

  return (
    <View>
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
