"""Opening-hours parsing and distance helpers shared by the itinerary search."""
import math
import re

FRIDAY = 4  # Mo=0
DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
WALK_M_PER_MIN = 80
RIDE_MAX_M = 8000  # a scenic finale may be this far away, by ride
RIDE_MIN_M = 1200  # closer than this is a walk, even for a finale that is allowed to be far


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
            iv.append((s, e if e > s else e + 1440))
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
    for days, iv in rules:
        if day in days:
            today = iv
        if (day - 1) % 7 in days:
            prev = iv
    if today and any(s <= minute < e for s, e in today):
        return True
    if prev and any(s <= minute + 1440 < e for s, e in prev):
        return True
    return False


def metres(a, b):
    r = 6371000
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp, dl = p2 - p1, math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))
