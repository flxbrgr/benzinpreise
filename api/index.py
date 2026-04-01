from http.server import BaseHTTPRequestHandler
import json
import math
import yfinance as yf
from datetime import datetime, timedelta
import os
import random
import requests
from urllib.parse import urlparse, parse_qs, quote

# ─── Constants ────────────────────────────────────────────────────────────────
BARRELS_TO_LITERS = 158.987
EUR_USD_APPROX = 0.92       # rough; could fetch FX live, but adds latency
PASS_THROUGH_RATE = 0.60    # 60% of crude cost change reaches German pump within ~1 week

FUEL_TYPE_MAP_FR = {
    "Gazole": "diesel",
    "SP95-E10": "e10",
    "SP98": "e5",
    "SP95": "e5",    # fallback for stations without SP98
    "GPLc": None,
    "E85": None,
}

DEFAULT_COORDS = {
    "DE": (52.52, 13.405),      # Berlin
    "FR": (47.9378, 1.8731),    # Saran (Loiret, near Orléans)
}

# ─── In-memory cache ──────────────────────────────────────────────────────────
_cache: dict = {}

def _cache_key(country: str, lat: float, lng: float, fuel: str, rad: float) -> str:
    return f"{country}_{round(lat, 2)}_{round(lng, 2)}_{fuel}_{rad}"


# ─── Haversine distance ───────────────────────────────────────────────────────
def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Returns distance in km between two lat/lng points."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return round(2 * R * math.asin(math.sqrt(a)), 2)


# ─── Futures Signal ────────────────────────────────────────────────────────────
def calculate_futures_signal() -> dict:
    """
    Fetches 10 days of Brent + WTI history and computes a 7-day delta.

    Pump price change formula (empirical, Germany):
        pump_Δ ≈ (brent_Δ_usd / 158.987) × EUR_USD × 0.60

    Returns pump_change_estimate in €/L.
    """
    try:
        brent_hist = yf.Ticker("BZ=F").history(period="10d")["Close"].dropna()
        wti_hist   = yf.Ticker("CL=F").history(period="10d")["Close"].dropna()

        brent_now  = float(brent_hist.iloc[-1])
        wti_now    = float(wti_hist.iloc[-1])
        brent_6dago = float(brent_hist.iloc[max(0, len(brent_hist) - 6)])
        brent_delta = brent_now - brent_6dago

        pump_est = (brent_delta / BARRELS_TO_LITERS) * EUR_USD_APPROX * PASS_THROUGH_RATE

        return {
            "brent": round(brent_now, 2),
            "wti": round(wti_now, 2),
            "brent_7d_delta": round(brent_delta, 2),
            "pump_change_estimate": round(pump_est, 4),   # €/L
            "currency": "USD",
        }
    except Exception as e:
        print(f"[futures] Error: {e}")
        return {
            "brent": 82.50, "wti": 78.20,
            "brent_7d_delta": 0.0,
            "pump_change_estimate": 0.0,
            "currency": "USD",
        }


# ─── Market Models ─────────────────────────────────────────────────────────────
def build_austrian_model(hour: int, futures: dict) -> dict:
    """
    German Austrian Model: one regulated price hike per day at ~12:00 noon.
    Prices may decrease freely throughout the evening.
    Augmented with futures-based directional signal.
    """
    pump_est = futures["pump_change_estimate"]

    if hour < 12:
        trend, action = "increasing_soon", "refuel"
        msg = "Refuel before noon — the daily hike hits at 12:00."
    elif hour == 12:
        trend, action = "peaking", "wait"
        msg = "Price hike underway. Wait for the evening decay."
    elif 13 <= hour < 19:
        trend, action = "decreasing", "wait"
        msg = "Prices are falling. Best window: 19:00–21:00."
    else:
        trend, action = "low", "refuel"
        msg = "Evening low reached. Refuel before tomorrow's noon hike."

    crude_note = ""
    if pump_est > 0.03:
        crude_note = (f" ⚠ Crude up ${futures['brent_7d_delta']:.1f}/bbl this week"
                      f" — pump prices may rise ~€{pump_est:.3f}/L over coming days.")
    elif pump_est < -0.03:
        crude_note = (f" 📉 Crude down ${abs(futures['brent_7d_delta']):.1f}/bbl this week"
                      f" — expect a ~€{abs(pump_est):.3f}/L reduction at the pump soon.")

    return {
        "model": "Austrian (1-Hike/Day)",
        "trend": trend,
        "action": action,
        "recommendation": msg + crude_note,
        "pump_change_estimate_eur": futures["pump_change_estimate"],
    }


