import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, ImageSource } from 'expo-image';
import { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, space } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {children}
    </SafeAreaView>
  );
}

export function Header({ title = 'drunkva', place = 'Vancouver' }: { title?: string; place?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.wordmark}>
        {title}
        <Text style={{ color: colors.primary }}>.</Text>
      </Text>
      <View style={styles.place}>
        <Ionicons name="location-sharp" size={12} color={colors.primary} />
        <Text style={styles.placeText}>{place}</Text>
      </View>
    </View>
  );
}

export function Display({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.display, style]}>{children}</Text>;
}

export function SectionTitle({ title, right }: { title: string; right?: string }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right ? <Text style={styles.sectionRight}>{right}</Text> : null}
    </View>
  );
}

/**
 * Tabs. The default is plain text with an orange underline. `glow` is for the city and location rows: the
 * selected one gets an orange underline with a soft orange gradient rising from the line toward the text.
 */
export function TextTabs({
  items,
  active,
  onChange,
  glow,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
  glow?: boolean;
}) {
  return (
    <View style={[styles.tabs, glow && { gap: space.xs, paddingHorizontal: space.md }]}>
      {items.map((t) => {
        const on = t === active;
        if (!glow) {
          return (
            <Pressable key={t} onPress={() => onChange(t)} style={[styles.tab, on && styles.tabActive]}>
              <Text style={[styles.tabText, on && { color: colors.text }]}>{t}</Text>
            </Pressable>
          );
        }
        return (
          <Pressable key={t} onPress={() => onChange(t)} style={styles.glowTab}>
            {on ? (
              <LinearGradient
                colors={['rgba(255,92,0,0)', 'rgba(255,92,0,0.22)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            ) : null}
            <Text style={[styles.tabText, styles.glowText, on && { color: colors.text }]}>{t}</Text>
            <View style={[styles.glowLine, on && { backgroundColor: colors.primary }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && { color: '#0B0B0D' }]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  style,
}: {
  label: string;
  icon?: IconName;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  return (
    <Pressable onPress={onPress} style={[styles.button, primary ? styles.buttonPrimary : styles.buttonGhost, style]}>
      {icon ? <Ionicons name={icon} size={15} color={primary ? '#0B0B0D' : colors.text} /> : null}
      <Text style={[styles.buttonText, !primary && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Full-bleed cover. Shows a photo with a dark fade for text when one is given, otherwise a gradient
 * with a big emoji, so a missing photo never looks broken.
 */
export function Poster({
  gradient,
  emoji,
  image,
  height = 300,
  children,
}: {
  gradient: [string, string];
  emoji: string;
  image?: ImageSource | number;
  height?: number;
  children?: ReactNode;
}) {
  if (image) {
    return (
      <View style={{ height, backgroundColor: gradient[0] }}>
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient
          colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    );
  }
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height }}>
      <Text style={styles.posterEmoji}>{emoji}</Text>
      {children}
    </LinearGradient>
  );
}

/** A square-ish tile for picking a vibe: photo (or gradient) with the label on it. */
export function VibeTile({
  label,
  emoji,
  gradient,
  image,
  active,
  onPress,
}: {
  label: string;
  emoji: string;
  gradient: [string, string];
  image?: ImageSource | number;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tile, active && styles.tileActive]}>
      <Poster gradient={gradient} emoji={emoji} image={image} height={118} />
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

export function Avatar({ name, color, size = 40 }: { name: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#0B0B0D', fontFamily: fonts.display, fontSize: size * 0.42 }}>{name[0]}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function Meter({ value, color = colors.primary }: { value: number; color?: string }) {
  return (
    <View style={styles.track}>
      <View style={{ height: 3, width: `${Math.round(value * 100)}%`, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  wordmark: { color: colors.text, fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.5 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  placeText: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 12 },
  display: { color: colors.text, fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.5 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: space.lg,
    marginTop: space.xl,
    marginBottom: space.md,
  },
  sectionTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 20, letterSpacing: -0.5 },
  sectionRight: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  tabs: { flexDirection: 'row', gap: space.lg, paddingHorizontal: space.lg },
  tab: { paddingVertical: space.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.primary },
  glowTab: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm + 2, overflow: 'hidden' },
  glowText: { fontSize: 14 },
  glowLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: 'transparent' },
  tabText: { color: colors.textFaint, fontFamily: fonts.bodyBold, fontSize: 14 },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 6,
  },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonGhost: { borderWidth: 1, borderColor: colors.line },
  buttonText: { color: '#0B0B0D', fontFamily: fonts.bodyBold, fontSize: 14, flexShrink: 0 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: colors.line },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 12 },
  tile: { width: 104, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  tileActive: { borderColor: colors.primary },
  tileLabel: { position: 'absolute', left: 8, right: 8, bottom: 8, color: '#fff', fontFamily: fonts.display, fontSize: 14, lineHeight: 15, letterSpacing: -0.3 },
  posterEmoji: { position: 'absolute', right: 16, top: 40, fontSize: 96, opacity: 0.9 },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: space.lg },
  track: { height: 3, backgroundColor: colors.line },
});
