import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Display, Divider, Screen } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { useAdminExperiences, useIsAdmin } from '@/lib/admin';

export default function AdminHome() {
  const isAdmin = useIsAdmin();
  const [q, setQ] = useState('');
  const [refresh, setRefresh] = useState(0);
  const { rows, loading } = useAdminExperiences(q, refresh);

  // Come back from the editor to a fresh list.
  useFocusEffect(useCallback(() => setRefresh((n) => n + 1), []));

  if (!isAdmin) {
    return (
      <Screen>
        <Text style={[styles.dim, { padding: space.lg }]} onPress={() => router.back()}>
          This area is for admins. Tap to go back.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Ionicons name="chevron-back" size={26} color={colors.text} onPress={() => router.back()} />
          <Text style={styles.kicker}>ADMIN</Text>
        </View>
        <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
          <Display style={{ fontSize: 34, lineHeight: 36 }}>Experiences</Display>
          <Button label="New experience" icon="add" onPress={() => router.push('/admin/edit')} />
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={colors.primary} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search by title…" placeholderTextColor={colors.textFaint} style={styles.input} />
          </View>
        </View>

        <View style={{ marginTop: space.lg }}>
          {rows.map((r) => (
            <View key={r.id}>
              <Pressable style={styles.row} onPress={() => router.push({ pathname: '/admin/edit', params: { id: r.id } })}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.title}>{r.title}</Text>
                  <Text style={styles.dim}>
                    {[r.city, r.is_curated ? 'Hand-made' : 'Generated', r.featured ? 'Featured' : '']
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {!r.is_public ? <Text style={styles.draft}>DRAFT</Text> : null}
                <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
              </Pressable>
              <Divider />
            </View>
          ))}
          {!loading && rows.length === 0 ? <Text style={[styles.dim, { padding: space.lg }]}>Nothing found.</Text> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  kicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  dim: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderBottomWidth: 2, borderBottomColor: colors.line },
  input: { flex: 1, color: colors.text, paddingVertical: 12, fontSize: 16, fontFamily: fonts.bodyMedium },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 17, letterSpacing: -0.3 },
  draft: { color: colors.yellow, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1 },
});
