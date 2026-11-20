import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

/** Full-screen swipeable photos. Tap anywhere or the cross to close. */
export function PhotoViewer({ photos, start, onClose }: { photos: string[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  if (start === null) return null;
  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.wrap}>
        <FlatList
          data={photos}
          keyExtractor={(u, i) => u + i}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.min(start, photos.length - 1)}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Pressable onPress={onClose} style={{ width, height, justifyContent: 'center' }}>
              <Image source={{ uri: item }} style={{ width, height: height * 0.8 }} contentFit="contain" />
              <Text style={styles.count}>
                {index + 1} / {photos.length}
              </Text>
            </Pressable>
          )}
        />
        <Pressable onPress={onClose} hitSlop={16} style={styles.close}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  close: { position: 'absolute', top: 56, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', bottom: 60, alignSelf: 'center', color: colors.textDim, fontFamily: fonts.bodyBold, fontSize: 13 },
});
