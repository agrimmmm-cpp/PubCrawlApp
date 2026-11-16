"""Place scoring. Each signal is 0..1; missing data is neutral-to-low and costs a small penalty, so adding a
rating, a review count or our own thumbs later makes the same pipeline smarter with no code change."""
import csv
import math

from . import config as C


def load_signals(path=C.SIGNALS_FILE):
    """{source_id: {rating, reviews, price_level, own_up, own_total}} from the optional signals file."""
    out = {}
    if not path.exists():
        return out
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            def num(key):
                v = (row.get(key) or "").strip()
                return float(v) if v else None
            out[row["source_id"]] = dict(
                rating=num("rating"), reviews=num("reviews"), price_level=num("price_level"),
                own_up=num("own_up"), own_total=num("own_total"),
            )
    return out


def bayes_rating(rating, reviews):
    v, m = reviews or 0, C.PRIOR_WEIGHT
    return (v / (v + m)) * rating + (m / (v + m)) * C.PRIOR_RATING


def quality(r, sig):
    if sig.get("rating") is not None:
        return (bayes_rating(sig["rating"], sig.get("reviews")) - 1) / 4  # 1..5 stars -> 0..1
    return min(1.0, r["quality"] / 7)  # the OpenStreetMap completeness heuristic, 0..7


def popularity(r, sig):
    if sig.get("reviews"):
        return min(1.0, math.log10(1 + sig["reviews"]) / math.log10(1 + C.REVIEWS_FOR_FULL_POPULARITY))
    # No review counts yet: a place that bothers to list a website, a phone and hours is more likely a live business.
    return 0.6 * ((bool(r["website"]) + bool(r["phone"]) + bool(r["hours_raw"])) / 3)


def price_fit(r, sig, budget_per_stop):
    if not budget_per_stop:
        return 0.5
    spend = r["cost"]
    return max(0.0, 1 - abs(spend - budget_per_stop) / max(budget_per_stop, 1))


def timing(ok, ride, late_wanted, late):
    if ok is True:
        base = 1.0
    elif ok is None:
        base = 0.7 if ride else 0.35  # parks and viewpoints have no hours; for a bar, unknown hours is a risk
    else:
        base = 0.0
    return min(1.0, base + (0.1 if late_wanted and late else 0))


def own(sig):
    up, total = sig.get("own_up"), sig.get("own_total")
    if not total:
        return 0.5
    return (up + 2) / (total + 4)  # thumbs-up share with a prior of 2 up in 4, so one vote does not swing it


def place_score(r, ok, ride, reuse, ctx, late_wanted=False):
    """(score, reasons). ctx: signals {id: dict}, trends [dict], budget_per_stop."""
    sig = ctx["signals"].get(r["source_id"], {})
    trend_hit = next((t for t in ctx["trends"] if r["subcategory"] in t["kinds"]), None)
    w = C.WEIGHTS
    s = (
        w["quality"] * quality(r, sig)
        + w["popularity"] * popularity(r, sig)
        + w["price"] * price_fit(r, sig, ctx.get("budget_per_stop"))
        + w["timing"] * timing(ok, ride, late_wanted, r["late"])
        + w["own"] * own(sig)
        + w["trend"] * (trend_hit["boost"] if trend_hit else 0)
    )
    reasons = []
    if r["chain"]:
        s -= C.PENALTY_CHAIN
    else:
        reasons.append("independent")
    if ok is None and not ride:
        s -= C.PENALTY_MISSING
    if sig.get("rating") is None:
        s -= C.PENALTY_MISSING
    else:
        reasons.append(f"rated {sig['rating']:.1f}" + (f" by {int(sig['reviews'])}" if sig.get("reviews") else ""))
    if reuse:
        s -= C.PENALTY_REUSE * reuse
    if ok is True:
        reasons.append("open when you arrive")
    if r["late"]:
        reasons.append("open late")
    if trend_hit:
        reasons.append(f"trending: {trend_hit['name'].lower()}")
    return s, reasons
