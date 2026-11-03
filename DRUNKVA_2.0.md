# DrunkVA 2.0 — Your Night, Your Adventure

**Product vision • Feature architecture • User experience • Gamification**

> Status: planning document only. Nothing is built yet.

DrunkVA moves from a drink-tracking application to a product that solves a more universal problem:

> "It's Friday night. We want to go out, but nobody knows what to do."

The inspiration: a Reddit post recommending a night that started with wings and beers, moved to cocktails, included a scooter ride, dancing, arcade games, and ended with a late-night stop. That's not a bar crawl. That's an **experience**, and it should be DrunkVA's core product.

---

## 1. The new product identity

**Go out. Find your vibe. Make memories.**

Discover unforgettable nights, explore your city's nightlife, follow curated adventures, and capture the moments that make them worth remembering.

**Discover → Explore → Experience → Remember**

DrunkVA is a combination of:

- **AllTrails** — discover experiences, see ratings, difficulty, distance and routes.
- **Strava** — record activities, achievements and shareable summaries.
- **Google Maps** — navigate, explore nearby venues and see popular places.
- **Instagram** — share the highlights of your night.

The experience is the product. Tracking, photos and social interaction make that experience better.

---

## 2. The four main pages (tabs)

| Tab | Purpose |
|---|---|
| **Discover** | Find full night-out experiences and explore the live nightlife radar. |
| **Explore** | Browse individual bars, food spots, events, viewpoints and hidden gems. |
| **Social** | Share adventures, discover other people's experiences and save memories. |
| **Profile** | Your nightlife passport, completed experiences, badges and personal stats. |

---

## 3. Page 1: Discover — the heart of DrunkVA

Answers one question immediately: **"What can I do tonight?"**

Instead of an empty map or a drink counter, users land on a curated, personalized feed of experiences.

### Example experience cards (illustrative concepts, not verified itineraries or prices)

| Name | Duration | Stops | Cost | Description | Tags |
|---|---|---|---|---|---|
| **Gastown After Dark** | 4–5 hours | 5 | $$ | Cocktails, dancing, arcade games and late-night food. | Energetic • Groups • Nightlife |
| **Sunset to Sunrise** | 3–4 hours | 4 | $–$$ | Sunset viewpoints, casual drinks, waterfront walks and dessert. | Chill • Dates • Scenic |
| **The Chaos Circuit** | 5–6 hours | 6 | $$ | Pub games, karaoke, dancing, midnight snacks and spontaneous challenges. | Adventure • Friends • Games |

### Discovery categories

Tonight's Picks, Under $50, Hidden Gems, Best for Groups, Date Nights, Dancing, Live Music, Food Adventures, Trending Near You.

### Experience card contents

Photos, route preview, duration, estimated cost per person, walking distance, vibe, age restrictions where relevant, community ratings.

### Experience detail view

- Visual story of what the night looks like.
- Each stop, with images, reviews and what makes it special.
- Estimated spending, travel times, recommended start time.
- Community photos and tips from people who've completed it.
- Actions: save, customize, share with friends, start the experience.

### Crucial feature: "Remix This Night"

Love the Gastown itinerary but hate nightclubs? Replace the club with a karaoke bar, dessert spot or scenic viewpoint, and DrunkVA recalculates the route. An itinerary is a starting point, not a rigid schedule.

### The nightlife radar

An upward swipe from the experience feed expands a full-screen interactive map.

The radar isn't "bars near me." It shows **where the night is happening**: clusters of glowing dots representing areas with high nightlife activity. Tapping a dot opens a preview.

Example area preview (illustrative data):

- **Gastown Nightlife Zone** — High activity
- 12 nearby venues • 5 experiences • typical cost $$

Activity indicators: **Quiet, Picking Up, Lively, Very Busy, Packed.**

Data sources for estimates: aggregated opt-in DrunkVA check-ins and sessions, historical activity patterns, venue-provided information, and other properly licensed crowd signals.

**Important:** early on, with few users, clearly distinguish *predicted popularity* from *verified live activity*. Never invent an exact customer count from a handful of users.

---

## 4. Page 2: Explore — individual places

Discover helps users find an entire night. Explore helps them find **one great place right now**.

**Categories:** Bars, Food, After-hours, Activities, Hidden gems, Events, Viewpoints.

**Filters:** distance, price range, cuisine, music, dance floor, cover charge, happy hour, venue energy, wait time, whether the venue appears in a DrunkVA experience.

### Venue detail page

Beyond address and ratings: crowd level, DJ / live music, drink menu, happy-hour offers, food availability, recent community photos, nearby places for the next stop.

### Two differentiators

1. **"What's the move after this?"** — at a venue, discover nearby dessert shops, karaoke, arcades, scenic spots, late-night restaurants and available transport.
2. **"Find My Vibe"** — free-text prompts instead of category browsing, e.g. *"I want somewhere loud but not a nightclub"* or *"Cheap beers, good music, and somewhere to dance after."* DrunkVA returns places or a short experience that matches.

