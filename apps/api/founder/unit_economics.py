"""
Unit economics engine for venture validation and financial viability.
Pure Python, standard library only.
"""

import json
import math
from typing import Dict, Any, List, Optional, Tuple


class NumbersError(Exception):
    pass


def _money(v: float) -> str:
    sign = "-" if v < 0 else ""
    return "%s$%s" % (sign, "{:,.2f}".format(abs(v)))


def _whole(v: float) -> str:
    sign = "-" if v < 0 else ""
    return "%s$%s" % (sign, "{:,.0f}".format(abs(round(v))))


def _sum(items: Optional[List[Dict[str, Any]]], field: str) -> float:
    total = 0.0
    for i, it in enumerate(items or []):
        if not isinstance(it, dict) or "cost" not in it:
            continue
        try:
            total += float(it["cost"])
        except (TypeError, ValueError):
            continue
    return total


def analyse(spec: Dict[str, Any], price: Optional[float] = None, volume: float = 1.0) -> Dict[str, Any]:
    """Return a dictionary with unit economics, break-even, and year 1 projections."""
    p = float(price if price is not None else spec.get("price", 100.0))
    if p <= 0:
        p = 10.0

    days = float(spec.get("days_per_month", 30))
    var = _sum(spec.get("variable"), "variable")
    fixed = _sum(spec.get("fixed_monthly"), "fixed_monthly")
    startup = _sum(spec.get("startup"), "startup")

    plan = float(spec.get("plan_per_day", 100)) * volume
    ramp = spec.get("ramp_per_day")
    if ramp is None:
        ramp = [plan] * 12
    else:
        if len(ramp) != 12:
            ramp = [plan] * 12
        ramp = [float(v) * volume for v in ramp]

    if not plan and ramp:
        plan = ramp[-1]

    contribution = p - var
    contribution_pct = (contribution / p) if p else 0.0
    breakeven_day = math.inf if contribution <= 0 else (fixed / (contribution * days)) if days else math.inf
    plan_units_month = plan * days
    margin_at_plan = ((contribution - (fixed / plan_units_month if plan_units_month else math.inf)) / p) if p else 0.0

    months = []
    cumulative = -startup
    payback_month = None
    for m, per_day in enumerate(ramp, start=1):
        units = per_day * days
        revenue = units * p
        variable_cost = units * var
        profit = revenue - variable_cost - fixed
        cumulative += profit
        if payback_month is None and cumulative >= 0:
            payback_month = m
        months.append({
            "month": m,
            "per_day": per_day,
            "units": units,
            "revenue": revenue,
            "variable": variable_cost,
            "fixed": fixed,
            "profit": profit,
            "cumulative": cumulative
        })

    year_profit = sum(m["profit"] for m in months)
    year_revenue = sum(m["revenue"] for m in months)
    lowest = min([-startup] + [m["cumulative"] for m in months])
    cash_needed = -lowest

    capacity = spec.get("capacity_per_day")
    flags = []
    if contribution <= 0:
        flags.append("Each unit loses money before rent and salaries: the price is below variable cost.")
    if capacity is not None and breakeven_day > float(capacity):
        flags.append(f"Break-even needs {breakeven_day:,.0f} units/day but capacity is only {capacity}.")
    if year_profit < 0:
        flags.append(f"Year 1 loses money on operations ({_whole(year_profit)}).")
    if payback_month is None:
        flags.append("The startup spend is not earned back within year 1.")

    return {
        "business": spec.get("business", "Venture"),
        "unit": spec.get("unit", "unit"),
        "price": p,
        "variable_per_unit": var,
        "contribution": contribution,
        "contribution_pct": contribution_pct,
        "fixed_monthly": fixed,
        "startup": startup,
        "plan_per_day": plan,
        "margin_at_plan": margin_at_plan,
        "breakeven_per_day": breakeven_day,
        "capacity_per_day": capacity,
        "year1_revenue": year_revenue,
        "year1_profit": year_profit,
        "year1_after_startup": year_profit - startup,
        "payback_month": payback_month,
        "cash_needed": cash_needed,
        "months": months,
        "flags": flags,
        "variable_items": spec.get("variable", []),
        "fixed_items": spec.get("fixed_monthly", []),
        "startup_items": spec.get("startup", []),
    }


def sensitivity(spec: Dict[str, Any]) -> List[Tuple[str, Dict[str, Any]]]:
    """The three what-if scenarios every venture plan should survive."""
    base = analyse(spec)
    rows = [("Base plan", base)]
    rows.append(("Price -10%", analyse(spec, price=base["price"] * 0.9)))
    rows.append(("Volume -20%", analyse(spec, volume=0.8)))
    worse = json.loads(json.dumps(spec))
    for it in worse.get("variable", []):
        it["cost"] = float(it["cost"]) * 1.15
    rows.append(("Unit costs +15%", analyse(worse)))
    return rows


def generate_markdown_report(spec: Dict[str, Any]) -> str:
    """Renders human-readable markdown financial memo."""
    a = analyse(spec)
    u = a["unit"]
    L = []
    L.append(f"# تقرير دراسة اقتصاديات الوحدة والجدوى: {a['business']}")
    L.append("")
    L.append(f"## 1. تحليل تكلفة وإيراد الوحدة الواحدة ({u})")
    L.append("")
    L.append(f"| البند | التكلفة لكل {u} |")
    L.append("| --- | ---: |")
    L.append(f"| سعر البيع الأساسي (Price) | {_money(a['price'])} |")
    for it in a["variable_items"]:
        L.append(f"| {it.get('label', 'تكلفة')} | -{_money(float(it.get('cost', 0)))} |")
    L.append(f"| **هامش المساهمة (Contribution)** | **{_money(a['contribution'])}** ({a['contribution_pct'] * 100:.1f}%) |")
    L.append("")
    L.append("## 2. نقطة التعادل وهوامش الربح الأساسية")
    L.append("")
    L.append(f"- **المصاريف الثابتة الشهرية:** {_whole(a['fixed_monthly'])}")
    be = a['breakeven_per_day']
    be_str = "مستحيل (السعر أقل من التكلفة)" if math.isinf(be) else f"{math.ceil(be):,} {u}/يومياً"
    L.append(f"- **نقطة التعادل المطلوبة:** **{be_str}**")
    L.append(f"- **صافي هامش الربح عند الخطة المستهدفة ({a['plan_per_day']:,.0f} {u}/يوم):** **{a['margin_at_plan'] * 100:.1f}%**")
    if a["capacity_per_day"]:
        L.append(f"- **الطاقة الاستيعابية القصوى:** {a['capacity_per_day']} {u}/يوم")
    L.append("")
    L.append("## 3. السنة الأولى شهراً بشهر (Year 1 Ramp)")
    L.append("")
    L.append(f"- **إجمالي إيرادات السنة الأولى:** {_money(a['year1_revenue'])}")
    L.append(f"- **صافي الربح التشغيلي للسنة الأولى:** {_money(a['year1_profit'])}")
    L.append(f"- **شهر استرداد رأس المال التأسيسي:** {('الشهر ' + str(a['payback_month'])) if a['payback_month'] else 'لم يسترد في السنة الأولى'}")
    L.append(f"- **السيولة النقدية المطلوبة للبدء بأمان (Cash Needed):** **{_money(a['cash_needed'])}**")
    return "\n".join(L)
