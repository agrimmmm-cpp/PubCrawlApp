#!/usr/bin/env python3
"""Pull every pub, bar, restaurant, cafe, food cart, activity and scenic spot for Metro Vancouver from OpenStreetMap.

    python3 scripts/ingest_osm.py [raw_cache_dir]
    python3 scripts/ingest_osm.py [raw_cache_dir] --cached-only   # build the CSV from what is already downloaded

Writes supabase/data/places_metro_vancouver.csv. Free, no API key. Data (c) OpenStreetMap contributors, ODbL:
keep the attribution in the app. Raw Overpass responses are cached per city and group, so re-runs and retries
do not hit the public server again. If one public server is down it tries the others.
"""
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

CITIES = [
    "Vancouver", "Burnaby", "Surrey", "Richmond", "North Vancouver", "West Vancouver", "New Westminster",
    "Coquitlam", "Port Coquitlam", "Port Moody", "Delta", "Langley", "White Rock", "Maple Ridge",
]
BBOX = "49.0,-123.4,49.5,-122.4"  # keeps out Vancouver, WA and anything not in the Lower Mainland
BBOX_ONLY = {"Langley": "49.04,-122.72,49.20,-122.55"}  # boundary query keeps timing out: use a box
UA = "DrunkVA-ingest/0.2"
MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

# Each group is a separate request so no single query is too big for the public server.
GROUPS = {
    "nightlife": """
  nwr(AREA)(BB)["name"]["amenity"~"^(bar|pub|nightclub|biergarten|music_venue|casino)$"];
  nwr(AREA)(BB)["name"]["craft"~"^(brewery|distillery)$"];""",
    "activities": """
  nwr(AREA)(BB)["name"]["amenity"~"^(karaoke_box|cinema|theatre|arts_centre)$"];
  nwr(AREA)(BB)["name"]["leisure"~"^(amusement_arcade|bowling_alley|miniature_golf|trampoline_park|escape_game|water_park|ice_rink)$"];
  nwr(AREA)(BB)["name"]["tourism"~"^(attraction|museum|aquarium|zoo|theme_park)$"];""",
    "scenic": """
  nwr(AREA)(BB)["tourism"="viewpoint"];
  nwr(AREA)(BB)["name"]["natural"~"^(beach|peak)$"];
  nwr(AREA)(BB)["name"]["man_made"="pier"];
  nwr(AREA)(BB)["name"]["leisure"="park"]["wikidata"];""",
    "food": """
  nwr(AREA)(BB)["name"]["amenity"~"^(restaurant|fast_food|cafe|ice_cream|food_court|marketplace|street_vendor|food_truck)$"];
  nwr(AREA)(BB)["name"]["shop"="bakery"];""",
}

# (tag, value) -> (category, subcategory, emoji, typical spend per person in CAD; 0 = free)
KIND = {
    ("amenity", "bar"): ("bar", "bar", "🍸", 24),
    ("amenity", "pub"): ("bar", "pub", "🍺", 24),
    ("amenity", "biergarten"): ("bar", "beer garden", "🍺", 22),
    ("amenity", "nightclub"): ("nightclub", "nightclub", "🪩", 25),
    ("amenity", "music_venue"): ("nightclub", "live music", "🎸", 25),
    ("amenity", "casino"): ("activity", "casino", "🎰", 20),
    ("craft", "brewery"): ("bar", "brewery", "🍻", 22),
    ("craft", "distillery"): ("bar", "distillery", "🥃", 22),
    ("amenity", "karaoke_box"): ("activity", "karaoke", "🎤", 20),
    ("amenity", "cinema"): ("activity", "cinema", "🎬", 18),
    ("amenity", "theatre"): ("activity", "theatre", "🎭", 40),
    ("amenity", "arts_centre"): ("activity", "arts", "🎨", 15),
    ("leisure", "amusement_arcade"): ("activity", "arcade", "🕹️", 20),
    ("leisure", "bowling_alley"): ("activity", "bowling", "🎳", 22),
    ("leisure", "miniature_golf"): ("activity", "mini golf", "⛳", 15),
    ("leisure", "trampoline_park"): ("activity", "trampoline", "🤸", 25),
    ("leisure", "escape_game"): ("activity", "escape room", "🔐", 35),
    ("leisure", "water_park"): ("activity", "water park", "🌊", 30),
    ("leisure", "ice_rink"): ("activity", "ice rink", "⛸️", 15),
    ("tourism", "attraction"): ("activity", "attraction", "📍", 15),
    ("tourism", "museum"): ("activity", "museum", "🏛️", 20),
    ("tourism", "aquarium"): ("activity", "aquarium", "🐠", 35),
    ("tourism", "zoo"): ("activity", "zoo", "🦁", 30),
    ("tourism", "theme_park"): ("activity", "theme park", "🎢", 50),
    ("tourism", "viewpoint"): ("viewpoint", "viewpoint", "🌆", 0),
    ("natural", "beach"): ("viewpoint", "beach", "🏖️", 0),
    ("natural", "peak"): ("viewpoint", "peak", "⛰️", 0),
    ("man_made", "pier"): ("viewpoint", "pier", "🌉", 0),
    ("leisure", "park"): ("viewpoint", "park", "🌳", 0),
    ("amenity", "restaurant"): ("food", "restaurant", "🍽️", 30),
    ("amenity", "fast_food"): ("food", "fast food", "🍟", 14),
    ("amenity", "cafe"): ("food", "cafe", "☕", 8),
    ("amenity", "ice_cream"): ("food", "dessert", "🍦", 7),
    ("amenity", "food_court"): ("food", "food court", "🍜", 15),
    ("amenity", "marketplace"): ("food", "market", "🧺", 15),
    ("amenity", "street_vendor"): ("food", "food cart", "🌭", 10),
    ("amenity", "food_truck"): ("food", "food cart", "🚚", 12),
    ("shop", "bakery"): ("food", "bakery", "🥐", 8),
}
NOT_SCENIC = re.compile(r"\b(docks?|floats?|marina|moorage|fuel|gas|ferry|terminal|boat ?launch|launch ramp|jetty|breakwater)\b|^[A-Z0-9]{1,3} (dock|float)", re.I)
CART_NAME = re.compile(r"\b(food ?truck|food ?cart|cart|japadog|hot ?dog|wagon)\b|\btruck\b(?! stop)", re.I)


