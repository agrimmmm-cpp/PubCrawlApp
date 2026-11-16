#!/usr/bin/env python3
"""Generate night-out itineraries from the Metro Vancouver places list.

    python3 scripts/generate_experiences.py > supabase/migrations/007_generated_experiences.sql

Rule based, no AI and no ratings. For each neighbourhood hub it tries a set of themes (pub crawl, brewery crawl,
karaoke, live music, food-cart crawl, student night, sunset stroll, night views...) and keeps the ones it can
fill with a walkable, open-at-the-time sequence of real places. A theme can end with a scenic finale that is too
far to walk, which becomes a ride leg. Every experience gets an estimated cost and budget / all-ages tags so the
app can filter by price. Output is marked is_curated = false so hand-curated experiences are never overwritten.
Venue hours come from OpenStreetMap and may be stale; costs are estimates by kind of place.
"""
import collections
import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from algo import config as C  # noqa: E402
from algo.hours import FRIDAY, metres  # noqa: E402
from algo.score import load_signals  # noqa: E402
from algo.search import build  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "supabase" / "data" / "places_metro_vancouver.csv"
# Approximate neighbourhood centres (name, city, lat, lng, radius m). More hubs are found automatically in the suburbs.
HUBS = [
    ("Gastown", "Vancouver", 49.2840, -123.1075, 750),
    ("Chinatown", "Vancouver", 49.2800, -123.0990, 600),
    ("Granville Strip", "Vancouver", 49.2800, -123.1210, 650),
    ("Yaletown", "Vancouver", 49.2740, -123.1220, 650),
    ("West End", "Vancouver", 49.2840, -123.1330, 800),
    ("Mount Pleasant", "Vancouver", 49.2640, -123.1000, 800),
    ("Commercial Drive", "Vancouver", 49.2740, -123.0695, 900),
    ("Kitsilano", "Vancouver", 49.2680, -123.1550, 900),
    ("Metrotown", "Burnaby", 49.2276, -123.0076, 900),
    ("Brentwood", "Burnaby", 49.2665, -123.0000, 900),
    ("Surrey Central", "Surrey", 49.1887, -122.8479, 1000),
    ("Richmond Centre", "Richmond", 49.1666, -123.1364, 1000),
    ("Steveston", "Richmond", 49.1253, -123.1833, 800),
    ("New Westminster Quay", "New Westminster", 49.2010, -122.9120, 900),
    ("Lonsdale", "North Vancouver", 49.3100, -123.0827, 900),
]
HUBS = [h + (900,) for h in HUBS]  # (..., max walking leg in metres)

ACTIVITY_SUBS = {"arcade", "bowling", "escape room", "mini golf", "trampoline"}
CULTURE_SUBS = {"theatre", "cinema"}
BAR_SUBS = {"bar", "pub", "brewery", "distillery", "beer garden"}
CHEAP_EAT_SUBS = {"fast food", "food cart", "cafe", "dessert", "bakery", "market", "food court"}
DESSERT_SUBS = {"dessert", "bakery", "cafe"}
SCENIC_SUBS = {"viewpoint", "beach", "pier", "peak"}
ADULT_SUBS = {"bar", "pub", "brewery", "distillery", "beer garden", "nightclub", "live music", "casino"}

# Typical spend per person (CAD), used when the places file has no estimate.
COST_BY_SUB = {
    "restaurant": 30, "fast food": 14, "food cart": 12, "cafe": 8, "dessert": 7, "bakery": 8, "market": 15,
    "food court": 15, "bar": 24, "pub": 24, "brewery": 22, "distillery": 22, "beer garden": 22, "nightclub": 25,
    "live music": 25, "arcade": 20, "bowling": 22, "escape room": 35, "karaoke": 20, "mini golf": 15,
    "trampoline": 25, "cinema": 18, "theatre": 40, "casino": 20, "attraction": 15, "museum": 20,
    "viewpoint": 0, "beach": 0, "pier": 0, "peak": 0, "park": 0,
}


def q(s):
    return "'" + s.replace("'", "''") + "'"


