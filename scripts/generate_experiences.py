#!/usr/bin/env python3
"""Generate night-out itineraries from the Metro Vancouver places list.

    python3 scripts/generate_experiences.py > supabase/migrations/007_generated_experiences.sql

Rule based, no AI and no ratings: for each neighbourhood hub it picks a walkable sequence of stops
(dinner, bars, an activity, a late bite) that are open at the time you would arrive on a Friday night,
preferring independent venues with complete records. Output is marked is_curated = false so hand
curated experiences are never overwritten. Venue hours come from OpenStreetMap and may be stale.
"""
import csv
import math
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "supabase" / "data" / "places_metro_vancouver.csv"
FRIDAY = 4  # Mo=0
DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

# Approximate neighbourhood centres (lat, lng) and a walkable radius in metres.
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

ACTIVITY_SUBS = {"arcade", "bowling", "escape room", "mini golf", "karaoke", "trampoline"}
CULTURE_SUBS = {"viewpoint", "theatre", "cinema"}  # "attraction" is too noisy in OSM (libraries, offices)
BAR_SUBS = {"bar", "pub", "brewery", "distillery", "beer garden"}


# ---------- opening hours ----------
def _days(spec):
    out = set()
    for tok in (t.strip() for t in spec.split(",") if t.strip()):
        if "-" in tok:
            a, b = tok.split("-", 1)
            if a in DAYS and b in DAYS:
                i, j = DAYS.index(a), DAYS.index(b)
                while True:
                    out.add(i)
                    if i == j:
                        break
                    i = (i + 1) % 7
        elif tok in DAYS:
            out.add(DAYS.index(tok))
        else:
            return None
    return out


def _rules(hours):
    """-> list of (days:set, intervals:list[(start,end)]) or None when a rule cannot be read."""
    rules = []
    for part in (p.strip() for p in hours.split(";") if p.strip()):
        m = re.search(r"\d\d:\d\d|\boff\b|\bclosed\b", part)
        if not m:
            return None
        day_spec = part[: m.start()].strip()
        times = part[m.start():].strip()
        days = set(range(7)) if not day_spec else _days(day_spec)
        if days is None:
            return None
        if times in ("off", "closed"):
            rules.append((days, []))
            continue
        iv = []
        for a, b, c, d in re.findall(r"(\d\d):(\d\d)\s*-\s*(\d\d):(\d\d)", times):
            s, e = int(a) * 60 + int(b), int(c) * 60 + int(d)
            iv.append((s, e if e > s else e + 1440))  # past midnight
        if not iv:
            return None
        rules.append((days, iv))
    return rules


def open_at(hours, day, minute):
    """True / False, or None when the hours are missing or unreadable."""
    if not hours:
        return None
    if "24/7" in hours:
        return True
    rules = _rules(hours)
    if rules is None:
        return None
    today = prev = None
    for days, iv in rules:  # later rules override earlier ones for the same day
        if day in days:
            today = iv
        if (day - 1) % 7 in days:
            prev = iv
    if today and any(s <= minute < e for s, e in today):
        return True
    if prev and any(s <= minute + 1440 < e for s, e in prev):
        return True
    return False


# ---------- helpers ----------
def metres(a, b):
    r = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


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
        r["hours_raw"] = (r["hours"].split('"osm": "', 1)[1].rsplit('"', 1)[0] if r["hours"] else "")
    return rows


# ---------- templates ----------
# Each stop: (role, allowed category/subcategory test, stay minutes, must be a late spot)
def is_food(r):
    return r["category"] == "food"


def is_dinner(r):
    return r["subcategory"] == "restaurant"


def is_bar(r):
    return r["subcategory"] in BAR_SUBS
def is_club(r):
    return r["category"] == "nightclub"
def is_activity(r):
    return r["subcategory"] in ACTIVITY_SUBS
def is_culture(r):
    return r["subcategory"] in CULTURE_SUBS


TEMPLATES = [
    dict(key="dinner-drinks", title="Dinner & Drinks", badge="CLASSIC", emoji="🍸", gradient=("#1A0F3A", "#FF3D81"), start=18 * 60 + 30,
         vibe=["dinner", "cocktails"], why="Eat first, ease into drinks, then finish with a bite when the kitchens are closing.",
         stops=[("Dinner", is_dinner, 75, False), ("Drinks", is_bar, 70, False), ("Nightcap", is_bar, 70, True), ("Late bite", is_food, 30, True)]),
    dict(key="pub-crawl", title="Pub Crawl", badge="FRIENDS", emoji="🍺", gradient=("#3A2A0F", "#FF5C00"), start=18 * 60,
         vibe=["pubs", "friends"], why="Short walks between spots, so most of the night is spent drinking, not travelling.",
         stops=[("First round", is_bar, 55, False), ("Second round", is_bar, 55, False), ("Third round", is_bar, 55, False), ("Last call", is_bar, 55, True)]),
    dict(key="games-night", title="Games Night", badge="GAMES", emoji="🕹️", gradient=("#4A0E0E", "#FFD60A"), start=18 * 60 + 30,
         vibe=["games", "groups"], why="Food first, then the games while everyone has energy, drinks after, and a late bite to end.",
         stops=[("Dinner", is_dinner, 60, False), ("Games", is_activity, 90, False), ("Drinks", is_bar, 70, False), ("Late bite", is_food, 30, True)]),
    dict(key="dance-night", title="Dance Night", badge="HIGH ENERGY", emoji="🪩", gradient=("#3A0F5C", "#FF5C00"), start=19 * 60 + 30,
         vibe=["nightlife", "dancing"], why="Dinner and a warm-up drink, then the club once it fills up, and a late bite on the way out.",
         stops=[("Dinner", is_dinner, 60, False), ("Warm-up", is_bar, 60, False), ("Dance", is_club, 120, True), ("Late bite", is_food, 30, True)]),
    dict(key="date-night", title="Date Night", badge="DATE NIGHT", emoji="🌅", gradient=("#0B2A4A", "#2D9CFF"), start=17 * 60 + 30,
         vibe=["scenic", "date"], why="Something to look at first, a proper dinner, then a quiet drink to talk.",
         stops=[("Start", is_culture, 60, False), ("Dinner", is_dinner, 90, False), ("Drinks", is_bar, 75, False)]),
]


