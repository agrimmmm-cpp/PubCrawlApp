#!/usr/bin/env python3
"""Find real, freely licensed photos of places on Wikimedia and write a migration that links them.

    python3 scripts/fetch_wikimedia.py            # looks up places, writes supabase/migrations/011_place_photos.sql
    python3 scripts/fetch_wikimedia.py --limit 40 # try only the first 40 candidates (a quick test)

Free, no key. For each place that could plausibly have a photo (scenic spots, attractions, venues that are not
chains) it tries two matches and keeps a photo only when the evidence is good:
  1. a Wikipedia article within 250 m whose title matches the place's name, and its lead image;
  2. a Wikimedia Commons file whose title starts with the place's full name, plus at most two more words (and, if
     the file is geotagged, is within 500 m of the place).
Only photos under a free licence (CC, public domain) are kept. Photos are never stored: the migration holds the
wikimedia.org URL, the author and the licence, and the app shows them with that credit.
Lookups are cached in scripts/.wikimedia_cache.json (git-ignored), so a rerun costs nothing and an interrupted
run resumes where it stopped.
"""
import csv
import difflib
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "supabase" / "data" / "places_metro_vancouver.csv"
CACHE = Path(__file__).resolve().parent / ".wikimedia_cache.json"
OUT = ROOT / "supabase" / "migrations" / "011_place_photos.sql"
UA = "DrunkVA-photo-lookup/0.1 (nightlife app prototype)"  # a generic client name, no personal details
WIKI = "https://en.wikipedia.org/w/api.php"
COMMONS = "https://commons.wikimedia.org/w/api.php"
SLEEP = 1.0  # polite: Wikimedia rate-limits anonymous clients quickly

GENERIC = {"park", "beach", "pier", "lookout", "viewpoint", "bar", "pub", "cafe", "restaurant", "grill", "kitchen", "house"}


