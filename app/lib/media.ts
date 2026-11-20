import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform, Share } from 'react-native';

import { supabase, supabaseConfigured } from '@/lib/supabase';

export type Captured = { uri: string; type: 'photo' | 'video' };
export type CaptureResult = { ok: true; media: Captured } | { ok: false; reason: 'cancelled' | 'denied' | 'error' };

/**
 * Opens the camera for a photo, a video (up to 15 seconds) or either, and keeps the result in the app's own
 * storage so it survives the picker's temporary files. Photos and videos stay on the phone until shared.
 * On the web there is no camera, so the browser's file chooser opens instead.
 */
// The in-app camera (components/CameraHost) registers itself here. It saves selfies un-mirrored, which the phone's
// built-in camera does not always do.
type CameraHostFn = (kind: 'photo' | 'video' | 'either') => Promise<Captured | 'denied' | null>;
let cameraHost: CameraHostFn | null = null;
export const registerCameraHost = (fn: CameraHostFn | null) => {
  cameraHost = fn;
};

export async function capture(kind: 'photo' | 'video' | 'either'): Promise<CaptureResult> {
  try {
    if (Platform.OS !== 'web' && cameraHost) {
      const r = await cameraHost(kind);
      if (r === 'denied') return { ok: false, reason: 'denied' };
      if (!r) return { ok: false, reason: 'cancelled' };
      return { ok: true, media: { uri: await keep(r.uri, r.type), type: r.type } };
    }
    const mediaTypes: ImagePicker.MediaType[] = kind === 'photo' ? ['images'] : kind === 'video' ? ['videos'] : ['images', 'videos'];
    const options: ImagePicker.ImagePickerOptions = { mediaTypes, quality: 0.7, videoMaxDuration: 15 };
    let result: ImagePicker.ImagePickerResult;
    if (Platform.OS === 'web') {
      result = await ImagePicker.launchImageLibraryAsync(options);
    } else {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'denied' };
      result = await ImagePicker.launchCameraAsync(options);
    }
    if (result.canceled || !result.assets?.length) return { ok: false, reason: 'cancelled' };
    const asset = result.assets[0];
    const type = asset.type === 'video' ? 'video' : 'photo';
    return { ok: true, media: { uri: await keep(asset.uri, type), type } };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** Copy a picked file into the app's document folder. Falls back to the original path if copying fails. */
async function keep(uri: string, type: 'photo' | 'video') {
  if (Platform.OS === 'web') return uri;
  try {
    const dir = new Directory(Paths.document, 'moments');
    dir.create({ idempotent: true, intermediates: true });
    const dest = new File(dir, `${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`);
    await new File(uri).copy(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

/**
 * Share a moment with friends. Uploads it to the private `moments` bucket and records it in the `moments` table when
 * signed in to Supabase; otherwise opens the phone's share sheet. Nothing is uploaded until this is called.
 */
export async function shareMoment(m: { uri: string; type: 'photo' | 'video' }, who: { userId?: string; sessionId?: string }) {
  if (supabaseConfigured && who.userId && Platform.OS !== 'web') {
    try {
      const file = new File(m.uri);
      const path = `${who.userId}/${who.sessionId ?? 'night'}/${file.name}`;
      const up = await supabase.storage.from('moments').upload(path, await file.arrayBuffer(), {
        contentType: m.type === 'video' ? 'video/mp4' : 'image/jpeg',
        upsert: true,
      });
      if (!up.error) {
        await supabase.from('moments').insert({ session_id: who.sessionId ?? null, author_id: who.userId, media_url: path });
        return 'uploaded' as const;
      }
    } catch {
      // Fall through to the share sheet.
    }
  }
  try {
    await Share.share(Platform.OS === 'ios' ? { url: m.uri } : { message: 'A moment from my night on DrunkVA' });
    return 'shared' as const;
  } catch {
    return 'failed' as const;
  }
}
