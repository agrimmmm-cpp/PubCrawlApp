import { Ionicons } from '@expo/vector-icons';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { Pressable, PressableProps, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/constants/theme';

type TabButtonProps = PressableProps & {
  isFocused?: boolean;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  center?: boolean;
};

// React 19 passes `ref` as a regular prop, so no forwardRef needed.
function TabButton({ isFocused, label, icon, center, ...props }: TabButtonProps) {
  return (
    <Pressable {...props} style={styles.item}>
      {center ? (
        <View style={[styles.fab, isFocused && styles.fabFocused]}>
          <Ionicons name={icon} size={24} color="#fff" />
        </View>
      ) : (
        <Ionicons name={icon} size={20} color={isFocused ? colors.primary : colors.textFaint} />
      )}
      <Text style={[styles.label, isFocused && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={{ flex: 1, backgroundColor: colors.bg }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton label="Discover" icon="compass-outline" />
        </TabTrigger>
        <TabTrigger name="explore" href="/explore" asChild>
          <TabButton label="Explore" icon="navigate-outline" />
        </TabTrigger>
        <TabTrigger name="live" href="/live" asChild>
          <TabButton label="Live" icon="flash" center />
        </TabTrigger>
        <TabTrigger name="social" href="/social" asChild>
          <TabButton label="Social" icon="people-outline" />
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton label="Passport" icon="id-card-outline" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    paddingTop: 8,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  label: { fontSize: 10, fontFamily: fonts.bodyBold, color: colors.textFaint },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginTop: -22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-8deg' }],
  },
  fabFocused: { backgroundColor: colors.pink },
});