def api(base, **params):
    qs = urllib.parse.urlencode({"format": "json", "formatversion": 2, **params})
    for attempt in range(5):
        try:
            req = urllib.request.Request(f"{base}?{qs}", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                time.sleep(SLEEP)
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            wait = int(e.headers.get("Retry-After", "0") or 0) if e.code == 429 else 0
            time.sleep(max(wait, 15 * (attempt + 1)) if e.code == 429 else 2 + attempt * 3)
        except Exception:
            time.sleep(2 + attempt * 3)
    return {}


def norm(s):
    s = html.unescape(s or "").lower().replace("&", " and ")
    s = re.sub(r"\([^)]*\)", " ", s)
    return " ".join(re.sub(r"[^a-z0-9 ]+", " ", s).split())


def distinctive(name):
    n = norm(name)
    return len(n) >= 7 and not set(n.split()) <= GENERIC


def metres(a, b):
    import math
    r = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(b[1] - a[1]) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def free_license(meta):
    lic = (meta.get("LicenseShortName", {}).get("value") or "").strip()
    ok = lic.upper().startswith(("CC BY", "CC0", "PD", "PUBLIC DOMAIN", "CC-BY"))
    return lic if ok else None


def strip_tags(s):
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", s or "")).split())


def file_info(title, width=900):
    """Thumbnail URL, page URL, author and licence for a Commons file, or None when not freely licensed."""
    d = api(COMMONS, action="query", titles=title, prop="imageinfo", iiprop="url|extmetadata|size|mime",
            iiurlwidth=width, iiextmetadatafilter="LicenseShortName|Artist|AttributionRequired")
    pages = d.get("query", {}).get("pages", [])
    if not pages or "imageinfo" not in pages[0]:
        return None
    ii = pages[0]["imageinfo"][0]
    if not ii.get("mime", "").startswith("image/jpeg") and not ii.get("mime", "").startswith("image/png"):
        return None
    if ii.get("width", 0) < 600:
        return None
    meta = ii.get("extmetadata", {})
    lic = free_license(meta)
    if not lic:
        return None
    return dict(url=ii.get("thumburl") or ii["url"], page=ii["descriptionurl"], credit=strip_tags(meta.get("Artist", {}).get("value")) or "Wikimedia Commons contributor", license=lic)


# Words that may follow or precede a place's name in a page or file title without changing what it is a picture of.
GENERIC_PLACE = {"park", "regional", "beach", "pier", "lookout", "viewpoint", "tower", "national", "historic", "site", "the", "of", "and"}
FILE_EXTRA = {"exterior", "interior", "front", "entrance", "view", "building", "sign", "panoramic", "overview", "site", "night", "day",
              "vancouver", "burnaby", "surrey", "richmond", "langley", "coquitlam", "british", "columbia", "bc", "canada", "at", "in", "the"}


def wiki_title_ok(name, title):
    """A Wikipedia article is about this place only if the titles match, or the article is the same place named a little
    differently ('Deas Island' for 'Deas Island Regional Park'). 'Granville Island' is not a picture of its water park."""
    a, b = norm(name), norm(title)
    if difflib.SequenceMatcher(None, a, b).ratio() >= 0.9:
        return True
    if min(len(a), len(b)) < 8:
        return False
    if b in a:  # the article is the shorter name: the rest of the place's name must be generic
        return set(a.replace(b, " ").split()) <= GENERIC_PLACE
    if a in b:  # the article's title adds words, e.g. 'Fort Langley National Historic Site'
        return set(b.replace(a, " ").split()) <= GENERIC_PLACE
    return False


def commons_title_ok(name, filename):
    """A Commons file is of this place when its title starts with the name and adds only descriptive words."""
    n = norm(name)
    t = norm(re.sub(r"^file:", "", filename, flags=re.I).rsplit(".", 1)[0])
    if not t.startswith(n):
        return False
    extra = [w for w in t[len(n):].split() if not w.isdigit()]
    return len(extra) <= 3 and all(w in FILE_EXTRA for w in extra)


def via_wikipedia(p):
    d = api(WIKI, action="query", generator="geosearch", ggscoord=f"{p['lat']}|{p['lng']}", ggsradius=250, ggslimit=8,
            prop="pageimages|coordinates", piprop="name", colimit=8)
    best = None
    for pg in d.get("query", {}).get("pages", []):
        if not pg.get("pageimage"):
            continue
        a, b = norm(p["name"]), norm(pg["title"])
        ratio = difflib.SequenceMatcher(None, a, b).ratio()
        if wiki_title_ok(p["name"], pg["title"]):
            if best is None or ratio > best[0]:
                best = (ratio, pg)
    if not best:
        return None
    info = file_info("File:" + best[1]["pageimage"])
    return dict(info, match=f"wikipedia: {best[1]['title']}") if info else None


def via_commons(p):
    if not distinctive(p["name"]):
        return None
    name = norm(p["name"])
    d = api(COMMONS, action="query", generator="search", gsrsearch=f'"{p["name"]}" {p["city"]}', gsrnamespace=6, gsrlimit=6,
            prop="coordinates", colimit=6)
    for pg in sorted(d.get("query", {}).get("pages", []), key=lambda x: x.get("index", 0)):
        if not commons_title_ok(p["name"], pg["title"]):  # "Rules at the Burnaby Central Railway" is a sign, not the railway
            continue
        co = (pg.get("coordinates") or [None])[0]
        if co and metres((p["lat"], p["lng"]), (co["lat"], co["lon"])) > 500:
            continue
        info = file_info(pg["title"])
        if info:
            return dict(info, match=f"commons: {pg['title']}")
    return None


def candidates():
    with open(DATA, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    out = []
    for r in rows:
        r["lat"], r["lng"] = float(r["lat"]), float(r["lng"])
        # Food places, bars and chains almost never have a Wikimedia photo; the rest are worth one lookup each.
        if r["is_chain"] == "true" or r["category"] in ("food", "bar") and r["subcategory"] not in ("market", "food court"):
            continue
        if not r["name"].strip():
            continue
        out.append(r)
    return out


def q(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    todo = candidates()
    if "--limit" in sys.argv:
        todo = todo[: int(sys.argv[sys.argv.index("--limit") + 1])]
    print(f"{len(todo)} places to look up ({sum(1 for p in todo if p['source_id'] in cache)} cached)", file=sys.stderr)
    for i, p in enumerate(todo, 1):
        if p["source_id"] in cache:
            continue
        cache[p["source_id"]] = via_wikipedia(p) or via_commons(p)
        if i % 25 == 0:
            CACHE.write_text(json.dumps(cache))
            print(f"  {i}/{len(todo)}  found {sum(1 for v in cache.values() if v)}", file=sys.stderr)
    CACHE.write_text(json.dumps(cache))

    names = {p["source_id"]: p["name"] for p in todo}

    def still_ok(sid, v):
        """Re-check an older cached match against the current, stricter rules (no network needed)."""
        kind, _, title = v["match"].partition(": ")
        return wiki_title_ok(names[sid], title) if kind == "wikipedia" else commons_title_ok(names[sid], title)

    dropped = [(names[sid], v["match"]) for sid, v in cache.items() if v and sid in names and not still_ok(sid, v)]
    found = [(sid, v) for sid, v in cache.items() if v and sid in names and still_ok(sid, v)]
    for n, m in dropped:
        print(f"  dropped (too loose): {n}  <-  {m}", file=sys.stderr)
    lines = [
        "-- Generated by scripts/fetch_wikimedia.py. Re-run safe.",
        "-- Real photos of places from Wikimedia Commons (free licences). The app links to them and shows the credit.",
        "create table if not exists place_photos (",
        "  place_id uuid primary key references places(id) on delete cascade,",
        "  url text not null,",
        "  source_url text,",
        "  credit text,",
        "  license text,",
        "  source text default 'wikimedia',",
        "  created_at timestamptz default now()",
        ");",
        "alter table place_photos enable row level security;",
        "drop policy if exists \"place photos readable\" on place_photos;",
        "create policy \"place photos readable\" on place_photos for select using (true);",
        "",
    ]
    if found:
        rows = ",\n".join(f"({q(sid)}, {q(v['url'])}, {q(v['page'])}, {q(v['credit'][:200])}, {q(v['license'])})" for sid, v in sorted(found))
        lines += [
            "insert into place_photos (place_id, url, source_url, credit, license)",
            "select p.id, v.url, v.page, v.credit, v.license from (values\n" + rows + "\n) as v(osm_id, url, page, credit, license)",
            "join places p on p.source = 'osm' and p.source_id = v.osm_id",
            "on conflict (place_id) do update set url = excluded.url, source_url = excluded.source_url, credit = excluded.credit, license = excluded.license;",
        ]
    OUT.write_text("\n".join(lines) + "\n")
    print(f"{len(found)} photos found for {len(todo)} places -> {OUT.name}", file=sys.stderr)
    for sid, v in sorted(found, key=lambda x: names[x[0]])[:60]:
        print(f"  {names[sid]}  <-  {v['match']}  [{v['license']}]", file=sys.stderr)


if __name__ == "__main__":
    main()
