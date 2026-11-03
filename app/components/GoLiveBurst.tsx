import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts, space } from '@/constants/theme';

const LINES = [
  'Tonight is yours.',
  'Plot twist: this is going to be a great night.',
  'Main character hours.',
  "Tomorrow's problem is tomorrow's you.",
  'Go make a story worth telling.',
  'The city is open. Let it cook.',
];

const EXPERIENCE_LINES = ['The route is set. Let the night unfold.', 'Stop one is calling.', 'Adventure mode: on.'];

const SPARKS = ['🎉', '✨', '🍹', '🪩', '💥', '🎶', '🔥', '🥳', '⚡', '🍻', '🌟', '🎊'];

const { width, height } = Dimensions.get('window');
const DURATION = 2600;

function Spark({ emoji, index }: { emoji: string; index: number }) {
  const p = useSharedValue(0);
  const angle = (index / SPARKS.length) * Math.PI * 2;
  const dist = 120 + (index % 3) * 60;

  useEffect(() => {
    p.value = withDelay(350, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [p]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value < 0.8 ? p.value * 1.25 : (1 - p.value) * 5,
    transform: [
      { translateX: Math.cos(angle) * dist * p.value },
      { translateY: Math.sin(angle) * dist * p.value },
      { scale: 0.6 + p.value * 0.8 },
      { rotate: `${p.value * 200}deg` },
    ],
  }));

  return <Animated.Text style={[styles.spark, style]}>{emoji}</Animated.Text>;
}

export function GoLiveBurst({ mode, onDone }: { mode: 'freestyle' | 'experience'; onDone: () => void }) {
  // Lazy initialiser: picked once per mount, not on every render.
  const [line] = useState(() => {
    const pool = mode === 'experience' ? EXPERIENCE_LINES : LINES;
    return pool[Math.floor(Math.random() * pool.length)];
  });
  const [fading, setFading] = useState(false);

  const flood = useSharedValue(0);
  const emoji = useSharedValue(0);
  const wiggle = useSharedValue(0);
  const text = useSharedValue(0);
  const out = useSharedValue(1);

  useEffect(() => {
    flood.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    emoji.value = withDelay(250, withSpring(1, { damping: 7, stiffness: 140 }));
    wiggle.value = withDelay(
      600,
      withRepeat(withSequence(withTiming(-1, { duration: 140 }), withTiming(1, { duration: 140 })), 6, true),
    );
    text.value = withDelay(500, withTiming(1, { duration: 450 }));
    out.value = withDelay(DURATION - 350, withTiming(0, { duration: 350 }));

    const fade = setTimeout(() => setFading(true), DURATION - 350);
    const done = setTimeout(onDone, DURATION);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [flood, emoji, wiggle, text, out, onDone]);

  const floodStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.01 + flood.value * 28 }] }));
  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emoji.value }, { rotate: `${wiggle.value * 12}deg` }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 24 }],
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: out.value }));

  return (
    <Animated.View style={[styles.root, rootStyle]} pointerEvents={fading ? 'none' : 'auto'}>
      <Animated.View style={[styles.flood, floodStyle]} />
      {SPARKS.map((s, i) => (
        <Spark key={i} emoji={s} index={i} />
      ))}
      <Animated.Text style={[styles.emoji, emojiStyle]}>{mode === 'experience' ? '🧭' : '⚡'}</Animated.Text>
      <Animated.View style={textStyle}>
        <Text style={styles.live}>YOU&apos;RE LIVE</Text>
        <Text style={styles.line}>{line}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
    overflow: 'hidden',
    zIndex: 10,
    backgroundColor: colors.bg,
  },
  flood: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    top: height / 2 - 60,
    left: width / 2 - 60,
  },
  emoji: { fontSize: 110, marginBottom: space.lg },
  spark: { position: 'absolute', fontSize: 30 },
  live: { color: '#0B0B0D', fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 3, textAlign: 'center' },
  line: {
    color: '#fff',
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 38,
    letterSpacing: -1,
    textAlign: 'center',
    marginTop: space.sm,
  },
});
