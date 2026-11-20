// place-info: the only place that talks to Google Places. The key lives here as a server secret, never in the app.
//
//   POST { placeId, kind: 'photo' | 'details' }   (signed-in users only)
//
//   photo    one cheap call: the first photo of the place and its author credit.
//   details  rating, review count, price level, opening hours, a Google Maps link, and the first photo.
//
// Nothing is stored: Google's policies allow keeping only the place id. Each answer goes straight back to the phone.
// A daily budget (per person and for the whole app) stops a bug or a busy night from running up the bill.
//
// Secrets to set (Supabase dashboard > Edge Functions > Secrets):
//   GOOGLE_PLACES_API_KEY      required
//   GOOGLE_USER_DAILY_LIMIT    optional, Google requests per person per day (default 300, about 150 places)
//   GOOGLE_DAILY_LIMIT         optional, Google requests for everyone per day (default 1500)
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GOOGLE = 'https://places.googleapis.com/v1';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const PRICE: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

async function google(path: string, fieldMask: string | null) {
  const headers: Record<string, string> = { 'X-Goog-Api-Key': Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '' };
  if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask;
  return await fetch(`${GOOGLE}/${path}`, { headers });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  if (!Deno.env.get('GOOGLE_PLACES_API_KEY')) return json({ error: 'not_configured' }, 503);

  // Who is asking. The platform has already checked the token is valid; this reads which person it belongs to.
  const url = Deno.env.get('SUPABASE_URL')!;
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const asUser = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!);
  const { data: who } = await asUser.auth.getUser(token); // the token is passed in, so no stored session is needed
  if (!who?.user) return json({ error: 'sign_in' }, 401);

  let body: { placeId?: string; kind?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const placeId = body.placeId ?? '';
  const kind = body.kind === 'details' ? 'details' : 'photo';
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(placeId)) return json({ error: 'bad_place' }, 400);

  // A details request costs a details call plus a photo call; a photo request costs the same two. Count both up front.
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: allowed } = await admin.rpc('google_usage_bump', {
    p_user: who.user.id,
    p_calls: 2,
    p_user_limit: Number(Deno.env.get('GOOGLE_USER_DAILY_LIMIT') ?? 300),
    p_global_limit: Number(Deno.env.get('GOOGLE_DAILY_LIMIT') ?? 1500),
  });
  if (!allowed) return json({ error: 'budget' }, 429);

  // Ask for as little as possible: a field mask is what keeps this on the cheaper Google price tiers.
  const mask =
    kind === 'details'
      ? 'id,rating,userRatingCount,priceLevel,regularOpeningHours.weekdayDescriptions,currentOpeningHours.openNow,googleMapsUri,photos.name,photos.authorAttributions'
      : 'photos.name,photos.authorAttributions';
  const res = await google(`places/${placeId}`, mask);
  if (res.status === 404) return json({ error: 'not_found' }, 404);
  if (!res.ok) return json({ error: 'google', status: res.status }, 502);
  const p = await res.json();

  const out: Record<string, unknown> = {};
  if (kind === 'details') {
    out.rating = p.rating ?? null;
    out.ratingCount = p.userRatingCount ?? null;
    out.priceLevel = p.priceLevel in PRICE ? PRICE[p.priceLevel] : null;
    out.openNow = p.currentOpeningHours?.openNow ?? null;
    out.weekdayText = p.regularOpeningHours?.weekdayDescriptions ?? null;
    out.mapsUri = p.googleMapsUri ?? null;
  }

  const photo = p.photos?.[0];
  if (photo?.name) {
    const media = await google(`${photo.name}/media?maxWidthPx=900&skipHttpRedirect=true`, null);
    if (media.ok) {
      const m = await media.json();
      out.photoUri = m.photoUri ?? null;
      out.photoBy = photo.authorAttributions?.[0]?.displayName ?? null;
      out.photoByUri = photo.authorAttributions?.[0]?.uri ?? null;
    }
  }
  return json(out);
});