def load():
    with open(DATA, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        r["lat"], r["lng"] = float(r["lat"]), float(r["lng"])
        r["quality"] = int(r["quality"] or 0)
        r["chain"] = r["is_chain"] == "true"
        r["late"] = r["late_night"] == "true"
        r["hours_raw"] = r["hours"].split('"osm": "', 1)[1].rsplit('"', 1)[0] if r["hours"] else ""
        est = (r.get("est_cost_cad") or "").strip()
        r["cost"] = int(est) if est else COST_BY_SUB.get(r["subcategory"], 15)
        r["pt"] = (r["lat"], r["lng"])
    return rows


# ---------- role tests ----------
def sub_in(*names):
    return lambda r: r["subcategory"] in names


is_dinner = sub_in("restaurant")
is_bar = lambda r: r["subcategory"] in BAR_SUBS
is_brewery = sub_in("brewery", "distillery")
is_club = lambda r: r["category"] == "nightclub" and r["subcategory"] == "nightclub"
is_music = sub_in("live music")
is_activity = lambda r: r["subcategory"] in ACTIVITY_SUBS
is_karaoke = sub_in("karaoke")
is_culture = lambda r: r["subcategory"] in CULTURE_SUBS
is_cheap_eat = lambda r: r["subcategory"] in CHEAP_EAT_SUBS
is_cart = sub_in("food cart")
is_dessert = lambda r: r["subcategory"] in DESSERT_SUBS
is_sweet = sub_in("dessert", "bakery")
is_any_food = lambda r: r["category"] == "food"
is_scenic = lambda r: r["subcategory"] in SCENIC_SUBS
is_pub = sub_in("pub", "beer garden")
is_cocktail = sub_in("bar")
is_cafe = sub_in("cafe")
is_bakery_or_cafe = sub_in("bakery", "cafe")
is_arts = sub_in("arts", "museum", "attraction")
is_rink = sub_in("ice rink")
is_escape = sub_in("escape room")
is_theatre = sub_in("theatre")
is_cinema = sub_in("cinema")


# Stop: (role, test, stay minutes, must be a late spot, reached by ride)
def S(role, test, stay, late=False, ride=False):
    return (role, test, stay, late, ride)


def T(key, title, badge, emoji, gradient, start, vibe, why, stops):
    return dict(key=key, title=title, badge=badge, emoji=emoji, gradient=gradient, start=start, vibe=vibe, why=why, stops=stops)


ORANGE, PINK, BLUE, GOLD, GREEN, PURPLE = ("#3A2A0F", "#FF5C00"), ("#1A0F3A", "#FF3D81"), ("#0B2A4A", "#2D9CFF"), ("#2A1F0A", "#E0A030"), ("#0F3A2A", "#37E08A"), ("#3A0F5C", "#FF5C00")
H = lambda h, m=0: h * 60 + m

# A "crawl" is the same kind of place several times in a row, so every stop must really be that kind.
TEMPLATES = [
    # --- crawls ---
    T("pub-crawl", "Pub Crawl", "FRIENDS", "🍺", ORANGE, H(18), ["crawl", "pubs", "friends"],
      "Four pubs close together, so most of the night is spent out, not travelling.",
      [S("First round", is_pub, 55), S("Second round", is_pub, 55), S("Third round", is_pub, 55), S("Last call", is_pub, 55, True)]),
    T("bar-crawl", "Bar Crawl", "BAR HOP", "🍻", ORANGE, H(19), ["crawl", "bars", "friends", "nightlife"],
      "Three different bars on a short walk, ending somewhere open late.",
      [S("Opener", is_bar, 50), S("Middle round", is_bar, 55), S("Last call", is_bar, 55, True)]),
    T("cocktail-crawl", "Cocktail Crawl", "CRAFT COCKTAILS", "🍸", PINK, H(19, 30), ["crawl", "cocktails", "date", "nightlife"],
      "Three cocktail bars on foot, then something sweet to finish.",
      [S("Aperitif", is_cocktail, 55), S("Main pour", is_cocktail, 60), S("Nightcap", is_cocktail, 60, True), S("Something sweet", is_dessert, 25)]),
    T("brewery-crawl", "Brewery Crawl", "CRAFT BEER", "🍻", GOLD, H(15, 30), ["crawl", "brewery", "pubs", "friends"],
      "Taprooms close together, with a proper meal in the middle so the night lasts.",
      [S("First pour", is_brewery, 50), S("Second pour", is_brewery, 50), S("Dinner", is_dinner, 70), S("Last pour", is_brewery, 50)]),
    T("brewery-bites", "Brewery Hop & Bites", "CRAFT BEER", "🥨", GOLD, H(14, 30), ["crawl", "brewery", "dinner", "friends"],
      "Two taprooms, something quick to eat, then one more flight.",
      [S("Flight one", is_brewery, 50), S("Bite", is_cheap_eat, 30), S("Flight two", is_brewery, 50), S("Last pint", is_brewery, 45)]),
    T("brewery-views", "Brewery Crawl & Views", "CRAFT BEER + VIEW", "🌇", GOLD, H(15), ["crawl", "brewery", "scenic", "friends"],
      "Two taprooms, dinner, then a ride to a view to finish. Never drive after drinking.",
      [S("First pour", is_brewery, 50), S("Second pour", is_brewery, 50), S("Dinner", is_dinner, 70), S("The view", is_scenic, 30, False, True)]),
    T("coffee-crawl", "Café Crawl", "DAYTIME", "☕", ("#2A1F14", "#C98B5A"), H(10, 30), ["eat-crawl", "cafes", "chill", "all-ages"],
      "Three good cafés on foot, then something sweet.",
      [S("Coffee one", is_cafe, 35), S("Coffee two", is_cafe, 35), S("Coffee three", is_cafe, 35), S("Something sweet", is_dessert, 25)]),
    T("dessert-crawl", "Dessert Crawl", "SWEET", "🍰", ("#3A0F1F", "#FF7A59"), H(19), ["eat-crawl", "dessert", "date", "all-ages"],
      "Three sweet stops close together, for people who skip the bar.",
      [S("First treat", is_sweet, 25), S("Second treat", is_sweet, 25), S("Third treat", is_sweet, 25)]),
    T("food-carts", "Food Cart Crawl", "STREET EATS", "🌭", ORANGE, H(12, 30), ["eat-crawl", "street-food", "dinner", "chill"],
      "Small plates from a few cheap spots in a short walk, then something sweet.",
      [S("First bite", is_cart, 25), S("Second bite", is_cheap_eat, 30), S("Third bite", is_cheap_eat, 30), S("Something sweet", is_dessert, 20)]),
    # --- a meal plus something to do ---
    T("dinner-drinks", "Dinner & Drinks", "CLASSIC", "🍸", PINK, H(18, 30), ["dinner", "cocktails"],
      "Eat first, ease into drinks, then finish with a bite when the kitchens are closing.",
      [S("Dinner", is_dinner, 75), S("Drinks", is_bar, 70), S("Nightcap", is_bar, 70, True), S("Late bite", is_any_food, 30, True)]),
    T("games-night", "Games Night", "GAMES", "🕹️", ("#4A0E0E", "#FFD60A"), H(18, 30), ["games", "groups"],
      "Food first, then the games while everyone has energy, drinks after, and a late bite to end.",
      [S("Dinner", is_dinner, 60), S("Games", is_activity, 90), S("Drinks", is_bar, 70), S("Late bite", is_any_food, 30, True)]),
    T("play-first", "Play First", "GAMES", "🎯", ("#4A0E0E", "#FFD60A"), H(17), ["games", "friends", "groups"],
      "Start with the games, earn a proper dinner, then a couple of pints.",
      [S("Games", is_activity, 90), S("Dinner", is_dinner, 70), S("Pints", is_pub, 60), S("Last round", is_bar, 50, True)]),
    T("pints-and-play", "Pints & Play", "FRIENDS", "🎮", ("#4A0E0E", "#FF9A3D"), H(18), ["games", "pubs", "friends"],
      "A pint to start, games in the middle, another pub, then a bite.",
      [S("Pint", is_pub, 50), S("Games", is_activity, 80), S("Second pub", is_bar, 55), S("Late bite", is_any_food, 30, True)]),
    T("escape-night", "Escape Room Night", "TEAM UP", "🔐", ("#0F1A3A", "#2D9CFF"), H(17, 30), ["games", "groups", "friends"],
      "Fuel up, beat the clock together, then celebrate (or console yourselves) with a drink.",
      [S("Fuel up", is_cheap_eat, 40), S("Escape room", is_escape, 75), S("Debrief", is_bar, 70)]),
    T("rink-night", "Skate Night", "ACTIVE", "⛸️", BLUE, H(18), ["games", "friends", "chill", "all-ages"],
      "Warm up with a hot drink, skate, then a pub to thaw out.",
      [S("Warm-up", is_cafe, 25), S("Skate", is_rink, 75), S("Pub", is_pub, 60)]),
    T("culture-night", "Gallery & Cocktails", "CULTURE", "🖼️", ("#1A0F3A", "#9B6BFF"), H(16, 30), ["date", "chill", "cocktails"],
      "See something first, a proper dinner, then a quiet cocktail to talk about it.",
      [S("Gallery", is_arts, 60), S("Dinner", is_dinner, 80), S("Cocktail", is_cocktail, 70)]),
    T("theatre-night", "Dinner & a Show", "NIGHT OUT", "🎭", ("#3A0F1F", "#FF7A59"), H(18), ["date", "dinner"],
      "Dinner nearby, the show, then a drink while the streets quieten.",
      [S("Dinner", is_dinner, 70), S("The show", is_theatre, 120), S("Nightcap", is_bar, 60, True)]),
    T("movie-night", "Dinner & a Movie", "CHILL", "🎬", ("#0F1A3A", "#FF7A59"), H(18), ["date", "chill", "dinner", "all-ages"],
      "Dinner first, the movie, then dessert.",
      [S("Dinner", is_dinner, 60), S("The movie", is_cinema, 120), S("Dessert", is_dessert, 25)]),
    T("karaoke-night", "Karaoke Night", "SING", "🎤", ("#3A0F3A", "#FF3D81"), H(19), ["karaoke", "friends", "groups"],
      "Something to eat, warm up with a drink, then the mic, then a late bite.",
      [S("Dinner", is_cheap_eat, 50), S("Warm-up", is_bar, 55), S("Karaoke", is_karaoke, 90), S("Late bite", is_any_food, 30, True)]),
    T("live-music", "Live Music Night", "LIVE", "🎸", ("#0F1A3A", "#2D9CFF"), H(19), ["music", "nightlife"],
      "Dinner nearby, then the show, then a quiet drink to talk about it.",
      [S("Dinner", is_dinner, 60), S("The show", is_music, 120, True), S("Nightcap", is_bar, 60, True)]),
    T("dance-night", "Dance Night", "HIGH ENERGY", "🪩", PURPLE, H(19, 30), ["nightlife", "dancing"],
      "Dinner and a warm-up drink, then the club once it fills up, and a late bite on the way out.",
      [S("Dinner", is_dinner, 60), S("Warm-up", is_bar, 60), S("Dance", is_club, 120, True), S("Late bite", is_any_food, 30, True)]),
    T("date-night", "Date Night", "DATE NIGHT", "🌅", ("#3A0F1F", "#FF7A59"), H(17, 30), ["scenic", "date"],
      "Something to look at first, a proper dinner, then a quiet drink to talk.",
      [S("Start", lambda r: is_culture(r) or is_scenic(r), 60), S("Dinner", is_dinner, 90), S("Drinks", is_bar, 75)]),
    T("night-views", "Night Views", "SCENIC", "🌃", BLUE, H(18, 30), ["scenic", "dinner", "cocktails"],
      "Dinner and a drink, then a ride to a view to finish the night. Check it is open and lit after dark.",
      [S("Dinner", is_dinner, 75), S("Drinks", is_bar, 70), S("The view", is_scenic, 30, False, True)]),
    T("sunset-stroll", "Sunset Stroll", "CHILL", "🌇", ("#3A1F0F", "#FFB347"), H(16, 30), ["scenic", "chill", "date"],
      "A coffee or dessert, a walk to a view, then dinner. Slow and easy.",
      [S("Treat", is_dessert, 25), S("The view", is_scenic, 40), S("Dinner", is_dinner, 75)]),
    T("sunrise-start", "Sunrise Start", "EARLY", "🌅", ("#3A1F0F", "#FFD60A"), H(5, 45), ["scenic", "chill", "cafes", "all-ages"],
      "Catch the first light at a viewpoint, then breakfast and coffee nearby. Check the sunrise time for the day.",
      [S("First light", is_scenic, 40), S("Coffee", is_cafe, 35), S("Breakfast", is_bakery_or_cafe, 40)]),
    T("student-night", "Student Night", "BUDGET", "🎒", GREEN, H(18), ["games", "friends"],
      "Cheap eats, something fun to do, then a coffee or dessert, easy on the wallet.",
      [S("Cheap eats", is_cheap_eat, 40), S("Something fun", is_activity, 75), S("Dessert", is_dessert, 25)]),
    T("late-eats", "Late-Night Eats", "LATE", "🍟", ORANGE, H(22), ["dinner", "nightlife"],
      "A drink to start, then two late kitchens that are still open when everything else is closing.",
      [S("A drink", is_bar, 55, True), S("First bite", is_any_food, 30, True), S("Second bite", is_any_food, 30, True)]),
]


def auto_hubs(places, per_city=4):
    """Dense clusters of bars, clubs and activities outside Vancouver's hand-placed hubs (suburbs are spread out)."""
    hubs = []
    for city in sorted({p["city"] for p in places} - {"Vancouver"}):
        remaining = [p for p in places if p["city"] == city and p["category"] in ("bar", "nightclub", "activity")]
        for _ in range(per_city):
            best = None
            for c in remaining:
                near = [p for p in remaining if metres(c["pt"], p["pt"]) <= 1200]
                if best is None or len(near) > len(best):
                    best = near
            if not best or len(best) < 4:
                break
            lat = sum(p["lat"] for p in best) / len(best)
            lng = sum(p["lng"] for p in best) / len(best)
            streets = [a.split(" ", 1)[1] for a in (p["address"] for p in best) if a and a[0].isdigit() and " " in a]
            label = max(sorted(set(streets)), key=streets.count) if streets else f"{city} Centre"  # sorted: same result every run
            hubs.append((f"{label}, {city}" if streets else label, city, lat, lng, 1300, 1300))
            ids = {p["source_id"] for p in best}
            remaining = [p for p in remaining if p["source_id"] not in ids]
    return hubs


# Hubs named after a street. The street only goes in a crawl's name when at least two of its stops are on it.
HUB_STREET = {"Granville Strip": ("granville", "Downtown"), "Commercial Drive": ("commercial", "East Vancouver"), "Lonsdale": ("lonsdale", "Lower Lonsdale")}
STREET_TYPES = {"st": "street", "ave": "avenue", "av": "avenue", "dr": "drive", "rd": "road", "blvd": "boulevard", "hwy": "highway", "pl": "place", "ln": "lane", "cres": "crescent", "pkwy": "parkway"}
DIRECTIONS = {"w", "e", "n", "s", "west", "east", "north", "south", "nw", "ne", "sw", "se"}


def street_of(address):
    """'1082 Granville Street' -> 'granville street'; None when there is no street."""
    m = re.match(r"^\s*\d+[A-Za-z]?(?:\s*-\s*\d+)?\s+(.+?)(?:,.*)?$", address or "")
    if not m:
        return None
    words = m.group(1).lower().replace(".", "").split()
    while words and words[0] in DIRECTIONS:
        words = words[1:]
    words = [STREET_TYPES.get(w, w) for w in words]
    return " ".join(words) or None


def area_name(hub, stops, modes):
    """The place name to put in a crawl's title: the hub when the stops really are there, otherwise something true."""
    name, city = hub[0], hub[1]
    streets = collections.Counter(street_of(s["address"]) for s, m in zip(stops, modes) if m == "walk")
    streets.pop(None, None)
    if name in HUB_STREET:
        key, fallback = HUB_STREET[name]
        return name if sum(n for st, n in streets.items() if key in st) >= 2 else fallback
    if name.endswith(f", {city}"):  # an automatic suburb hub, named after the busiest street in its cluster
        label = name[: -len(city) - 2]
        key = street_of("1 " + label)
        if key and sum(n for st, n in streets.items() if st == key) >= 2:
            return name
        return city
    return name


MAX_OTHER_PER_HUB = 7
TEMPLATE_ORDER = {}


def trend_templates(trends):
    """Active trends that bring their own itinerary template (a list of [role, kinds, stay, late, ride])."""
    out = []
    for t in trends:
        tpl = t.get("template")
        if not tpl:
            continue
        stops = [S(role, (lambda kinds: lambda r: r["subcategory"] in kinds)(set(kinds)), stay, late, ride)
                 for role, kinds, stay, late, ride in tpl["stops"]]
        out.append(dict(tpl, gradient=tuple(tpl["gradient"]), stops=stops))
    return out


def generate(places, trends=None, signals=None, day=FRIDAY):
    for i, t in enumerate(TEMPLATES + trend_templates(C.load_trends() if trends is None else trends)):
        TEMPLATE_ORDER[t["key"]] = i
    """Run the search for every hub and template. Returns [(hub, tpl, title, stops, modes, minutes, cost, tags, score)]."""
    trends = C.load_trends() if trends is None else trends
    ctx = dict(signals=load_signals() if signals is None else signals, trends=trends, day=day, budget_per_stop=None)
    by_city = collections.defaultdict(list)
    for p in places:
        by_city[p["city"]].append(p)
    scenic_by_city = {c: [p for p in ps if is_scenic(p)] for c, ps in by_city.items()}

    used, exps, titles = {}, [], set()
    for hub in HUBS + auto_hubs(places):
        name, city, lat, lng, radius, _ = hub
        near = [r for r in by_city[city] if metres((lat, lng), r["pt"]) <= radius]
        found = []
        for tpl in TEMPLATES + trend_templates(trends):
            res = build(tpl, hub, near, scenic_by_city.get(city, []), used, ctx)
            if res:
                found.append((tpl, res))
        # Best first, then keep a varied set: no two nights may share three stops, at most 3 per kind of arc.
        found.sort(key=lambda f: (-f[1][3] / len(f[1][0]), f[0]["key"]))
        keep, non_crawl = [], 0
        for tpl, res in found:
            ids = {s["source_id"] for s in res[0]}
            if tpl["badge"] != "TRENDING" and any(len(ids & {s["source_id"] for s in k[1][0]}) >= 3 for k in keep):
                continue
            is_crawl = "crawl" in tpl["vibe"] or tpl["badge"] == "TRENDING"  # drinking crawls and trends are never capped out
            if not is_crawl and non_crawl >= MAX_OTHER_PER_HUB:
                continue
            non_crawl += not is_crawl
            keep.append((tpl, res))
        keep.sort(key=lambda k: TEMPLATE_ORDER[k[0]["key"]])  # deterministic output order
        for tpl, res in keep:
            stops, modes, minutes, total = res
            label = area_name(hub, stops, modes)
            short = label[: -len(city) - 2] if label.endswith(f", {city}") else label  # the city is already a tab in the app
            title = f"{short} {tpl['title']}"
            if title in titles:
                continue
            titles.add(title)
            name = label
            for s in stops:
                used[s["source_id"]] = used.get(s["source_id"], 0) + 1
            cost = int(round(sum(s["cost"] for s in stops) / 5.0) * 5)
            tags = list(tpl["vibe"])
            if cost <= 50:
                tags.append("budget")
            if cost <= 40:
                tags.append("student")
            if not any(s["subcategory"] in ADULT_SUBS for s in stops):
                tags.append("all-ages")
            if sum(1 for s in stops if s["late"]) >= 2:
                tags.append("late")
            if tpl["badge"] == "TRENDING":
                tags.append("trending")
            exps.append(((label,) + tuple(hub[1:]), tpl, title, stops, modes, minutes, cost, tags, total / len(stops)))
    return exps


def main():
    places = load()
    exps = generate(places)

    out = [
        "-- Generated by scripts/generate_experiences.py. Re-run safe. Needs migrations 004-006 and the places loaded.",
        "-- Rule based itineraries (is_curated = false). Hours are from OpenStreetMap and may be stale; costs are estimates.",
        "alter table experiences add column if not exists city text, add column if not exists hub text,",
        "  add column if not exists lat double precision, add column if not exists lng double precision;",
        "alter table experience_stops add column if not exists travel_mode text default 'walk';",
        "alter table experience_stops add column if not exists why_here text;",
        "alter table experiences add column if not exists score real;",
        "create index if not exists experiences_city_idx on experiences (city);",
        "create index if not exists experiences_cost_idx on experiences (est_cost_cad);",
        "update night_sessions set experience_id = null where experience_id in (select id from experiences where is_curated = false and author_id is null);",
        "delete from experiences where is_curated = false and author_id is null;",
        "",
    ]
    cols = "(title, badge, emoji, gradient, duration_minutes, est_cost_cad, description, why_order, best_night, start_time, vibe, city, hub, score, is_curated, is_public)"
    rows = []
    for hub, tpl, title, stops, modes, minutes, cost, tags, sc in exps:
        roles = ", ".join(s["role"].lower() for s in stops)
        rows.append(
            f"({q(title)}, {q(tpl['badge'])}, {q(tpl['emoji'])}, array[{q(tpl['gradient'][0])},{q(tpl['gradient'][1])}], {minutes}, {cost}, "
            f"{q(f'{hub[0]}, {hub[1]}: {roles}.')}, {q(tpl['why'])}, 'Fri-Sat', {q('%02d:%02d' % divmod(tpl['start'], 60))}, "
            f"array[{','.join(q(v) for v in tags)}], {q(hub[1])}, {q(hub[0])}, {round(sc, 4)}, false, true)"
        )
    for i in range(0, len(rows), 100):
        out.append(f"insert into experiences {cols} values\n" + ",\n".join(rows[i : i + 100]) + ";")
    out.append("")
    srows = []
    for hub, tpl, title, stops, modes, minutes, cost, tags, _ in exps:
        for i, (s, m) in enumerate(zip(stops, modes), 1):
            why = ", ".join(s["why"])
            srows.append(f"({q(title)}, {i}, {q(s['source_id'])}, {s['stay']}, {q(m)}, {q(why)})")
    for i in range(0, len(srows), 400):
        out.append(
            "insert into experience_stops (experience_id, position, place_id, stay_minutes, travel_mode, why_here)\n"
            "select e.id, v.pos, p.id, v.stay, v.mode, v.why from (values\n" + ",\n".join(srows[i : i + 400]) +
            "\n) as v(title, pos, osm_id, stay, mode, why)\n"
            "join experiences e on e.title = v.title and e.is_curated = false\n"
            "join places p on p.source = 'osm' and p.source_id = v.osm_id;"
        )
    out += [
        "",
        "-- Hand-drafted experiences are all in Vancouver.",
        "update experiences set city = 'Vancouver' where is_curated and city is null;",
        "-- Every experience gets a map position: the centre of its stops (used for Near me).",
        "update experiences e set lat = s.lat, lng = s.lng from (",
        "  select st.experience_id, avg(p.lat) as lat, avg(p.lng) as lng",
        "  from experience_stops st join places p on p.id = st.place_id group by st.experience_id",
        ") s where e.id = s.experience_id;",
    ]
    print("\n".join(out))

    print(f"{len(exps)} experiences", file=sys.stderr)
    print("by theme:", dict(collections.Counter(e[1]["title"] for e in exps)), file=sys.stderr)
    print("by city:", dict(collections.Counter(e[0][1] for e in exps)), file=sys.stderr)
    costs = [e[6] for e in exps]
    print(f"cost ${min(costs)}-${max(costs)}; under $50: {sum(c <= 50 for c in costs)}; student: {sum('student' in e[7] for e in exps)}; all-ages: {sum('all-ages' in e[7] for e in exps)}; with a ride leg: {sum('ride' in e[4] for e in exps)}", file=sys.stderr)
    for hub, tpl, title, stops, modes, minutes, cost, tags, _ in exps[:8]:
        print(f"  {title} (${cost}, {minutes} min): " + " > ".join(("🚗 " if m == "ride" else "") + s["name"] for s, m in zip(stops, modes)), file=sys.stderr)


if __name__ == "__main__":
    main()
