"""
Tests for Founder & Venture Validation Engine and Endpoints.
Ensures unit economics calculations, sensitivity analysis,
Van Westendorp pricing curves, and API endpoints work reliably.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from founder.unit_economics import analyse, sensitivity, generate_markdown_report
from founder.van_westendorp import analyse_prices

client = TestClient(app)


def get_auth_token():
    res = client.post("/api/auth/login", json={"email": "owner@pragency.eg", "password": "Password123!"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_unit_economics_analysis():
    """Verify contribution, margins, break-even, and cash needed calculations."""
    spec = {
        "business": "Moss Matcha Bar",
        "unit": "cup",
        "price": 6.50,
        "variable": [
            {"label": "Matcha", "cost": 0.92},
            {"label": "Oat milk", "cost": 0.38},
            {"label": "Cup", "cost": 0.24},
            {"label": "Card fees", "cost": 0.20},
        ],
        "fixed_monthly": [
            {"label": "Labour", "cost": 15500},
            {"label": "Rent", "cost": 11040},
        ],
        "startup": [
            {"label": "Espresso machine", "cost": 12000},
            {"label": "Fit-out", "cost": 13280},
        ],
        "plan_per_day": 383,
        "days_per_month": 30,
        "capacity_per_day": 600,
    }

    res = analyse(spec)
    assert res["price"] == 6.50
    assert abs(res["variable_per_unit"] - 1.74) < 0.01
    assert abs(res["contribution"] - 4.76) < 0.01
    assert res["contribution_pct"] > 0.70
    assert round(res["breakeven_per_day"]) == 186
    assert res["year1_revenue"] > 500000
    assert res["year1_profit"] > 80000
    assert res["cash_needed"] > 25000


def test_sensitivity_what_ifs():
    """Verify the three what-if scenarios adjust metrics predictably."""
    spec = {
        "business": "SaaS Platform",
        "unit": "subscriber",
        "price": 100.0,
        "variable": [{"label": "Server", "cost": 10.0}],
        "fixed_monthly": [{"label": "Team", "cost": 5000.0}],
        "plan_per_day": 5.0,
        "days_per_month": 30,
    }

    rows = sensitivity(spec)
    assert len(rows) == 4
    names = [name for name, _ in rows]
    assert "Base plan" in names
    assert "Price -10%" in names
    assert "Volume -20%" in names
    assert "Unit costs +15%" in names

    base_profit = rows[0][1]["year1_profit"]
    price_cut_profit = rows[1][1]["year1_profit"]
    assert price_cut_profit < base_profit


def test_van_westendorp_pricing():
    """Verify pricing sensitivity curve calculations."""
    rows = [
        (10.0, 20.0, 40.0, 60.0),
        (12.0, 22.0, 42.0, 65.0),
        (15.0, 25.0, 45.0, 70.0),
        (18.0, 28.0, 48.0, 75.0),
        (20.0, 30.0, 50.0, 80.0),
        (22.0, 32.0, 52.0, 85.0),
    ]
    res = analyse_prices(rows, test_price=35.0)
    assert res["pmc"] < res["pme"]
    assert res["opp"] > res["pmc"]
    assert res["opp"] < res["pme"]
    assert res["verdict"] == "Within acceptable range"


def test_founder_api_endpoints():
    """Verify /api/founder/unit-economics and /api/founder/pricing-sensitivity endpoints."""
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Unit Economics Endpoint
    spec = {
        "business": "MediAI Health",
        "unit": "clinic-month",
        "price": 499.0,
        "variable": [{"label": "Cloud GPU", "cost": 45.0}],
        "fixed_monthly": [{"label": "Engineering salaries", "cost": 15000.0}],
        "startup": [{"label": "Model fine-tuning & legal", "cost": 25000.0}],
        "plan_per_day": 3.0,
        "days_per_month": 30,
    }
    resp1 = client.post("/api/founder/unit-economics", json=spec, headers=headers)
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert "analysis" in data1
    assert "scenarios" in data1
    assert "report_markdown" in data1
    assert data1["analysis"]["contribution"] == 454.0

    # 2. Test Pricing Sensitivity Endpoint
    pricing_payload = {
        "rows": [
            [50.0, 100.0, 250.0, 400.0],
            [60.0, 120.0, 280.0, 450.0],
            [70.0, 140.0, 300.0, 500.0],
            [80.0, 160.0, 320.0, 550.0],
            [90.0, 180.0, 340.0, 600.0],
            [100.0, 200.0, 360.0, 650.0],
        ],
        "test_price": 250.0,
    }
    resp2 = client.post("/api/founder/pricing-sensitivity", json=pricing_payload, headers=headers)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert "pricing_analysis" in data2
    assert "acceptable_range" in data2["pricing_analysis"]
