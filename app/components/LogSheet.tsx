import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, space } from '@/constants/theme';
import { drinkMeta, ITEMS, PRICES } from '@/data/drinks';
import { LogEntry, LogExtra } from '@/lib/live';
import { capture } from '@/lib/media';

type DrinkKind = Exclude<LogEntry['kind'], 'moment'>;

/**
 * The "what was it?" sheet. A tap on a drink logs it instantly; this sheet is for the person who wants to remember it:
 * what it was, how it was served, how good it was, what it cost, a note and a photo. Every field is optional and private.
 */
export function LogSheet({
  entry,
  number,
  fresh = false,
  onSave,
  onDelete,
  onClose,
}: {
  entry: LogEntry;
  number: number; // "Beer #3 tonight"
  fresh?: boolean; // opened by a new log: the top-right button says Skip
  onSave: (patch: LogExtra) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const kind = entry.kind as DrinkKind;
  const meta = drinkMeta(kind);
  const cfg = ITEMS[kind];
  const [item, setItem] = useState(entry.item ?? '');
  const [custom, setCustom] = useState(entry.item && !cfg.items.includes(entry.item) ? entry.item : '');
  const [size, setSize] = useState(entry.size ?? '');
  const [rating, setRating] = useState(entry.rating ?? 0);
  const [price, setPrice] = useState(entry.price !== undefined ? String(entry.price) : '');
  const [note, setNote] = useState(entry.note ?? '');
  const [photo, setPhoto] = useState<{ uri: string; type: 'photo' | 'video' } | null>(entry.uri ? { uri: entry.uri, type: entry.mediaType ?? 'photo' } : null);
  const [msg, setMsg] = useState<string | null>(null);

  const chosen = custom.trim() || item;
  const priceNum = price.trim() === '' ? undefined : Number(price);

  const save = () => {
    onSave({
      item: chosen || undefined,
      size: size || undefined,
      rating: rating || undefined,
      price: priceNum !== undefined && Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : undefined,
      note: note.trim() || undefined,
      uri: photo?.uri,
      mediaType: photo?.type,
    });
    onClose();
  };

  const snap = async () => {
    setMsg(null);
    const r = await capture('photo');
    if (r.ok) setPhoto(r.media);
    else if (r.reason === 'denied') setMsg('Camera is off for DrunkVA. Turn it on in Settings.');
    else if (r.reason === 'error') setMsg("The camera didn't open.");
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.grab} />
          <View style={styles.head}>
            <View style={[styles.circle, { backgroundColor: meta.color + '26', borderColor: meta.color }]}>
              <MaterialCommunityIcons name={meta.icon} size={28} color={meta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{meta.label}</Text>
              <Text style={styles.sub}>No. {number} tonight. Add what you like, or skip.</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.skip}>
              <Text style={styles.skipText}>{fresh ? 'Skip' : 'Close'}</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: space.lg, paddingBottom: space.lg }}>
            <View style={styles.block}>
              <Text style={styles.label}>{cfg.prompt}</Text>
              <View style={styles.chips}>
                {cfg.items.map((i) => (
                  <Pressable
                    key={i}
                    style={[styles.chip, item === i && !custom && { borderColor: meta.color, backgroundColor: meta.color + '26' }]}
                    onPress={() => {
                      setItem(item === i ? '' : i);
                      setCustom('');
                    }}
                  >
                    <Text style={[styles.chipText, item === i && !custom && { color: colors.text }]}>{i}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={styles.input} placeholder="Something else? Type it here" placeholderTextColor={colors.textFaint} value={custom} onChangeText={setCustom} maxLength={40} />
            </View>

            {cfg.sizes ? (
              <View style={styles.block}>
                <Text style={styles.label}>How was it served?</Text>
                <View style={styles.chips}>
                  {cfg.sizes.map((z) => (
                    <Pressable key={z} style={[styles.chip, size === z && { borderColor: meta.color, backgroundColor: meta.color + '26' }]} onPress={() => setSize(size === z ? '' : z)}>
                      <Text style={[styles.chipText, size === z && { color: colors.text }]}>{z}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {kind !== 'water' ? (
              <View style={styles.block}>
                <Text style={styles.label}>{kind === 'food' ? 'How good was it?' : 'How was it?'}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable key={n} onPress={() => setRating(rating === n ? 0 : n)} hitSlop={6}>
                      <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={n <= rating ? colors.yellow : colors.textFaint} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {kind !== 'water' ? (
            <View style={styles.block}>
              <Text style={styles.label}>What did it cost? (CAD)</Text>
              <View style={styles.chips}>
                {PRICES.map((n) => (
                  <Pressable key={n} style={[styles.chip, price === String(n) && { borderColor: colors.primary, backgroundColor: 'rgba(255,92,0,0.18)' }]} onPress={() => setPrice(price === String(n) ? '' : String(n))}>
                    <Text style={[styles.chipText, price === String(n) && { color: colors.text }]}>{n === 0 ? 'Free' : `$${n}`}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput style={styles.input} placeholder="Or type the price" placeholderTextColor={colors.textFaint} value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" maxLength={6} />
            </View>
            ) : null}

            <View style={styles.block}>
              <Text style={styles.label}>A note to remember it by</Text>
              <TextInput style={[styles.input, { minHeight: 56 }]} placeholder="Tasting note, who you were with, the story" placeholderTextColor={colors.textFaint} value={note} onChangeText={setNote} multiline maxLength={200} />
            </View>

            <View style={styles.block}>
              {photo && photo.type === 'photo' ? (
                <View style={styles.photo}>
                  <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <Pressable style={styles.photoX} onPress={() => setPhoto(null)} hitSlop={8}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.photoBtn} onPress={snap}>
                  <Ionicons name="camera" size={20} color={colors.text} />
                  <Text style={styles.photoText}>Add a photo</Text>
                </Pressable>
              )}
              {msg ? <Text style={styles.msg}>{msg}</Text> : null}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onDelete} hitSlop={8}>
              <Text style={styles.delete}>Remove</Text>
            </Pressable>
            <Pressable style={styles.save} onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: space.lg, paddingTop: space.sm, maxHeight: '90%' },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
  circle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 24, letterSpacing: -0.6 },
  skip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)' },
  skipText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  sub: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  block: { gap: space.sm },
  label: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, borderWidth: 1, borderColor: colors.line },
  chipText: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 13 },
  input: { color: colors.text, fontFamily: fonts.body, fontSize: 15, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 8 },
  stars: { flexDirection: 'row', gap: 8 },
  photo: { height: 150, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.bg },
  photoX: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-start' },
  photoText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
  msg: { color: colors.yellow, fontFamily: fonts.bodyMedium, fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.md, paddingBottom: 28 },
  delete: { color: colors.pink, fontFamily: fonts.bodyBold, fontSize: 15 },
  save: { backgroundColor: colors.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  saveText: { color: '#0B0B0D', fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4 },
});
