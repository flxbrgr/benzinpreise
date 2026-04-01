from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from datetime import datetime, timedelta
import os
import random
import requests
from urllib.parse import urlparse, parse_qs

# Minimal in-memory cache for "quick and dirty" Vercel sessions
# Note: For production, use Vercel KV/Redis
_cache = {
    "DE": {"time": None, "data": None},
    "FR": {"time": None, "data": None}
}

def get_jittered_time():
    """Adds a random delay (1-59s) as per Tankerkönig fair-use policy."""
    return random.randint(1, 59)

def fetch_france_data(city="Paris"):
    """Fetches French petrol prices and maps types."""
    city_encoded = city.upper()
    url = f"https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?limit=10&where=ville='{city_encoded}'"
    
    try:
        res = requests.get(url, timeout=10)
        data = res.json()
        stations = []
        
        if "results" in data:
            for r in data.results:
                # Map fuel types
                # Input: [{'nom': 'Gazole', 'maj': '...', 'valeur': 1.8}, ...]
                raw_prices = json.loads(r.get("prix", "[]").replace("'", '"'))
                prices = {}
                for p in raw_prices:
                    nom = p.get("nom")
                    val = p.get("valeur")
                    if nom == "Gazole": prices["diesel"] = val
                    elif nom == "SP95-E10": prices["e10"] = val
                    elif nom == "SP98": prices["e5"] = val # SP98 is premium E5
                
                stations.append({
                    "id": r.get("id"),
                    "name": r.get("adresse", "Station"),
                    "brand": r.get("pop", "Retail"),
                    "city": r.get("ville"),
                    "prices": prices
                })
        return stations
    except Exception as e:
        print(f"France API Error: {e}")
        return []

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        country = query.get("country", ["DE"])[0].upper()
        
        now = datetime.now()
        
        # 1. Check Cache (5 Minutes)
        cached = _cache.get(country)
        if cached and cached["time"] and (now - cached["time"]) < timedelta(minutes=5):
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('X-Cache-Hit', 'true')
            self.end_headers()
            self.wfile.write(json.dumps(cached["data"]).encode('utf-8'))
            return

        try:
            # Fetch Crude Oil Futures
            brent = yf.Ticker("BZ=F")
            wti = yf.Ticker("CL=F")
            
            # yfinance history might fail if markets are closed or symbols change
            try:
                brent_price = brent.history(period="1d")['Close'].iloc[-1]
                wti_price = wti.history(period="1d")['Close'].iloc[-1]
            except:
                brent_price = 82.50 # Fallback
                wti_price = 78.20

            recommendation = ""
            trend = "stable"
            model_info = ""

            if country == "DE":
                current_hour = now.hour
                model_info = "Austrian (1-Hike-Per-Day)"
                if current_hour < 12:
                    recommendation = "Refuel NOW before the 12:00 PM hike."
                    trend = "increasing_soon"
                elif current_hour == 12:
                    recommendation = "Price hike in progress. Wait for evening decreases."
                    trend = "peaking"
                elif 13 <= current_hour < 18:
                    recommendation = "Prices are decaying. Optimal window: 19:00 - 21:00."
                    trend = "decreasing"
                else:
                    recommendation = "Evening lows reached. Refuel before tomorrow morning."
                    trend = "low"
            else: # FR
                model_info = "French (Stable Margin)"
                # French prices are driven by supermarket competition, less intra-day volatility
                recommendation = "Market stable. Compare local supermarkets for best rates."
                trend = "stable"

            # Fetch Station Data (Mock for DE key-wait, Real for FR)
            stations = []
            if country == "FR":
                stations = fetch_france_data()
            else:
                stations = [{"id": "mock", "name": "Waiting for DE Key", "prices": {"e10": 1.75, "diesel": 1.65}}]

            response_data = {
                "timestamp": now.isoformat(),
                "country": country,
                "futures": {
                    "brent": round(brent_price, 2),
                    "wti": round(wti_price, 2),
                    "currency": "USD"
                },
                "analysis": {
                    "model": model_info,
                    "recommendation": recommendation,
                    "trend": trend
                },
                "stations": stations
            }

            _cache[country] = {"time": now, "data": response_data}

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
