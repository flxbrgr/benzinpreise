from http.server import BaseHTTPRequestHandler
import json
import yfinance as yf
from datetime import datetime
import os

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Fetch Crude Oil Futures
        try:
            brent = yf.Ticker("BZ=F")
            wti = yf.Ticker("CL=F")
            
            brent_price = brent.history(period="1d")['Close'].iloc[-1]
            wti_price = wti.history(period="1d")['Close'].iloc[-1]
            
            # Simple Austrian Model Logic (Germany starting April 1, 2026)
            # 12:00 PM is the magic hour for price increases.
            now = datetime.now()
            current_hour = now.hour
            current_minute = now.minute
            
            recommendation = ""
            trend = "stable"
            
            if current_hour < 12:
                recommendation = "Refuel NOW before the 12:00 PM daily hike."
                trend = "increasing_soon"
            elif current_hour == 12:
                recommendation = "Price hike in progress. Wait for evening decreases if possible."
                trend = "peaking"
            elif 13 <= current_hour < 18:
                recommendation = "Prices are slowly decaying. Wait until 19:00 for optimal savings."
                trend = "decreasing"
            else:
                recommendation = "Prices are likely at their daily low. Refuel before tomorrow's 12:00 PM hike."
                trend = "low"

            response_data = {
                "timestamp": now.isoformat(),
                "futures": {
                    "brent": round(brent_price, 2),
                    "wti": round(wti_price, 2),
                    "currency": "USD"
                },
                "analysis": {
                    "model": "Austrian (1-Hike-Per-Day)",
                    "recommendation": recommendation,
                    "trend": trend,
                    "target_market": "Germany"
                }
            }

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
