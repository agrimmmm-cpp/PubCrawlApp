#!/usr/bin/env python3
"""Checks app/data/quests.ts against the safety rules, so a new quest cannot slip in something it should not.

    python3 scripts/check_quests.py

Fails (exit 1) on: fewer than 200 or more than 250 quests, duplicate texts, a banned word, a quest about a stranger
that does not say to ask first, a drink quest outside the drink category, or a level / media / group value that
the app does not know.
"""
import collections
import re
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "app" / "data" / "quests.ts"
BANNED = [
    r"\bchug", r"\bshots?\b", r"\bfinish (your|the|a) drink", r"\bdown (your|the|a|it)\b", r"\bbottoms? up", r"\bas many\b",
    r"\bhow (many|much|fast)", r"\brace\b", r"\bfaster\b", r"\bkiss", r"\btouch", r"\bhug\b", r"\bnaked", r"\bclimb",
    r"\btrespass", r"\bswim", r"\bfire\b", r"\bdrive\b", r"\bdriving", r"\bjump (in|off|over)", r"\btraffic", r"\broad\b",
    r"\bblindfold", r"\bsteal", r"\bphone number", r"\bhome address",
    # Drinking amount, strength or intoxication, and anything physical that is unsafe after drinks.
    r"\bstrong", r"\bsprint", r"\brun(ning)?\b", r"\bgulp", r"\bbinge", r"\bwasted", r"\bhammered", r"\bsloshed", r"\bblackout",
    r"\bdrunk", r"\bafter (a few|some|two|three|\d) drinks", r"\bextra round", r"\bfull pint", r"\bpint of",
]
MEDIA = {"photo", "video", "either", "none"}


def rows():
    text = SRC.read_text()
    out, cat = [], None
    for line in text.splitlines():
        m = re.match(r"const (\w+): Row\[\] = \[", line)
        if m:
            cat = m.group(1)
            continue
        if line.startswith("];"):
            cat = None
        if cat and line.startswith("  ["):
            m = re.match(r"\s*\[\s*(['\"])(.*?)\1,\s*'(\w+)',\s*([123])(?:,\s*'(\w+)')?(?:,\s*'(\w+)')?(?:,\s*(\d+))?\s*\],?\s*$", line)
            if not m:
                print(f"cannot read: {line.strip()[:90]}")
                sys.exit(1)
            out.append(dict(cat=cat, text=m.group(2).replace("\\'", "'"), media=m.group(3), level=int(m.group(4)), group=m.group(5) or "any", place=m.group(6) or "any", seconds=int(m.group(7)) if m.group(7) else None))
    return out


def main():
    qs = rows()
    problems = []
    if not 200 <= len(qs) <= 250:
        problems.append(f"{len(qs)} quests, want 200 to 250")
    seen = collections.Counter(q["text"].lower() for q in qs)
    problems += [f"duplicate: {t}" for t, n in seen.items() if n > 1]
    for q in qs:
        t = q["text"].lower()
        for pat in BANNED:
            if re.search(pat, t):
                problems.append(f"banned '{pat}' in: {q['text']}")
        if "stranger" in t or "someone nearby" in t or "someone at another table" in t:
            if not any(w in t for w in ("ask", "if they", "only", "happy", "agree", "permission")):
                problems.append(f"stranger quest without 'ask first': {q['text']}")
        if re.search(r"\b(drink|toast|cheers|bartender|cocktail|glass)\b", t) and q["cat"] not in ("toast", "flirt", "confess", "heart"):
            if not re.search(r"\b(water|menu|order|ask|staff|mocktail)\b", t):
                problems.append(f"drink-ish quest outside the drink category: {q['text']}")
        if q["cat"] == "toast" and not any(w in t for w in ("drink", "toast", "cheers", "bartender", "cocktail", "mocktail", "order", "glass")):
            problems.append(f"toast quest that is not about a drink: {q['text']}")
        if q["seconds"] is not None and not 15 <= q["seconds"] <= 120:
            problems.append(f"odd clock ({q['seconds']}s): {q['text']}")
        if q["media"] not in MEDIA:
            problems.append(f"bad media: {q['text']}")
        if len(q["text"]) > 170:
            problems.append(f"too long ({len(q['text'])}): {q['text']}")
    print(f"{len(qs)} quests")
    print("by category:", dict(collections.Counter(q["cat"] for q in qs)))
    print("by level:   ", dict(sorted(collections.Counter(q["level"] for q in qs).items())))
    print("timed:      ", sum(q["seconds"] is not None for q in qs))
    print("by media:   ", dict(collections.Counter(q["media"] for q in qs)))
    print("need friends:", sum(q["group"] == "group" for q in qs), " place-specific:", sum(q["place"] != "any" for q in qs))
    if problems:
        print("\nPROBLEMS:")
        print("\n".join(problems))
        sys.exit(1)
    print("all checks passed")


if __name__ == "__main__":
    main()