---

## 5. Page 3: Social — your night's story

Not a generic Instagram feed. Every memory is connected to an actual experience.

Example profile post: **Friday Night in Vancouver** — Completed experience • 5 stops • 4 memories • 1 night. *"Started with cocktails, found an arcade, ended with burgers. One of those nights."*

**Supports:**
- Public experience recaps
- Private friend-only memories
- Shared group albums
- Comments
- Tagged places
- Saved itineraries

### Strongest feature: "Recreate This Night"

Click a post and instantly get its itinerary, estimated costs and locations. Save it or customize it.

**The loop:** Discover an experience → live it → share it → inspire someone else to try it.

---

## 6. Page 4: Profile — your nightlife passport

Profiles are positioned around experiences collected, not alcohol consumed.

| Feature | Purpose |
|---|---|
| Nights explored | Number of completed adventures |
| Places discovered | Unique venues and spots visited |
| Cities explored | Different nightlife destinations |
| Memories | Photos, videos and group albums |
| Experience badges | Achievements for exploring |
| Drink journal | Optional personal drink history |
| Saved adventures | Itineraries to try later |
| Friends | People you've shared nights with |

**Badges (playful):** Gastown Explorer, Hidden Gem Hunter, Night Owl, Food Crawl Champion, Weekend Wanderer, City Legend.

Drink statistics stay in the private journal, with users choosing what they share. This makes the brand appealing to drinkers, non-drinkers, and mixed groups.

---

## 7. The most important feature: Live Experience Mode

Most navigation apps tell you where to go. DrunkVA makes the journey itself entertaining.

Tapping **Start Experience** switches into a live adventure interface, independent of the four main tabs.

Example live screen (conceptual):

- **YOUR NIGHT IS LIVE** — Gastown After Dark
- Stop 2 of 5 • 01:42 elapsed
- Next up: Cocktails — a short walk away
- Quick actions: **Moment** (photo), **Log drink**, **Group**
- "Your night, your pace — stay longer, skip a stop, or find somewhere new. The route adapts to your group."

**Biggest design rule:** the user should spend more time enjoying the night than looking at DrunkVA.

### Seven features that make Live Experience Mode special

1. **Automatic Night Story** — every photo is linked to its stop and timestamp. At the end, DrunkVA assembles a photo timeline with places, captions and a route recap. No manual album building.
2. **Surprise Me** — optional surprise stop (arcade, dessert, karaoke, scenic detour) for spontaneity.
3. **The Group Room** — temporary shared space with a common itinerary, group photos and voting on the next stop. Plan changes are visible to everyone.
4. **Voice-First Companion** — "Log a beer," "What's next?", "Find us food nearby." Works through supported phone shortcuts and in-app voice controls.
5. **Experience Challenges** — optional missions encouraging discovery, not drinking: find a hidden venue, take a creative group picture, try an arcade game, visit a new neighborhood. Completing them unlocks themed stamps.
6. **The Night Can Change** — "Change the vibe": dancing → food, loud → quiet, expensive → budget. Remaining stops are rearranged around group preferences and location.
7. **One-Tap Night Recap** — shareable recap with photos, places, route highlights, favorite moments and earned stamps. Editable before posting.

---

## 8. Where the original drink-tracking system fits

Keep it, but **secondary and optional**. Launch a standalone drink journal from a floating quick-action control or from Live Experience Mode.

**Journal retains:**
- Voice and manual drink logging (type, serving size, alcohol % when known)
- Session timer, drink timeline, estimated total alcohol, water reminders
- Optional notes about snacks, food and other moments
- Historical consumption patterns and private analytics
- Shareable summaries with user-controlled visibility

### Two changes from the original concept

1. **No consumption-based achievement.** No leaderboards for drinking quantity, speed, or chug records — they encourage risky competition. Leaderboards instead: experiences completed, unique places explored, community itineraries contributed, discovery challenges. Private consumption log stays, without rewarding higher intake.
2. **Buzz Points → optional "Pace Insight."** Summarizes time between drinks and estimated alcohol consumption. It must **not** claim to measure intoxication or whether someone is safe to drive (metabolism, food, serving sizes and more make that unreliable). Prompts favor water, food, breaks and safe transportation, never "have another."

---

## 9. Build My Night

A potentially highest-value feature: generate a night from preferences.

**Inputs:**
- **Where** are we going out?
- **Vibe:** a bit of everything / dancing and high energy / chill and scenic / spontaneous and surprising
- **Budget per person (CAD):** $20–40 / $40–70 / $70–120
- **Group size:** 1–2 / 3–5 / 6+
- **Must-have activities:** Food stops, Games, Live music, Dancing, Hidden gems, Scenic spots

**Output:** a generated sample experience.

In production this pulls from a database of curated experiences, venue hours, event schedules, current prices and route data. Initially no sophisticated AI is needed — a **rules-based recommender over well-tagged itineraries** can deliver a strong experience.

---

## 10. Application data model

Three core objects, rather than treating everything as a drink session:

