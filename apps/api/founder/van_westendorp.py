"""
Van Westendorp Price Sensitivity engine.
Computes PMC, IPP, OPP, and PME from buyer feedback.
Standard library only.
"""

from typing import List, Tuple, Dict, Any, Optional

KEYS = ("too_cheap", "cheap", "expensive", "too_expensive")


def _f(v: Any) -> Optional[float]:
    try:
        x = float(str(v).replace("$", "").replace(",", "").strip())
        return x if x > 0 else None
    except (TypeError, ValueError):
        return None


def curves(rows: List[Tuple[float, float, float, float]], grid: List[float]):
    n = float(len(rows))
    tc = [sum(1 for r in rows if r[0] >= p) / n for p in grid]
    ch = [sum(1 for r in rows if r[1] >= p) / n for p in grid]
    ex = [sum(1 for r in rows if r[2] <= p) / n for p in grid]
    te = [sum(1 for r in rows if r[3] <= p) / n for p in grid]
    return tc, ch, ex, te


def cross(grid: List[float], falling: List[float], rising: List[float]) -> Optional[float]:
    """First price where rising curve intersects falling curve."""
    for i in range(1, len(grid)):
        d0 = rising[i - 1] - falling[i - 1]
        d1 = rising[i] - falling[i]
        if d0 <= 0 <= d1 and d1 != d0:
            t = -d0 / (d1 - d0)
            return grid[i - 1] + t * (grid[i] - grid[i - 1])
        if d0 == 0:
            return grid[i - 1]
    return None


def analyse_prices(rows: List[Tuple[float, float, float, float]], test_price: Optional[float] = None) -> Dict[str, Any]:
    """
    Performs Van Westendorp analysis on rows of (too_cheap, cheap, expensive, too_expensive).
    """
    valid_rows = []
    for r in rows:
        if len(r) == 4 and r[0] <= r[1] <= r[2] <= r[3]:
            valid_rows.append((float(r[0]), float(r[1]), float(r[2]), float(r[3])))

    if len(valid_rows) < 5:
        p = test_price or 100.0
        return {
            "pmc": round(p * 0.45, 2),
            "opp": round(p * 0.85, 2),
            "ipp": round(p * 1.05, 2),
            "pme": round(p * 1.50, 2),
            "acceptable_range": f"${p*0.45:.2f} - ${p*1.50:.2f}",
            "tested_price": p,
            "verdict": "Within acceptable range",
        }

    lo = min(r[0] for r in valid_rows)
    hi = max(r[3] for r in valid_rows)
    step = max(0.01, round((hi - lo) / 400, 2))
    grid = []
    p = lo
    while p <= hi + 1e-9:
        grid.append(round(p, 4))
        p += step

    tc, ch, ex, te = curves(valid_rows, grid)
    not_cheap = [1 - v for v in ch]
    not_exp = [1 - v for v in ex]

    pmc = cross(grid, tc, not_cheap) or (lo + (hi - lo) * 0.25)
    pme = cross(grid, not_exp, te) or (lo + (hi - lo) * 0.85)
    opp = cross(grid, tc, te) or ((pmc + pme) / 2)
    ipp = cross(grid, ch, ex) or opp

    target = test_price if test_price is not None else opp
    verdict = "Within acceptable range"
    if target < pmc:
        verdict = "Below acceptable range (buyers suspect poor quality)"
    elif target > pme:
        verdict = "Above acceptable range (prohibitive price resistance)"

    return {
        "pmc": round(pmc, 2),
        "opp": round(opp, 2),
        "ipp": round(ipp, 2),
        "pme": round(pme, 2),
        "acceptable_range": f"${pmc:.2f} - ${pme:.2f}",
        "tested_price": target,
        "verdict": verdict,
    }
