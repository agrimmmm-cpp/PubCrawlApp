import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

/** Plain text tabs with an underline: replaces rows of rounded chips. */
export function TextTabs({
  items,
  active,
  onChange,
}: {
  items: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.tabs}>
      {items.map((t) => (
        <Pressable key={t} onPress={() => onChange(t)} style={[styles.tab, t === active && styles.tabActive]}>
          <Text style={[styles.tabText, t === active && { color: colors.text }]}>{t}</Text>
        </Pressable>
      ))}
    </View>
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

/** Full-bleed poster standing in for venue photography. */
export function Poster({
  gradient,
  emoji,
  height = 300,
  children,
}: {
  gradient: [string, string];
  emoji: string;
  height?: number;
  children?: ReactNode;
}) {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height }}>
      <Text style={styles.posterEmoji}>{emoji}</Text>
      {children}
    </LinearGradient>
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
  posterEmoji: { position: 'absolute', right: 16, top: 40, fontSize: 96, opacity: 0.9 },
  divider: { height: 1, backgroundColor: colors.line, marginHorizontal: space.lg },
  track: { height: 3, backgroundColor: colors.line },
});
