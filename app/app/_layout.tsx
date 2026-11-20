import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';

import { colors } from '@/constants/theme';
import { QuestCard } from '@/components/QuestCard';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LiveProvider } from '@/lib/live';
import { QuestProvider } from '@/lib/quests';
import { SocialProvider } from '@/lib/social';

export const unstable_settings = { anchor: '(tabs)' };

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.primary },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceGrotesk_700Bold,
    SpaceGrotesk_500Medium,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });
  if (!loaded) return null;

  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <LiveProvider>
          <QuestProvider>
            <SocialProvider>
              <StatusBar style="light" />
              <Routes />
              <QuestCard />
            </SocialProvider>
          </QuestProvider>
        </LiveProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function Routes() {
  const { configured, loading, session } = useAuth();
  if (loading) return null;
  const signedIn = !configured || !!session;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="experience/[id]" />
        <Stack.Screen name="recap" />
        <Stack.Screen name="admin/index" />
        <Stack.Screen name="admin/edit" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
