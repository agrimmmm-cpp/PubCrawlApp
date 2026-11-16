"""Beam search over an itinerary template.

A template is an ordered list of roles (dinner, drinks, activity, late bite, scenic finale...). For each role we keep
the best BEAM_WIDTH partial nights, ranked by the sum of place scores minus walking and variety penalties, instead of
greedily taking the best-looking first stop and getting stuck with a poor, far-away third one.
"""
from . import config as C
from .hours import RIDE_MAX_M, RIDE_MIN_M, WALK_M_PER_MIN, metres, open_at
from .score import place_score


def build(tpl, hub, near, scenic_pool, used, ctx):
    """Best night for this template around this hub, or None. Returns (stops, modes, minutes, total_score)."""
    _, _, _, _, _, leg_max = hub
    slots = [[r for r in (scenic_pool if ride else near) if test(r)] for _, test, _, _, ride in tpl["stops"]]
    beam = [(0.0, (), tpl["start"], None, ())]  # (total, picked, clock, previous place, modes)

    for (role, _, stay, need_late, ride), pool in zip(tpl["stops"], slots):
        nxt = []
        for total, picked, clock, prev, modes in beam:
            taken = {p["source_id"] for p in picked}
            cands = []
            for r in pool:
                reuse = used.get(r["source_id"], 0)
                if r["source_id"] in taken or reuse >= C.MAX_REUSE:
                    continue
                leg = metres(prev["pt"], r["pt"]) if prev else 0
                if ride and prev and leg > RIDE_MAX_M:
                    continue
                if (not ride and leg > leg_max) or (ride and leg <= RIDE_MIN_M and leg > leg_max):
                    continue
                if need_late and not r["late"]:
                    continue
                by_ride = ride and leg > RIDE_MIN_M
                travel = int(6 + leg / 1000 * 2.5) if by_ride else int(leg / WALK_M_PER_MIN)
                arrive = clock + travel
                ok = None if ride else open_at(r["hours_raw"], ctx["day"], arrive % 1440)  # parks have no hours
                if ok is False:
                    continue
                s, why = place_score(r, ok, ride, reuse, ctx, late_wanted=need_late)
                step = s - (C.RIDE_PENALTY_PER_KM * leg / 1000 if by_ride else C.WALK_PENALTY_PER_100M * leg / 100)
                if prev and prev["subcategory"] == r["subcategory"]:
                    step -= C.REPEAT_KIND_PENALTY
                cands.append((step, r, arrive, by_ride, leg, ok, why))
            cands.sort(key=lambda c: (-c[0], c[1]["source_id"]))
            for step, r, arrive, by_ride, leg, ok, why in cands[: C.CANDIDATES_PER_SLOT]:
                pick = dict(r, role=role, stay=stay, arrive=arrive, open_ok=ok, leg=leg, why=why, step=step)
                nxt.append((total + step, picked + (pick,), arrive + stay, r, modes + ("ride" if by_ride else "walk",)))
        if not nxt:
            return None
        nxt.sort(key=lambda b: (-b[0], tuple(p["source_id"] for p in b[1])))
        beam = nxt[: C.BEAM_WIDTH]

    total, picked, clock, _, modes = beam[0]
    return list(picked), list(modes), clock - tpl["start"], total