def score(r, prev, used):
    s = r["quality"] + (0 if r["chain"] else 6) - used.get(r["source_id"], 0) * 2
    if prev:
        s -= metres((prev["lat"], prev["lng"]), (r["lat"], r["lng"])) / 150
    return s


def build(tpl, hub, pool, used):
    name, city, lat, lng, radius = hub
    near = [r for r in pool if r["city"] == city and metres((lat, lng), (r["lat"], r["lng"])) <= radius]
    picked, clock, prev = [], tpl["start"], None
    for role, test, stay, need_late in tpl["stops"]:
        cands = []
        for r in near:
            if not test(r) or r["source_id"] in {p["source_id"] for p in picked}:
                continue
            leg = metres((prev["lat"], prev["lng"]), (r["lat"], r["lng"])) if prev else 0
            if leg > 900 or (need_late and not r["late"]):
                continue
            arrive = clock + int(leg / 80)  # walking at ~80 m/min
            ok = open_at(r["hours_raw"], FRIDAY, arrive % 1440)
            if ok is False:
                continue
            cands.append((score(r, prev, used) - (2 if ok is None else 0), r, arrive))
        if not cands:
            return None
        cands.sort(key=lambda x: -x[0])
        _, r, arrive = cands[0]
        picked.append(dict(r, role=role, stay=stay))
        clock = arrive + stay
        prev = r
    walk = sum(metres((a["lat"], a["lng"]), (b["lat"], b["lng"])) for a, b in zip(picked, picked[1:]))
    return picked, int(sum(p["stay"] for p in picked) + walk / 80), walk


def main():
    places = load()
    used, exps, titles = {}, [], set()
    for hub in HUBS:
        for tpl in TEMPLATES:
            res = build(tpl, hub, places, used)
            if not res:
                continue
            stops, minutes, walk = res
            title = f"{hub[0]} {tpl['title']}"
            if title in titles:
                continue
            titles.add(title)
            for s in stops:
                used[s["source_id"]] = used.get(s["source_id"], 0) + 1
            exps.append((hub, tpl, title, stops, minutes))

    out = [
        "-- Generated by scripts/generate_experiences.py. Re-run safe. Needs migrations 004-006 and the places loaded.",
        "-- Rule based itineraries (is_curated = false). Hours are from OpenStreetMap and may be stale.",
        "update night_sessions set experience_id = null where experience_id in (select id from experiences where is_curated = false and author_id is null);",
        "delete from experiences where is_curated = false and author_id is null;",
        "",
    ]
    for hub, tpl, title, stops, minutes in exps:
        roles = ", ".join(s["role"].lower() for s in stops)
        desc = f"{hub[0]}, {hub[1]}: {roles}."
        out.append(
            "insert into experiences (title, badge, emoji, gradient, duration_minutes, description, why_order, best_night, start_time, vibe, is_curated, is_public) values "
            f"({q(title)}, {q(tpl['badge'])}, {q(tpl['emoji'])}, array[{q(tpl['gradient'][0])},{q(tpl['gradient'][1])}], {minutes}, "
            f"{q(desc)}, {q(tpl['why'])}, 'Fri-Sat', {q('%02d:%02d' % divmod(tpl['start'], 60))}, array[{','.join(q(v) for v in tpl['vibe'])}], false, true);"
        )
        for i, s in enumerate(stops, 1):
            out.append(
                "insert into experience_stops (experience_id, position, place_id, stay_minutes) "
                f"select e.id, {i}, p.id, {s['stay']} from experiences e, places p "
                f"where e.title = {q(title)} and e.is_curated = false and p.source = 'osm' and p.source_id = {q(s['source_id'])};"
            )
    print("\n".join(out))
    print(f"{len(exps)} experiences", file=sys.stderr)
    for hub, tpl, title, stops, minutes in exps[:6]:
        print(f"  {title} ({minutes} min): " + " > ".join(s["name"] for s in stops), file=sys.stderr)


if __name__ == "__main__":
    main()