- **Place** — bar, restaurant, viewpoint, arcade, event or other venue. Location, category, hours, prices, reviews, images.
- **Experience** — ordered, customizable collection of places and activities, including travel legs, budgets, media, reviews, suggested timing.
- **Night Session** — a live instance of an experience, with friends, navigation, check-ins, photos, optional drink logs, milestones and a final recap. Can also exist without an itinerary.

One experience can be completed thousands of times, each user can create their own version, and every night session generates new community content.

---

## 11. MVP and phasing

The first version should prove one hypothesis:

> Will people use DrunkVA to find a night-out experience, actually follow it, and share the results?

Launch in one area first: **Downtown Vancouver**, starting with **20–30 manually curated experiences** rather than cataloguing every bar.

| Priority | Feature | Why |
|---|---|---|
| MVP | Discover curated experiences | Core reason to install |
| MVP | Interactive itinerary details | Helps users decide |
| MVP | Explore map and filters | Supports spontaneous discovery |
| MVP | Live experience mode | Makes an itinerary usable |
| MVP | Photos and memories | Reason to return |
| MVP | Basic drink logging | Preserves original functionality |
| Phase 2 | Group planning and voting | Social advantage |
| Phase 2 | Itinerary remixing | Makes discovery personal |
| Phase 2 | Community-created experiences | Organic content |
| Phase 2 | Venue activity radar | Depends on sufficient data |
| Phase 3 | AI itinerary generation | Requires reliable place data |
| Phase 3 | Citywide live activity insights | Requires scale and privacy safeguards |

**Radar approach:** start with clearly labeled venue activity *predictions* and broad area signals. Precise live crowd info becomes useful only with enough participants.

**Privacy:** location and memory sharing are opt-in, with approximate public presence and no automatic disclosure of exact location.

---

## 12. Monetization

| Stream | How it works |
|---|---|
| Venue partnerships | Bars/activity providers promote specials or events, clearly labeled as sponsored |
| Premium experiences | Paid curated themed itineraries or exclusive event access |
| Affiliate bookings | Commission from tickets, tours, activities, reservations |
| DrunkVA Plus | Advanced group planning, custom recap styles, collaborative trip features |
| Venue analytics | Aggregated, privacy-preserving insights with adequate participation |

Basic itinerary discovery and starting an experience stay **free** — they are what gets people using the app.

---

## 13. Competitive advantage

The biggest opportunity isn't the map, drink tracker or AI. It's **community-generated nightlife experiences**, the way AllTrails users contribute reviews, photos and routes.

Someone finds a great combination of bars, street food and activities, creates an experience, shares photos and publishes it. Others try it, leave tips, suggest alternatives and create remixes. Over time the app builds a library of nights people have actually experienced, not generic algorithmic recommendations.

---

## 14. Product pillars

1. **Discovery** — what to do, where to go, what kind of night is possible.
2. **Adventure** — follow a flexible experience with friends, unlock activities, record moments.
3. **Memories** — turn a great night into a story worth sharing, saving and recreating.

**Inclusivity decision:** alcohol is not required to participate. Designated drivers, non-drinkers, and friends who want food, dancing and activities are first-class users.

## 15. The pitch

> DrunkVA is a social nightlife discovery platform that turns going out into an adventure. Discover curated experiences, explore what's happening around you, bring your friends, capture memories, and share your night — without the stress of planning it.

The best version of DrunkVA isn't an app that tells people how much they've drunk. It's an app that helps them answer **"What's the move tonight?"** and turns their answer into something memorable.

---

## Live tab: two modes (decided)

The centre **Live** button has two functions:

1. **Freestyle night** — go live with no itinerary. Still log drinks, water, food and capture moments, with a running timer and a night timeline. Tapping Go Live triggers a short, fun full-screen animation with a punchy line, so starting a night feels like an event.
2. **Experience night** — go live inside a curated itinerary (started from Discover's Start button or picked on the Live tab). Same logging and moments, plus stop-by-stop progress, the next stop, and skipping or advancing stops.

Both end in the same recap (timeline, moments, places).

## Social: a separate connection layer (decided)

Social is more than a feed. It lets people **connect, make friends, and join each other's experiences if the host allows it**:

- Friend requests, friend list, search by username, invite links.
- Hosts choose who can join a live night: nobody, friends, invite-only.
- Join a friend's live or planned night, shown in the Group Room.
- Privacy by default: no exact location shared without opt-in.

This is its own build phase and needs its own schema (friendships, join requests, night invitations).

## Decisions made

- **Platform:** React Native + Expo (iOS and Android from one codebase).
- **Backend:** Supabase, from day one, for auth, Postgres data (places, experiences, night sessions), photo storage and social features.
- **First build slice:** full app skeleton: all four tabs (Discover, Explore, Social, Profile) as placeholders, then fill in.

## Open questions (to resolve before building)

- Source of place data (Google Places, Foursquare, manual curation)?
- Who curates the first 20–30 Vancouver experiences?
- Age-gating and responsible-use messaging requirements?
