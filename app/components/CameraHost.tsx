import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { Captured, registerCameraHost } from '@/lib/media';

type Kind = 'photo' | 'video' | 'either';
type Request = { kind: Kind; resolve: (r: Captured | 'denied' | null) => void };

const MAX_SECONDS = 15;

/**
 * The app's own camera. The phone's built-in camera can save selfies flipped (mirrored), so this one never does: the
 * preview looks like a mirror while you frame it, and the saved photo or video is the way the world sees you.
 * Mounted once at the root; media.ts opens it through registerCameraHost.
 */
export function CameraHost() {
  const [req, setReq] = useState<Request | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [mode, setMode] = useState<'picture' | 'video'>('picture');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const cam = useRef<CameraView>(null);
  const [camPerm, askCamera] = useCameraPermissions();
  const [, askMic] = useMicrophonePermissions();

  const present = useCallback(
    async (kind: Kind) => {
      const cam = camPerm?.granted ? camPerm : await askCamera();
      if (!cam.granted) return 'denied' as const;
      if (kind !== 'photo') await askMic(); // video is still fine without sound if this is refused
      return new Promise<Captured | 'denied' | null>((resolve) => {
        setMode(kind === 'video' ? 'video' : 'picture');
        setFacing('back');
        setSeconds(0);
        setReq({ kind, resolve });
      });
    },
    [camPerm, askCamera, askMic],
  );

  useEffect(() => {
    registerCameraHost(present);
    return () => registerCameraHost(null);
  }, [present]);

  // Count the seconds while recording.
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const finish = (r: Captured | null) => {
    req?.resolve(r);
    setReq(null);
    setRecording(false);
    setBusy(false);
  };

  const shutter = async () => {
    if (busy || !cam.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (mode === 'picture') {
      setBusy(true);
      try {
        const pic = await cam.current.takePictureAsync({ quality: 0.8 });
        finish({ uri: pic.uri, type: 'photo' });
      } catch {
        finish(null);
      }
      return;
    }
    if (recording) {
      cam.current.stopRecording();
      return;
    }
    setRecording(true);
    setSeconds(0);
    try {
      const vid = await cam.current.recordAsync({ maxDuration: MAX_SECONDS });
      finish(vid?.uri ? { uri: vid.uri, type: 'video' } : null);
    } catch {
      finish(null);
    }
  };

  return (
    <Modal visible={!!req} animationType="slide" onRequestClose={() => finish(null)} statusBarTranslucent>
      <View style={styles.wrap}>
        {req ? <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} mode={mode} mirror={false} /> : null}

        <View style={styles.top}>
          <Pressable onPress={() => (recording ? null : finish(null))} hitSlop={14} style={styles.round}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {recording ? (
            <View style={styles.rec}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>
                0:{String(seconds).padStart(2, '0')} / 0:{MAX_SECONDS}
              </Text>
            </View>
          ) : null}
          <Pressable onPress={() => !recording && setFacing((f) => (f === 'back' ? 'front' : 'back'))} hitSlop={14} style={[styles.round, recording && { opacity: 0.3 }]}>
            <Ionicons name="camera-reverse" size={26} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.bottom}>
          {req?.kind === 'either' && !recording ? (
            <View style={styles.modes}>
              {(['picture', 'video'] as const).map((m) => (
                <Pressable key={m} onPress={() => setMode(m)}>
                  <Text style={[styles.modeText, mode === m && { color: colors.primary }]}>{m === 'picture' ? 'PHOTO' : 'VIDEO'}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Pressable onPress={shutter} style={styles.shutterRing}>
            <View style={[styles.shutter, mode === 'video' && { backgroundColor: '#FF3B30' }, recording && styles.stop]} />
          </Pressable>
          {facing === 'front' ? <Text style={styles.hint}>Saved the right way round, not mirrored</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000' },
  top: { position: 'absolute', top: 54, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  rec: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
  recDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF3B30' },
  recText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13 },
  bottom: { position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center', gap: 18 },
  modes: { flexDirection: 'row', gap: 28 },
  modeText: { color: '#fff', fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 2 },
  shutterRing: { width: 82, height: 82, borderRadius: 41, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  stop: { width: 32, height: 32, borderRadius: 8 },
  hint: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.body, fontSize: 12 },
});