def build_french_model(futures: dict) -> dict:
    """
    French market: driven by supermarket competition, low intra-day volatility.
    Weekly cycle: Mon/Tue cheapest, Thu/Fri/Sat highest demand.
    """
    pump_est = futures["pump_change_estimate"]
    dow = datetime.now().weekday()   # 0=Mon, 6=Sun

    if dow <= 1:
        trend, action = "low", "refuel"
        msg = "Start of week — supermarket chains (Leclerc, E.Leclerc) typically post lowest rates now."
    elif dow in [3, 4, 5]:
        trend, action = "peaking", "wait"
        msg = "Pre-weekend demand peak. Wait until Monday if you can."
    else:
        trend, action = "stable", "neutral"
        msg = "Mid-week. Compare nearby supermarket stations — margins are competitive."

    crude_note = ""
    if pump_est > 0.03:
        crude_note = (f" Crude rising (+${futures['brent_7d_delta']:.1f}/bbl)"
                      f" — expect ~€{pump_est:.3f}/L higher pump prices next week.")
    elif pump_est < -0.03:
        crude_note = (f" Crude falling (${futures['brent_7d_delta']:.1f}/bbl)"
                      f" — ~€{abs(pump_est):.3f}/L relief expected at the pump next week.")

    return {
        "model": "French (Weekly Cycle)",
        "trend": trend,
        "action": action,
        "recommendation": msg + crude_note,
        "pump_change_estimate_eur": futures["pump_change_estimate"],
    }


# ─── Station Fetchers ─────────────────────────────────────────────────────────
def fetch_france_stations(lat: float, lng: float, rad: float, fuel_type: str) -> list:
    """
    Fetches stations from data.economie.gouv.fr using ODS geolocation filter.
    ODS distance syntax: distance(geom, geom'POINT(lng lat)', Xkm)
    Note: POINT takes (longitude, latitude) order.
    """
    where   = f"distance(geom, geom'POINT({lng} {lat})', {rad}km)"
    orderby = f"distance(geom, geom'POINT({lng} {lat})')"
    url = (
        "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/"
        "prix-des-carburants-en-france-flux-instantane-v2/records"
        f"?limit=20&where={quote(where)}&order_by={quote(orderby)}"
    )

    try:
        res = requests.get(url, timeout=10)
        raw = res.json()
        stations = []

        for r in raw.get("results", []):
            # Parse prix field (may be string or list)
            prix_raw = r.get("prix", "[]")
            if isinstance(prix_raw, str):
                try:
                    prix_raw = json.loads(prix_raw.replace("'", '"'))
                except Exception:
                    prix_raw = []

            prices = {}
            for p in (prix_raw if isinstance(prix_raw, list) else []):
                nom = p.get("nom", "")
                val = p.get("valeur")
                mapped = FUEL_TYPE_MAP_FR.get(nom)
                if mapped and val is not None:
                    # valeur can be in €/L (1.729) or millieuros (1729)
                    val = val / 1000 if val > 10 else val
                    prices[mapped] = round(val, 3)

            # Apply fuel type filter
            if fuel_type != "all" and fuel_type not in prices:
                continue

            geom = r.get("geom") or {}
            slat = geom.get("lat", 0) if isinstance(geom, dict) else 0
            slng = geom.get("lon", 0) if isinstance(geom, dict) else 0
            dist_km = haversine(lat, lng, slat, slng) if slat and slng else None

            stations.append({
                "id":       r.get("id", ""),
                "name":     r.get("adresse", "—"),
                "brand":    r.get("ensigne") or r.get("pop", "Indépendant"),
                "city":     (r.get("ville") or "").capitalize(),
                "lat":      slat,
                "lng":      slng,
                "dist_km":  dist_km,
                "is_open":  True,   # live feed → currently open; no closure signal in dataset
                "prices":   prices,
            })

        return sorted(stations, key=lambda s: s["dist_km"] or 999)

    except Exception as e:
        print(f"[france] Error: {e}")
        return []


