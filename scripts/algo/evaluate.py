#!/usr/bin/env python3
"""Quality report for the generated itineraries, so a change to the weights can be judged on numbers, not feel.

    python3 scripts/algo/evaluate.py

Prints, over every generated experience: how many legs are short walks, how many stops are known to be open when
the group arrives (and how many we cannot tell), kind variety, budget fit and how much places are reused.
"""
import collections
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import generate_experiences as g  # noqa: E402


def report(exps):
    legs = [s["leg"] for e in exps for s, m in zip(e[3], e[4]) if m == "walk" and s["leg"]]
    stops = [s for e in exps for s in e[3]]
    reuse = collections.Counter(s["source_id"] for s in stops)
    variety = [len({s["subcategory"] for s in e[3]}) / len(e[3]) for e in exps]
    pct = lambda n, d: f"{100 * n / d:.0f}%" if d else "n/a"
    return {
        "experiences": len(exps),
        "walking legs under 700 m": pct(sum(l <= 700 for l in legs), len(legs)),
        "median walking leg (m)": int(sorted(legs)[len(legs) // 2]) if legs else 0,
        "stops known open on arrival": pct(sum(s["open_ok"] is True for s in stops), len(stops)),
        "stops with unknown hours": pct(sum(s["open_ok"] is None for s in stops), len(stops)),
        "kind variety per experience": f"{100 * sum(variety) / len(variety):.0f}%",
        "under $50": pct(sum(e[6] <= 50 for e in exps), len(exps)),
        "distinct places used": len(reuse),
        "most reused place (times)": max(reuse.values()),
        "places used more than once": pct(sum(v > 1 for v in reuse.values()), len(reuse)),
        "with a ride leg": pct(sum("ride" in e[4] for e in exps), len(exps)),
        "trending": sum("trending" in e[7] for e in exps),
    }


if __name__ == "__main__":
    for k, v in report(g.generate(g.load())).items():
        print(f"{k:34} {v}")
