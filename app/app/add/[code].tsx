import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { addByCode, CODE_MESSAGE, CodeResult } from '@/lib/feed';
import { supabaseConfigured } from '@/lib/supabase';

/** Opened from a link like drunkva://add/K7M2QX9P. Sends a friend request; the other person still has to accept. */
export default function AddByLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const [result, setResult] = useState<CodeResult | null>(null);

  useEffect(() => {
    if (!code || !supabaseConfigured) return;
    let cancelled = false;
    addByCode(String(code)).then((r) => !cancelled && setResult(r));
    return () => {
      cancelled = true;
    };
  }, [code]);

  const text = !supabaseConfigured ? 'Friends need an account. Sign in first.' : result ? CODE_MESSAGE[result] : 'Adding…';

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.big}>{text}</Text>
        <Button label="Go to Friends" icon="people" onPress={() => router.replace('/social')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: space.lg, gap: space.xl },
  big: { color: colors.text, fontFamily: fonts.display, fontSize: 28, letterSpacing: -1 },
});
