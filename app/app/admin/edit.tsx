import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Chip, Display, Divider, Screen } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { Draft, DraftStop, deleteExperience, draftFrom, emptyDraft, saveDraft, useIsAdmin } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { useExperience } from '@/lib/experiences';
import { CITIES, usePlaceSearch } from '@/lib/places';
import { TAG_OPTIONS, tagLabel } from '@/lib/tags';

const BADGES = ['CLASSIC', 'FRIENDS', 'GAMES', 'SING', 'LIVE', 'HIGH ENERGY', 'DATE NIGHT', 'STREET EATS', 'BUDGET', 'CHILL', 'SCENIC'];

const confirm = (title: string, ok: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(title)) ok();
  } else {
    Alert.alert(title, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: ok }]);
  }
};

export default function EditExperience() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isAdmin = useIsAdmin();
  const { session } = useAuth();
  const { experience } = useExperience(id);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const loaded = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pq, setPq] = useState('');

  // Fill the form once when editing an existing experience.
  useEffect(() => {
    if (id && experience && !loaded.current) {
      loaded.current = true;
      setDraft(draftFrom(experience));
    }
  }, [id, experience]);

  const { places: results, loading } = usePlaceSearch({ city: draft.city, query: pq });

  if (!isAdmin) {
    return (
      <Screen>
        <Text style={[styles.dim, { padding: space.lg }]} onPress={() => router.back()}>
          This area is for admins. Tap to go back.
        </Text>
      </Screen>
    );
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setStop = (i: number, patch: Partial<DraftStop>) =>
    setDraft((d) => ({ ...d, stops: d.stops.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.stops.length) return d;
      const stops = [...d.stops];
      [stops[i], stops[j]] = [stops[j], stops[i]];
      return { ...d, stops };
    });

  const save = async () => {
    if (!session) return;
    setSaving(true);
    setMessage(null);
    const res = await saveDraft(draft, session.user.id);
    setSaving(false);
    if (res.error) {
      setMessage(res.error);
      return;
    }
    router.back();
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Ionicons name="chevron-back" size={26} color={colors.text} onPress={() => router.back()} />
          <Text style={styles.kicker}>{id ? 'EDIT EXPERIENCE' : 'NEW EXPERIENCE'}</Text>
        </View>

        <View style={styles.form}>
          <Display style={{ fontSize: 30, lineHeight: 32 }}>{draft.title.trim() || 'Untitled night'}</Display>

          <Field label="Title">
            <TextInput value={draft.title} onChangeText={(v) => set('title', v)} placeholder="Gastown After Dark" placeholderTextColor={colors.textFaint} style={styles.input} />
          </Field>
          <Field label="Short description">
            <TextInput value={draft.description} onChangeText={(v) => set('description', v)} placeholder="Tacos, cocktails and a late bite." placeholderTextColor={colors.textFaint} style={styles.input} multiline />
          </Field>
          <Field label="Why this order">
            <TextInput value={draft.whyOrder} onChangeText={(v) => set('whyOrder', v)} placeholder="Eat first, then drinks, then a view." placeholderTextColor={colors.textFaint} style={styles.input} multiline />
          </Field>

          <Field label="City">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {CITIES.map((c) => (
                <Chip key={c} label={c} active={draft.city === c} onPress={() => set('city', c)} />
              ))}
            </ScrollView>
          </Field>

          <Field label="Badge">
            <View style={styles.wrap}>
              {BADGES.map((b) => (
                <Chip key={b} label={b} active={draft.badge === b} onPress={() => set('badge', draft.badge === b ? '' : b)} />
              ))}
            </View>
          </Field>

          <Field label="Tags (what it feels like)">
            <View style={styles.wrap}>
              {TAG_OPTIONS.map((t) => (
                <Chip
                  key={t}
                  label={tagLabel(t)}
                  active={draft.tags.includes(t)}
                  onPress={() => set('tags', draft.tags.includes(t) ? draft.tags.filter((x) => x !== t) : [...draft.tags, t])}
                />
              ))}
            </View>
          </Field>

          <View style={{ flexDirection: 'row', gap: space.lg }}>
            <View style={{ flex: 1 }}>
              <Field label="Start time (24h)">
                <TextInput value={draft.startTime} onChangeText={(v) => set('startTime', v)} placeholder="18:30" placeholderTextColor={colors.textFaint} style={styles.input} />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Best night">
                <TextInput value={draft.bestNight} onChangeText={(v) => set('bestNight', v)} placeholder="Fri-Sat" placeholderTextColor={colors.textFaint} style={styles.input} />
              </Field>
            </View>
          </View>

          <View style={styles.wrap}>
            <Chip label={draft.published ? 'Published' : 'Draft'} active={draft.published} onPress={() => set('published', !draft.published)} />
            <Chip label="Featured" active={draft.featured} onPress={() => set('featured', !draft.featured)} />
          </View>
        </View>

        <Text style={[styles.section, { marginTop: space.xl }]}>Stops ({draft.stops.length})</Text>
        {draft.stops.map((s, i) => (
          <View key={`${s.placeId}-${i}`}>
            <View style={styles.stop}>
              <View style={styles.stopHead}>
                <Text style={styles.num}>{i + 1}</Text>
                <Text style={styles.stopName} numberOfLines={1}>
                  {s.emoji} {s.name}
                </Text>
                <Ionicons name="chevron-up" size={22} color={colors.textDim} onPress={() => move(i, -1)} />
                <Ionicons name="chevron-down" size={22} color={colors.textDim} onPress={() => move(i, 1)} />
                <Ionicons name="close-circle" size={22} color={colors.pink} onPress={() => setDraft((d) => ({ ...d, stops: d.stops.filter((_, j) => j !== i) }))} />
              </View>
              <View style={styles.stopRow}>
                <Text style={styles.dim}>Stay</Text>
                <Ionicons name="remove-circle-outline" size={26} color={colors.text} onPress={() => setStop(i, { stay: Math.max(10, s.stay - 10) })} />
                <Text style={styles.stay}>{s.stay} min</Text>
                <Ionicons name="add-circle-outline" size={26} color={colors.text} onPress={() => setStop(i, { stay: s.stay + 10 })} />
                {i > 0 ? <Chip label={s.ride ? 'Ride' : 'Walk'} active={s.ride} onPress={() => setStop(i, { ride: !s.ride })} /> : null}
              </View>
              <TextInput value={s.tip} onChangeText={(v) => setStop(i, { tip: v })} placeholder="Tip for this stop (optional)" placeholderTextColor={colors.textFaint} style={[styles.input, { fontSize: 14 }]} />
            </View>
            <Divider />
          </View>
        ))}

        <View style={{ paddingHorizontal: space.lg, marginTop: space.lg, gap: space.md }}>
          <Button label={adding ? 'Done adding' : 'Add a stop'} icon={adding ? 'checkmark' : 'add'} variant="ghost" onPress={() => setAdding(!adding)} />
          {adding ? (
            <View style={{ gap: space.sm }}>
              <TextInput value={pq} onChangeText={setPq} placeholder={`Search places in ${draft.city}…`} placeholderTextColor={colors.textFaint} style={styles.input} autoFocus />
              {loading ? <Text style={styles.dim}>Searching…</Text> : null}
              {results.slice(0, 20).map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.result}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      stops: [...d.stops, { placeId: p.id, name: p.name, emoji: p.emoji, lat: p.lat, lng: p.lng, estCad: p.estCad, stay: 60, tip: '', ride: false }],
                    }))
                  }>
                  <Text style={styles.stopName} numberOfLines={1}>
                    {p.emoji} {p.name}
                  </Text>
                  <Text style={styles.dim}>{[p.subcategory, p.address].filter(Boolean).join(' · ')}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {message ? <Text style={styles.error}>{message}</Text> : null}
          <Button label={saving ? 'Saving…' : 'Save'} icon="save" onPress={saving ? undefined : save} />
          {id ? (
            <Button
              label="Delete experience"
              icon="trash"
              variant="ghost"
              onPress={() =>
                confirm('Delete this experience?', async () => {
                  const err = await deleteExperience(id);
                  if (err) setMessage(err);
                  else router.back();
                })
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg },
  kicker: { color: colors.primary, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.5 },
  form: { paddingHorizontal: space.lg, gap: space.lg },
  label: { color: colors.textFaint, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2 },
  input: { color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  chips: { gap: space.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  dim: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  section: { color: colors.text, fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.5, paddingHorizontal: space.lg, marginBottom: space.sm },
  stop: { padding: space.lg, gap: space.md },
  stopHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  num: { color: colors.primary, fontFamily: fonts.display, fontSize: 16, width: 18 },
  stopName: { flex: 1, color: colors.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stay: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14, minWidth: 56, textAlign: 'center' },
  result: { paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 2 },
  error: { color: colors.pink, fontFamily: fonts.bodyMedium, fontSize: 13 },
});
