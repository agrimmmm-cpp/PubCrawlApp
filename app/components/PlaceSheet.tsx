import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PriceSigns, Stars } from '@/components/GoogleBits';
import { usePlacePhoto } from '@/components/PlaceCards';
import { colors, fonts, space } from '@/constants/theme';
import { Place } from '@/data/mock';
import { Group } from '@/lib/categories';
import { useGoogleInfo } from '@/lib/googlePlace';

const FOOD_AND_DRINK = new Set(['restaurant', 'fast food', 'food court', 'food cart', 'cafe', 'bakery', 'dessert', 'pub', 'beer garden', 'bar', 'brewery', 'distillery']);

const open = (url: string) => (Platform.OS === 'web' ? Linking.openURL(url) : WebBrowser.openBrowserAsync(url)).catch(() => {});

/**
 * What opens when you tap a place: a big photo, stars and price, today's hours, and the ways to go next. There is no free
 * source for menus, so "See the menu" opens the venue's own website (from OpenStreetMap); when it has none, it opens the
 * place in Google Maps instead, where the menu is usually listed.
 */
export function PlaceSheet({ place, group, onClose }: { place: Place; group?: Group; onClose: () => void }) {
  const { image, google: g, gradient } = usePlacePhoto(place, group, false);
  const details = useGoogleInfo(place.googleId, 'details'); // same request as the card, so no extra cost
  const info = g ?? details;
  const today = info?.weekdayText?.[(new Date().getDay() + 6) % 7];
  const eats = !!place.subcategory && FOOD_AND_DRINK.has(place.subcategory);
  const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.city ?? ''}`)}`;
  const menuUrl = place.website ?? info?.mapsUri ?? search;
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
  const price = info?.priceLevel != null || place.estCad == null ? null : place.estCad === 0 ? 'Free' : `about $${place.estCad} a person`;

  const facts = [
    place.subcategory ? place.subcategory[0].toUpperCase() + place.subcategory.slice(1) : '',
    place.cuisine ? place.cuisine.split(';').map((c) => c.trim().replace(/_/g, ' ')).join(', ') : '',
    price ?? '',
    place.age19 ? '19+' : '',
    place.late ? 'Open late' : '',
  ].filter(Boolean);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.photo}>
              {image ? (
                <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <LinearGradient colors={gradient} style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 56 }}>{place.emoji}</Text>
                </LinearGradient>
              )}
              <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.85)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
              <Pressable style={styles.close} onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
              <Text style={styles.name}>{place.name}</Text>
              {info?.photoUri ? (
                <Text style={styles.credit} numberOfLines={1}>
                  📷 {info.photoBy ?? 'Google contributor'} · Google Maps
                </Text>
              ) : place.photo?.credit ? (
                <Text style={styles.credit} numberOfLines={1}>
                  📷 {place.photo.credit} · {place.photo.license}
                </Text>
              ) : null}
            </View>

            <View style={styles.body}>
              {info && (info.rating || info.priceLevel != null || info.openNow != null) ? (
                <View style={styles.reviewRow}>
                  {info.rating ? <Stars rating={info.rating} count={info.ratingCount} size={17} /> : null}
                  <View style={styles.reviewRight}>
                    <PriceSigns level={info.priceLevel} size={15} />
                    {info.openNow != null ? <Text style={[styles.openTag, { color: info.openNow ? colors.green : colors.pink }]}>{info.openNow ? 'Open now' : 'Closed now'}</Text> : null}
                  </View>
                </View>
              ) : null}

              {facts.length ? <Text style={styles.facts}>{facts.join('  ·  ')}</Text> : null}
              {place.whyGo ? <Text style={styles.why}>{place.whyGo}</Text> : null}

              <View style={styles.block}>
                <Text style={styles.label}>HOURS</Text>
                <Text style={styles.text}>{today ?? (place.hours || 'Hours unknown. Check before you go.')}</Text>
              </View>
              {place.address ? (
                <View style={styles.block}>
                  <Text style={styles.label}>ADDRESS</Text>
                  <Text style={styles.text}>{place.address}</Text>
                </View>
              ) : null}

              <Pressable style={styles.primary} onPress={() => open(menuUrl)}>
                <Ionicons name={eats ? 'restaurant' : 'globe-outline'} size={18} color="#0B0B0D" />
                <Text style={styles.primaryText}>{eats ? 'See the menu' : 'Website and details'}</Text>
              </Pressable>
              <Text style={styles.hint}>{place.website ? 'Opens the venue’s own website.' : 'This place has no website on file, so this opens it in Google Maps.'}</Text>

              <View style={styles.actions}>
                <Pressable style={styles.secondary} onPress={() => open(dir)}>
                  <Ionicons name="navigate" size={17} color={colors.text} />
                  <Text style={styles.secondaryText}>Directions</Text>
                </Pressable>
                {place.phone ? (
                  <Pressable style={styles.secondary} onPress={() => Linking.openURL(`tel:${place.phone}`).catch(() => {})}>
                    <Ionicons name="call" size={17} color={colors.text} />
                    <Text style={styles.secondaryText}>Call</Text>
                  </Pressable>
                ) : null}
                {info?.mapsUri ? (
                  <Pressable style={styles.secondary} onPress={() => open(info.mapsUri!)}>
                    <Ionicons name="map" size={17} color={colors.text} />
                    <Text style={styles.secondaryText}>Google Maps</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.fine}>Place data © OpenStreetMap contributors. Ratings, prices and photos from Google Maps when shown. Hours can be out of date.</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', maxHeight: '92%' },
  photo: { height: 260, backgroundColor: colors.surface },
  close: { position: 'absolute', top: space.md, right: space.md, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  name: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, color: '#fff', fontFamily: fonts.display, fontSize: 32, lineHeight: 34, letterSpacing: -1.2 },
  credit: { position: 'absolute', left: space.lg, top: space.md + 4, maxWidth: '70%', color: 'rgba(255,255,255,0.75)', fontFamily: fonts.body, fontSize: 10 },
  body: { padding: space.lg, gap: space.md, paddingBottom: 36 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewRight: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  openTag: { fontFamily: fonts.bodyBold, fontSize: 13 },
  facts: { color: colors.textDim, fontFamily: fonts.bodyMedium, fontSize: 13 },
  why: { color: colors.text, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  block: { gap: 3 },
  label: { color: colors.textFaint, fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.6 },
  text: { color: colors.text, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, marginTop: space.sm },
  primaryText: { color: '#0B0B0D', fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.4 },
  hint: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 11, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondary: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 99, borderWidth: 1, borderColor: colors.line },
  secondaryText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  fine: { color: colors.textFaint, fontFamily: fonts.body, fontSize: 10, lineHeight: 14, marginTop: space.sm },
});
