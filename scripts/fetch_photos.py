#!/usr/bin/env python3
"""Bundle several photos per vibe into the app, so no two cards of the same kind look the same.

    python3 scripts/fetch_photos.py                # download from Pixabay (or Pexels) with a key
    python3 scripts/fetch_photos.py --per-vibe 6   # how many photos to keep per vibe (default 5)
    python3 scripts/fetch_photos.py --force        # start again: re-download every photo
    python3 scripts/fetch_photos.py --index-only   # just rebuild the index from files already in app/assets/vibes/

Sources, in order of preference:
  PIXABAY_API_KEY  free key shown after signing up at https://pixabay.com/api/docs/
  PEXELS_API_KEY   free key at https://www.pexels.com/api/ (issuance is sometimes paused)
Put the key in the environment or in app/.env.local (git-ignored). Use names WITHOUT the EXPO_PUBLIC_
prefix so the key is never bundled into the app.

You can also drop your own photos into app/assets/vibes/ named <vibe-id>.jpg (for example pub.jpg,
dance.jpg, or dance-2.jpg for more than one; ids are in app/lib/vibes.ts) and run with --index-only. Unsplash downloads work well for this.
Photos already in app/assets/vibes/ (yours or downloaded) are kept unless you pass --force.

Photos are saved with photographer credits in credits.json. Never present a stock photo as a specific venue.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"
OUT = APP / "assets" / "vibes"


def env_key(name):
    k = os.environ.get(name)
    f = APP / ".env.local"
    if not k and f.exists():
        m = re.search(rf"^{name}=(.+)$", f.read_text(), re.M)
        k = m.group(1).strip() if m else None
    return k


def vibes():
    src = (APP / "lib" / "vibes.ts").read_text()
    return re.findall(r"id: '([^']+)',.*?query: '([^']+)'", src)


def get(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": "DrunkVA-images/0.1", **(headers or {})})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


# Extra search words per vibe, so the photos for one mood are different shots and not five of the same pint glass.
VARIANTS = {
    "pub": ["pub interior beer taps", "beer pint bar counter", "friends cheers beer"],
    "brewery": ["brewery tanks taproom", "beer flight tasting", "craft beer glasses"],
    "cocktails": ["cocktail bar bartender", "cocktail glass garnish", "speakeasy cocktails"],
    "dance": ["nightclub dance floor", "club dj crowd", "party lights dancing"],
    "live-music": ["concert stage lights", "band playing live", "guitar gig crowd"],
    "games": ["arcade machines", "bowling alley", "pool table billiards"],
    "karaoke": ["karaoke microphone", "singing party", "karaoke room"],
    "scenic": ["Vancouver skyline night", "Vancouver sunset beach", "Vancouver mountains view"],
    "date": ["romantic dinner", "couple restaurant evening", "candlelight dinner"],
    "carts": ["food truck", "street food stall", "hot dog cart"],
    "cafes": ["coffee shop latte", "pastry bakery cafe", "dessert cake cafe"],
    "restaurants": ["restaurant dining table", "chef plating dish", "dinner sharing plates"],
    "eats": ["poutine", "burger fries night", "late night food"],
}


def pixabay(key, queries, skip_ids, want):
    """Up to `want` new photos for these queries: [(bytes, credit)], skipping ids already used anywhere."""
    out = []
    for query in queries:
        qs = urllib.parse.urlencode({"key": key, "q": query, "image_type": "photo", "orientation": "all",
                                     "safesearch": "true", "order": "popular", "min_width": 900, "per_page": 20})
        for h in json.loads(get(f"https://pixabay.com/api/?{qs}")).get("hits", []):
            if h["id"] in skip_ids or len(out) >= want:
                continue
            skip_ids.add(h["id"])
            out.append((get(h["largeImageURL"]), {"photographer": h["user"], "photographer_url": f"https://pixabay.com/users/{h['user']}-{h['user_id']}/", "photo_url": h["pageURL"], "source": "Pixabay", "pixabay_id": h["id"]}))
        if len(out) >= want:
            break
    return out


def pexels(key, query):
    qs = urllib.parse.urlencode({"query": query, "orientation": "portrait", "size": "medium", "per_page": 5})
    photos = json.loads(get(f"https://api.pexels.com/v1/search?{qs}", {"Authorization": key})).get("photos", [])
    if not photos:
        return None
    p = photos[0]
    return get(p["src"]["large"]), {"photographer": p["photographer"], "photographer_url": p["photographer_url"], "photo_url": p["url"], "source": "Pexels"}


def shrink(path):
    """Keep bundled photos small: 1000 px on the long side, JPEG quality 72 (macOS sips)."""
    os.system(f'sips -Z 1000 -s format jpeg -s formatOptions 72 "{path}" --out "{path}" >/dev/null 2>&1')


def file_for(vid, n):
    return OUT / (f"{vid}.jpg" if n == 1 else f"{vid}-{n}.jpg")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    credits_file = OUT / "credits.json"
    old = json.loads(credits_file.read_text()) if credits_file.exists() else []
    for c in old:  # entries written before there were several photos per vibe
        c.setdefault("file", f"{c['vibe']}.jpg")
    credits = {c["file"]: c for c in old}
    per = int(sys.argv[sys.argv.index("--per-vibe") + 1]) if "--per-vibe" in sys.argv else 5

    if "--index-only" not in sys.argv:
        key = env_key("PIXABAY_API_KEY")
        if not key:
            sys.exit("No key found. Set PIXABAY_API_KEY in the environment or app/.env.local, or use --index-only.")
        force = "--force" in sys.argv
        # Pixabay ids already used, including photos downloaded before ids were recorded (the id ends the page URL).
        seen = set()
        for c in credits.values():
            m = re.search(r"-(\d+)/?$", c.get("photo_url", ""))
            if c.get("pixabay_id") or m:
                seen.add(c.get("pixabay_id") or int(m.group(1)))
        for vid, query in vibes():
            have = [n for n in range(1, per + 1) if file_for(vid, n).exists() and not force]
            missing = [n for n in range(1, per + 1) if n not in have]
            if not missing:
                print(f"{vid}: already has {len(have)} photos", file=sys.stderr)
                continue
            found = pixabay(key, [query] + VARIANTS.get(vid, []), seen, len(missing))
            for n, (data, credit) in zip(missing, found):
                target = file_for(vid, n)
                target.write_bytes(data)
                shrink(target)
                credits[target.name] = {"vibe": vid, "file": target.name, **credit}
            print(f"{vid}: {len(found)} new photos ({len(have)} kept)", file=sys.stderr)

    # Every <vibe>.jpg and <vibe>-N.jpg in the folder is indexed, whoever added it.
    files = sorted(p.name for p in OUT.glob("*.jpg"))
    by_vibe = {}
    for f in files:
        by_vibe.setdefault(re.sub(r"-\d+\.jpg$|\.jpg$", "", f), []).append(f)
    for fs in by_vibe.values():
        fs.sort(key=lambda f: (int(m.group(1)) if (m := re.search(r"-(\d+)\.jpg$", f)) else 1, f))
    credits_file.write_text(json.dumps([credits[f] for f in files if f in credits], indent=1))
    body = ",\n".join(
        f"  '{v}': [" + ", ".join(f"require('../assets/vibes/{f}')" for f in fs) + "]" for v, fs in sorted(by_vibe.items())
    )
    (APP / "lib" / "vibeImages.ts").write_text(
        "// GENERATED by scripts/fetch_photos.py. Do not edit by hand.\n"
        "// Maps a vibe id to its bundled photos. Screens fall back to a gradient and emoji for any vibe not listed.\n"
        "import type { ImageSource } from 'expo-image';\n\n"
        f"export const VIBE_IMAGES: Record<string, (ImageSource | number)[]> = {{\n{body}\n}};\n"
    )
    print(f"{len(files)} photos indexed across {len(by_vibe)} vibes", file=sys.stderr)


if __name__ == "__main__":
    main()
