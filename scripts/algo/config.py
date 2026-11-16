"""Every tunable number of the itinerary algorithm lives here, so changing taste never means changing code."""
import json
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA_DIR = HERE.parent.parent / "supabase" / "data"

# Place score = sum of weight * signal (each signal is 0..1), minus the penalties below. Weights add up to 1.
WEIGHTS = dict(quality=0.35, popularity=0.15, price=0.15, timing=0.15, own=0.10, trend=0.10)
PENALTY_CHAIN = 0.10      # chains are rarely what a night out is about
PENALTY_MISSING = 0.05    # per important field we know nothing about (hours, rating)
PENALTY_REUSE = 0.06      # per earlier experience that already uses this place

# Bayesian average, so 5.0 from 3 reviews does not beat 4.6 from 800: (v/(v+m))*R + (m/(v+m))*C
PRIOR_RATING = 3.8
PRIOR_WEIGHT = 30
REVIEWS_FOR_FULL_POPULARITY = 2000  # log scale

# Search
BEAM_WIDTH = 20
CANDIDATES_PER_SLOT = 8
MAX_REUSE = 4                    # a place appears in at most this many generated experiences
WALK_PENALTY_PER_100M = 0.02     # a 900 m leg costs 0.18, about half a good place's quality weight
RIDE_PENALTY_PER_KM = 0.01
REPEAT_KIND_PENALTY = 0.04       # same kind of place twice in a row

# Optional per-place signals (ratings, review counts, price level, our own thumbs). The file does not exist until
# someone creates it. Check the data provider's terms before storing their fields; see README.
SIGNALS_FILE = DATA_DIR / "place_signals.csv"
TRENDS_FILE = HERE / "trends.json"


def load_trends(today=None):
    """Trends that are active today. A trend boosts places of certain kinds and can add its own itinerary template."""
    today = today or date.today()
    out = []
    for t in json.loads(TRENDS_FILE.read_text()):
        if t.get("starts") and today < date.fromisoformat(t["starts"]):
            continue
        if t.get("ends") and today > date.fromisoformat(t["ends"]):
            continue
        out.append(t)
    return out
