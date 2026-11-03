#!/usr/bin/env python3
"""Pull bars, nightlife, activities and late-night food for Metro Vancouver from OpenStreetMap.

    python3 scripts/ingest_osm.py [raw_cache_dir]

Writes supabase/data/places_metro_vancouver.csv. Free, no API key. Data (c) OpenStreetMap
contributors, ODbL: keep the attribution in the app. Raw Overpass responses are cached so
re-runs do not hit the server again.
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
# Cities whose boundary query keeps timing out on the public server: query a bounding box instead.
BBOX_ONLY = {"Langley": "49.04,-122.72,49.20,-122.55"}
UA = "DrunkVA-ingest/0.1"
OVERPASS = "https://overpass-api.de/api/interpreter"

QUERY = """[out:json][timeout:180];
area["name"="{city}"]["boundary"="administrative"]["admin_level"="8"]->.a;
(
  nwr(area.a)({bbox})["name"]["amenity"~"^(bar|pub|nightclub|biergarten|music_venue|karaoke_box|cinema|theatre|casino)$"];
  nwr(area.a)({bbox})["name"]["craft"~"^(brewery|distillery)$"];
  nwr(area.a)({bbox})["name"]["leisure"~"^(amusement_arcade|bowling_alley|miniature_golf|trampoline_park|escape_game)$"];
  nwr(area.a)({bbox})["name"]["tourism"~"^(viewpoint|attraction)$"];
  nwr(area.a)({bbox})["name"]["amenity"~"^(restaurant|fast_food)$"]["opening_hours"];
);
out center tags;
"""

KIND = {  # (tag, value) -> (category, subcategory, emoji)
    ("amenity", "bar"): ("bar", "bar", "🍸"),
    ("amenity", "pub"): ("bar", "pub", "🍺"),
    ("amenity", "biergarten"): ("bar", "beer garden", "🍺"),
    ("amenity", "nightclub"): ("nightclub", "nightclub", "🪩"),
    ("amenity", "music_venue"): ("nightclub", "live music", "🎸"),
    ("amenity", "karaoke_box"): ("activity", "karaoke", "🎤"),
    ("amenity", "cinema"): ("activity", "cinema", "🎬"),
    ("amenity", "theatre"): ("activity", "theatre", "🎭"),
    ("amenity", "casino"): ("activity", "casino", "🎰"),
    ("craft", "brewery"): ("bar", "brewery", "🍻"),
    ("craft", "distillery"): ("bar", "distillery", "🥃"),
    ("leisure", "amusement_arcade"): ("activity", "arcade", "🕹️"),
    ("leisure", "bowling_alley"): ("activity", "bowling", "🎳"),
    ("leisure", "miniature_golf"): ("activity", "mini golf", "⛳"),
    ("leisure", "trampoline_park"): ("activity", "trampoline", "🤸"),
    ("leisure", "escape_game"): ("activity", "escape room", "🔐"),
    ("tourism", "viewpoint"): ("viewpoint", "viewpoint", "🌆"),
    ("tourism", "attraction"): ("activity", "attraction", "📍"),
    ("amenity", "restaurant"): ("food", "restaurant", "🍽️"),
    ("amenity", "fast_food"): ("food", "fast food", "🍟"),
}


def fetch(city, cache):
    f = cache / f"{city.replace(' ', '_')}.json"
    if f.exists():
        return json.loads(f.read_text())
    query = QUERY.format(city=city, bbox=BBOX)
    if city in BBOX_ONLY:  # drop the area clause and search the box directly
        query = query.replace('area["name"="%s"]["boundary"="administrative"]["admin_level"="8"]->.a;\n' % city, "")
        query = query.replace("(area.a)(%s)" % BBOX, "(%s)" % BBOX_ONLY[city])
    body = urllib.parse.urlencode({"data": query}).encode()
    for attempt in range(6):
        try:
            req = urllib.request.Request(OVERPASS, data=body, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=240) as r:
                data = json.loads(r.read())
            f.write_text(json.dumps(data))
            return data
        except Exception as e:  # rate limit / timeout: back off and retry
            wait = 20 * (attempt + 1)
            print(f"  {city}: {e}; retry in {wait}s", file=sys.stderr)
            time.sleep(wait)
    raise SystemExit(f"giving up on {city}")


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
    kind = next((KIND[(k, t[k])] for k in ("amenity", "craft", "leisure", "tourism") if (k, t.get(k)) in KIND), None)
    lat = el.get("lat") or el.get("center", {}).get("lat")
    lng = el.get("lon") or el.get("center", {}).get("lon")
    if not kind or lat is None or not t.get("name"):
        return None
    hours = t.get("opening_hours", "")
    quality = sum(bool(t.get(k)) for k in ("website", "contact:website", "phone", "contact:phone", "opening_hours", "addr:street", "cuisine", "description", "wheelchair"))
    return {
        "source_id": f"{el['type']}/{el['id']}",
        "name": t["name"].strip(),
        "category": kind[0],
        "subcategory": kind[1],
        "emoji": kind[2],
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
    }


def main():
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/osm_raw")
    cache.mkdir(parents=True, exist_ok=True)
    rows, seen = [], set()
    for i, city in enumerate(CITIES):
        fresh = not (cache / f"{city.replace(' ', '_')}.json").exists()
        data = fetch(city, cache)
        n = 0
        for el in data["elements"]:
            r = normalise(el, city)
            key = (r["name"].lower(), round(r["lat"], 4), round(r["lng"], 4)) if r else None
            if r and r["source_id"] not in seen and key not in seen:
                seen.update([r["source_id"], key])
                rows.append(r)
                n += 1
        print(f"{city}: {n} places", file=sys.stderr)
        if fresh and i < len(CITIES) - 1:
            time.sleep(8)  # be polite to the public server

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
