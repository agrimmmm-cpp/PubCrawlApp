import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Display, Screen } from '@/components/ui';
import { colors, fonts, space } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('up');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    if (mode === 'up') {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) setMessage(error.message);
      // With email confirmation on, there is no session until the link is tapped.
      else if (!data.session) setMessage('Check your email for a confirmation link, then sign in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage(error.message);
    }
    setBusy(false);
  };

  const ready = email.includes('@') && password.length >= 6;

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Text style={styles.wordmark}>
          drunkva<Text style={{ color: colors.primary }}>.</Text>
        </Text>
        <Display>
          {mode === 'up' ? 'Join the\n' : 'Welcome\n'}
          <Text style={{ color: colors.primary }}>{mode === 'up' ? 'night.' : 'back.'}</Text>
        </Display>

        <View style={{ marginTop: space.xl, gap: space.md }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (6+ characters)"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            style={styles.input}
          />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={{ marginTop: space.lg, flexDirection: 'row' }}>
          <Button
            label={busy ? 'One sec…' : mode === 'up' ? 'Create account' : 'Sign in'}
            onPress={ready && !busy ? submit : undefined}
            style={!ready ? { opacity: 0.4 } : undefined}
          />
        </View>

        <Text style={styles.switch} onPress={() => setMode(mode === 'up' ? 'in' : 'up')}>
          {mode === 'up' ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.lg, justifyContent: 'center', gap: space.sm },
  wordmark: { color: colors.text, fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.5, marginBottom: space.lg },
  input: {
    color: colors.text,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.line,
  },
  message: { color: colors.yellow, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: space.md },
  switch: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: space.lg, textAlign: 'center' },
});
