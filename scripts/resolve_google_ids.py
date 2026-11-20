#!/usr/bin/env python3
"""Find the Google place id for each stop that appears in a generated experience.

    python3 scripts/resolve_google_ids.py --dry-run      # how many lookups, no key needed, nothing is sent
    python3 scripts/resolve_google_ids.py --limit 20     # try 20 first and read the matches
    python3 scripts/resolve_google_ids.py                # all of them, then writes supabase/migrations/014_google_place_ids.sql

The key: put it in app/.env.local as   GOOGLE_PLACES_API_KEY=...   (that file is git-ignored, and a name without the
EXPO_PUBLIC_ prefix is never bundled into the app) or export it in your shell. The script never prints it.

Efficiency:
  * only stops that are actually in an experience (about 500), most-used first, never the whole 7,800;
  * one Text Search request per place, asking for just the id, name and location to verify the match;
  * a match counts only when the name is close AND the place is within 200 m of the OpenStreetMap point,
    so a wrong venue never gets a photo;
  * answers are cached in scripts/.google_ids_cache.json (ids only), so a rerun costs nothing and a stop resumes;
  * --max-calls (default 700) is a hard stop.

What is stored: only the place id, which Google allows. Names, ratings, photos and hours are never saved.
"""
import difflib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_experiences as g  # noqa: E402

APP = ROOT / "app"
CACHE = Path(os.environ.get("GOOGLE_IDS_CACHE") or Path(__file__).resolve().parent / ".google_ids_cache.json")
OUT = Path(os.environ.get("GOOGLE_IDS_OUT") or ROOT / "supabase" / "migrations" / "014_google_place_ids.sql")
BASE = os.environ.get("GOOGLE_PLACES_BASE", "https://places.googleapis.com")  # overridden only by the offline test
UA = "DrunkVA-place-ids/0.1"
MAX_DISTANCE_M = 200
MIN_NAME_RATIO = 0.7


def env_key(name):
    k = os.environ.get(name)
    f = APP / ".env.local"
    if not k and f.exists():
        m = re.search(rf"^{name}=(.+)$", f.read_text(), re.M)
        k = m.group(1).strip().strip("\"'") if m else None
    return k


def norm(s):
    s = re.sub(r"\([^)]*\)", " ", (s or "").lower().replace("&", " and "))
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", s).split())


def same_name(a, b):
    a, b = norm(a), norm(b)
    if not a or not b:
        return False
    if difflib.SequenceMatcher(None, a, b).ratio() >= MIN_NAME_RATIO:
        return True
    if min(len(a), len(b)) >= 3 and (b.startswith(a + " ") or a.startswith(b + " ")):  # Google often adds a descriptor: 'Uva Wine & Cocktail Bar'
        return True
    return min(len(a), len(b)) >= 6 and (a in b or b in a)


def search(key, place):
    body = json.dumps(
        {
            "textQuery": f"{place['name']} {place['city']}",
            "locationBias": {"circle": {"center": {"latitude": place["lat"], "longitude": place["lng"]}, "radius": 150.0}},
            "maxResultCount": 3,
            "languageCode": "en",
        }
    ).encode()
    req = urllib.request.Request(
        f"{BASE}/v1/places:searchText",
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key,
            "X-Goog-FieldMask": "places.id,places.displayName,places.location",
            "User-Agent": UA,
        },
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read()).get("places", [])
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503):
                time.sleep(2 + attempt * 4)
                continue
            if e.code in (400, 401, 403):
                sys.exit(f"Google said {e.code}. Check the key is correct, the Places API (New) is enabled, and billing is on.")
            return []
        except Exception:
            time.sleep(2 + attempt * 3)
    return []


def pick(place, results):
    """The result whose name matches and that sits closest to the OpenStreetMap point, within MAX_DISTANCE_M."""
    best = None
    for r in results:
        loc = r.get("location") or {}
        if "latitude" not in loc:
            continue
        d = g.metres(place["pt"], (loc["latitude"], loc["longitude"]))
        if d <= MAX_DISTANCE_M and same_name(place["name"], (r.get("displayName") or {}).get("text", "")):
            if best is None or d < best[0]:
                best = (d, r["id"])
    return best[1] if best else None


def stops_in_experiences():
    places = g.load()
    by_id = {p["source_id"]: p for p in places}
    uses = {}
    for e in g.generate(places):
        for s in e[3]:
            uses[s["source_id"]] = uses.get(s["source_id"], 0) + 1
    return [by_id[sid] for sid, _ in sorted(uses.items(), key=lambda kv: (-kv[1], kv[0]))], uses


def q(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    todo, uses = stops_in_experiences()
    if "--limit" in sys.argv:
        todo = todo[: int(sys.argv[sys.argv.index("--limit") + 1])]
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    pending = [p for p in todo if p["source_id"] not in cache]
    max_calls = int(sys.argv[sys.argv.index("--max-calls") + 1]) if "--max-calls" in sys.argv else 700
    print(f"{len(todo)} stops are in experiences; {len(todo) - len(pending)} already looked up; {len(pending)} to look up.", file=sys.stderr)
    if "--dry-run" in sys.argv:
        print(f"A real run sends at most {min(len(pending), max_calls)} Text Search requests. Nothing was sent.", file=sys.stderr)
        return
    key = env_key("GOOGLE_PLACES_API_KEY")
    if not key:
        sys.exit("No key found. Add GOOGLE_PLACES_API_KEY=... to app/.env.local (git-ignored), then run this again.")

    calls = 0
    for i, p in enumerate(pending, 1):
        if calls >= max_calls:
            print(f"Stopped at --max-calls {max_calls}. Run again to continue.", file=sys.stderr)
            break
        cache[p["source_id"]] = pick(p, search(key, p))
        calls += 1
        if calls % 25 == 0:
            CACHE.write_text(json.dumps(cache))
            print(f"  {calls}/{len(pending)}  matched {sum(1 for v in cache.values() if v)}", file=sys.stderr)
        time.sleep(0.1)
    CACHE.write_text(json.dumps(cache))

    found = {p["source_id"]: cache[p["source_id"]] for p in todo if cache.get(p["source_id"])}
    names = {p["source_id"]: p["name"] for p in todo}
    lines = [
        "-- Generated by scripts/resolve_google_ids.py. Re-run safe. Needs migration 013.",
        "-- Only Google place ids (allowed to store). Photos, ratings and hours are fetched live, never saved.",
    ]
    if found:
        rows = ",\n".join(f"({q(sid)}, {q(pid)})" for sid, pid in sorted(found.items()))
        lines += [
            "update places p set google_place_id = v.gid from (values\n" + rows + "\n) as v(osm_id, gid)",
            "where p.source = 'osm' and p.source_id = v.osm_id;",
        ]
    OUT.write_text("\n".join(lines) + "\n")
    matched = len(found)
    print(f"{matched} of {len(todo)} stops matched ({100 * matched // max(1, len(todo))}%) -> {OUT.name}", file=sys.stderr)
    unmatched = [names[p["source_id"]] for p in todo if p["source_id"] in cache and not cache[p["source_id"]]]
    if unmatched:
        print(f"No confident match for {len(unmatched)} (they keep the stock photo). First few: {', '.join(unmatched[:8])}", file=sys.stderr)


if __name__ == "__main__":
    main()