def run(query):
    body = urllib.parse.urlencode({"data": query}).encode()
    last = None
    for attempt in range(3):
        for m in MIRRORS:
            try:
                req = urllib.request.Request(m, data=body, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=240) as r:
                    return json.loads(r.read())
            except Exception as e:  # rate limit / timeout / bad gateway: try the next server
                last = e
        time.sleep(20 * (attempt + 1))
    raise RuntimeError(f"all servers failed: {last}")


def fetch(city, group, cache):
    f = cache / f"{city.replace(' ', '_')}__{group}.json"
    if f.exists():
        return json.loads(f.read_text()), False
    if "--cached-only" in sys.argv:
        raise RuntimeError("not downloaded yet")
    area = "" if city in BBOX_ONLY else f'area["name"="{city}"]["boundary"="administrative"]["admin_level"="8"]->.a;\n'
    bb = BBOX_ONLY.get(city, BBOX)
    body = GROUPS[group].replace("(AREA)", "" if city in BBOX_ONLY else "(area.a)").replace("(BB)", f"({bb})")
    query = f"[out:json][timeout:180];\n{area}(\n{body}\n);\nout center tags;"
    data = run(query)
    f.write_text(json.dumps(data))
    return data, True


def is_late(hours):
    if "24/7" in hours:
        return True
    for m in re.finditer(r"(\d\d):(\d\d)\s*-\s*(\d\d):(\d\d)", hours):
        start, end = int(m[1]) * 60 + int(m[2]), int(m[3]) * 60 + int(m[4])
        if end > 24 * 60 or (0 < end <= 5 * 60) or (0 < end < start):
            return True
    return False


def normalise(el, city):
    t = el.get("tags", {})
    kind = next((KIND[(k, t[k])] for k in ("amenity", "craft", "leisure", "tourism", "natural", "man_made", "shop") if (k, t.get(k)) in KIND), None)
    lat = el.get("lat") or el.get("center", {}).get("lat")
    lng = el.get("lon") or el.get("center", {}).get("lon")
    name = (t.get("name") or "").strip()
    if not kind or lat is None:
        return None
    category, sub, emoji, cost = kind
    if category == "viewpoint" and sub == "viewpoint" and not name:
        return None  # an unnamed viewpoint pin is not something to send people to
    if category == "viewpoint" and sub in ("pier", "beach") and NOT_SCENIC.search(name):
        return None  # marina docks, floats and fuel docks are tagged as piers but are not places to visit
    if not name:
        return None
    # Food carts and trucks: tagged as such, or a fast-food place that is mobile or named like one.
    if category == "food" and sub in ("fast food", "restaurant") and (t.get("mobile") == "yes" or t.get("food_truck") == "yes" or CART_NAME.search(name)):
        sub, emoji, cost = "food cart", "🌭", 12
    hours = t.get("opening_hours", "")
    quality = sum(bool(t.get(k)) for k in ("website", "contact:website", "phone", "contact:phone", "opening_hours", "addr:street", "cuisine", "description", "wheelchair"))
    return {
        "source_id": f"{el['type']}/{el['id']}",
        "name": name,
        "category": category,
        "subcategory": sub,
        "emoji": emoji,
        "city": city,  # the boundary we queried; OSM addr:city is often misspelt or missing
        "lat": round(lat, 6),
        "lng": round(lng, 6),
        "address": " ".join(x for x in (t.get("addr:housenumber"), t.get("addr:street")) if x),
        "hours": json.dumps({"osm": hours}) if hours else "",
        "late_night": "true" if is_late(hours) else "false",
        "website": t.get("website") or t.get("contact:website", ""),
        "phone": t.get("phone") or t.get("contact:phone", ""),
        "cuisine": t.get("cuisine", ""),
        "is_chain": "true" if (t.get("brand") or t.get("brand:wikidata")) else "false",
        "quality": quality,
        "est_cost_cad": cost,
    }


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    cache = Path(args[0] if args else "/tmp/osm_raw")
    cache.mkdir(parents=True, exist_ok=True)
    rows, seen = [], set()
    for city in CITIES:
        for group in GROUPS:
            try:
                data, fresh = fetch(city, group, cache)
            except RuntimeError as e:
                print(f"  {city}/{group}: SKIPPED ({e})", file=sys.stderr)
                continue
            n = 0
            for el in data["elements"]:
                r = normalise(el, city)
                key = (r["name"].lower(), round(r["lat"], 4), round(r["lng"], 4)) if r else None
                if r and r["source_id"] not in seen and key not in seen:
                    seen.update([r["source_id"], key])
                    rows.append(r)
                    n += 1
            print(f"{city}/{group}: {n}", file=sys.stderr)
            if fresh:
                time.sleep(6)  # be polite to the public servers

    out = Path(__file__).resolve().parent.parent / "supabase" / "data"
    out.mkdir(parents=True, exist_ok=True)
    rows.sort(key=lambda r: (r["city"], r["category"], r["name"].lower()))
    with open(out / "places_metro_vancouver.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"total {len(rows)}", file=sys.stderr)


if __name__ == "__main__":
    main()