def fetch_germany_stations(lat: float, lng: float, rad: float, fuel_type: str, api_key) -> list:
    """
    Fetches stations from the Tankerkönig API.
    Falls back to a single mock entry while the API key is unavailable.
    """
    if not api_key:
        return [{
            "id":       "awaiting-key",
            "name":     "Set TANKERKOENIG_API_KEY in Vercel env to see real stations",
            "brand":    "FuelPulse",
            "city":     f"({lat:.4f}, {lng:.4f})",
            "lat":      lat,
            "lng":      lng,
            "dist_km":  0,
            "is_open":  True,
            "prices":   {"e10": 1.759, "e5": 1.879, "diesel": 1.649},
        }]

    tk_type = fuel_type if fuel_type in ("e5", "e10", "diesel") else "all"
    url = (
        f"https://creativecommons.tankerkoenig.de/json/list.php"
        f"?lat={lat}&lng={lng}&rad={rad}&sort=dist&type={tk_type}&apikey={api_key}"
    )

    try:
        data = requests.get(url, timeout=10).json()
        if not data.get("ok"):
            return []

        stations = []
        for s in data.get("stations", []):
            prices = {}
            if (v := s.get("e10")) and v > 0:   prices["e10"]    = round(v, 3)
            if (v := s.get("e5"))  and v > 0:   prices["e5"]     = round(v, 3)
            if (v := s.get("diesel")) and v > 0: prices["diesel"] = round(v, 3)

            stations.append({
                "id":       s.get("id", ""),
                "name":     s.get("name", ""),
                "brand":    s.get("brand", ""),
                "city":     s.get("place", ""),
                "lat":      s.get("lat", 0),
                "lng":      s.get("lng", 0),
                "dist_km":  round(s.get("dist", 0), 2),
                "is_open":  s.get("isOpen", False),
                "prices":   prices,
            })
        return stations

    except Exception as e:
        print(f"[tankerkoenig] Error: {e}")
        return []


# ─── Request Handler ──────────────────────────────────────────────────────────
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)

        country    = query.get("country", ["DE"])[0].upper()
        fuel_type  = query.get("type", ["all"])[0].lower()
        rad        = min(max(float(query.get("rad", [5])[0]), 1), 25)

        lat_s, lng_s = query.get("lat", [None])[0], query.get("lng", [None])[0]
        default_lat, default_lng = DEFAULT_COORDS.get(country, (48.8566, 2.3522))

        try:
            lat = float(lat_s) if lat_s else default_lat
            lng = float(lng_s) if lng_s else default_lng
        except ValueError:
            lat, lng = default_lat, default_lng

        now = datetime.now()
        key = _cache_key(country, lat, lng, fuel_type, rad)

        # ── Cache hit ──────────────────────────────────────────────────────────
        if (cached := _cache.get(key)) and (now - cached["time"]) < timedelta(minutes=5):
            self._ok(cached["data"], cache_hit=True)
            return

        # ── Jitter log (fair use) ──────────────────────────────────────────────
        print(f"[fetch] {country} lat={lat:.4f} lng={lng:.4f} rad={rad}km type={fuel_type}"
              f" | jitter policy: +{random.randint(1, 59)}s from round time")

        try:
            futures  = calculate_futures_signal()
            analysis = (build_austrian_model(now.hour, futures)
                        if country == "DE"
                        else build_french_model(futures))

            api_key = os.environ.get("TANKERKOENIG_API_KEY") or os.environ.get("NEXT_PUBLIC_TANKERKOENIG_API_KEY")
            stations = (fetch_germany_stations(lat, lng, rad, fuel_type, api_key)
                        if country == "DE"
                        else fetch_france_stations(lat, lng, rad, fuel_type))

            body = {
                "timestamp":         now.isoformat(),
                "country":           country,
                "location":          {"lat": lat, "lng": lng, "rad_km": rad, "using_default": not lat_s},
                "fuel_type_filter":  fuel_type,
                "futures":           futures,
                "analysis":          analysis,
                "stations":          stations,
            }

            _cache[key] = {"time": now, "data": body}
            self._ok(body)

        except Exception as e:
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _ok(self, data: dict, cache_hit: bool = False):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        if cache_hit:
            self.send_header("X-Cache-Hit", "true")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
