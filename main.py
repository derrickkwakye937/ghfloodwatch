from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import requests
import sqlite3
import joblib
import numpy as np
from datetime import datetime
import uvicorn

app = FastAPI(title="GH FloodWatch API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# ── Ghana districts ───────────────────────────────────────────
GHANA_DISTRICTS = {
    "accra": {"lat": 5.6037, "lon": -0.1870, "name": "Accra", "region": "Greater Accra"},
    "kumasi": {"lat": 6.6885, "lon": -1.6244, "name": "Kumasi", "region": "Ashanti"},
    "tamale": {"lat": 9.4075, "lon": -0.8533, "name": "Tamale", "region": "Northern"},
    "takoradi": {"lat": 4.8845, "lon": -1.7554, "name": "Takoradi", "region": "Western"},
    "cape coast": {"lat": 5.1054, "lon": -1.2466, "name": "Cape Coast", "region": "Central"},
    "sunyani": {"lat": 7.3349, "lon": -2.3123, "name": "Sunyani", "region": "Bono"},
    "ho": {"lat": 6.6011, "lon": 0.4712, "name": "Ho", "region": "Volta"},
    "koforidua": {"lat": 6.0940, "lon": -0.2574, "name": "Koforidua", "region": "Eastern"},
    "bolgatanga": {"lat": 10.7856, "lon": -0.8514, "name": "Bolgatanga", "region": "Upper East"},
    "wa": {"lat": 10.0601, "lon": -2.5099, "name": "Wa", "region": "Upper West"},
    "techiman": {"lat": 7.5833, "lon": -1.9333, "name": "Techiman", "region": "Bono East"},
    "yendi": {"lat": 9.4422, "lon": -0.0136, "name": "Yendi", "region": "Northern"},
    "obuasi": {"lat": 6.2000, "lon": -1.6667, "name": "Obuasi", "region": "Ashanti"},
    "tema": {"lat": 5.6698, "lon": -0.0166, "name": "Tema", "region": "Greater Accra"},
    "winneba": {"lat": 5.3500, "lon": -0.6333, "name": "Winneba", "region": "Central"},
    "sogakope": {"lat": 5.8719, "lon": 0.6069, "name": "Sogakope", "region": "Volta"},
    "nalerigu": {"lat": 10.5167, "lon": -0.3667, "name": "Nalerigu", "region": "North East"},
    "damongo": {"lat": 9.0833, "lon": -1.8167, "name": "Damongo", "region": "Savannah"},
    "dambai": {"lat": 8.0698, "lon": 0.1760, "name": "Dambai", "region": "Oti"},
    "sefwi wiawso": {"lat": 6.2000, "lon": -2.4833, "name": "Sefwi Wiawso", "region": "Western North"},
}

# ── Load ML model ─────────────────────────────────────────────
try:
    flood_model = joblib.load('models/flood_model.pkl')
    label_encoder = joblib.load('models/label_encoder.pkl')
    ML_AVAILABLE = True
    print("✅ ML model loaded successfully")
except:
    ML_AVAILABLE = False
    print("⚠️ ML model not found, using rule-based risk assessment")

# ── Database setup ────────────────────────────────────────────
def init_db():
    conn = sqlite3.connect("floodwatch.db")
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS weather_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT, region TEXT, temperature REAL,
        rainfall REAL, humidity INTEGER, wind_speed REAL,
        risk_level TEXT, timestamp TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        district TEXT, region TEXT, risk_level TEXT,
        rainfall REAL, message TEXT, timestamp TEXT,
        active INTEGER DEFAULT 1
    )''')
    conn.commit()
    conn.close()

init_db()

# ── ML-powered flood risk ─────────────────────────────────────
def calculate_risk(rainfall, humidity, wind_speed, temperature=27, month=None, consecutive_rain_days=1):
    if month is None:
        month = datetime.now().month

    if month in [4, 5, 6, 7]:
        season = 3
    elif month in [9, 10, 11]:
        season = 2
    elif month == 8:
        season = 1
    else:
        season = 0

    if ML_AVAILABLE:
        try:
            features = np.array([[rainfall, humidity, temperature,
                                   wind_speed, consecutive_rain_days, month, season]])
            prediction = flood_model.predict(features)
            return label_encoder.inverse_transform(prediction)[0]
        except:
            pass

    # Fallback rule-based
    score = 0
    if rainfall >= 20: score += 50
    elif rainfall >= 10: score += 30
    elif rainfall >= 5: score += 15
    if humidity >= 90: score += 30
    elif humidity >= 80: score += 15
    if wind_speed >= 40: score += 20
    elif wind_speed >= 25: score += 10
    if score >= 70: return "SEVERE"
    elif score >= 45: return "HIGH"
    elif score >= 20: return "MODERATE"
    else: return "LOW"

# ── Weather fetch ─────────────────────────────────────────────
def fetch_weather(lat, lon):
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,rain"
        f"&timezone=Africa/Accra"
    )
    r = requests.get(url, timeout=10)
    return r.json()["current"]

# ── Database helpers ──────────────────────────────────────────
def save_weather(district, region, temp, rainfall, humidity, wind, risk):
    conn = sqlite3.connect("floodwatch.db")
    c = conn.cursor()
    c.execute('''INSERT INTO weather_logs
        (district, region, temperature, rainfall, humidity, wind_speed, risk_level, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
        (district, region, temp, rainfall, humidity, wind, risk, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def save_alert(district, region, risk, rainfall):
    if risk in ["HIGH", "SEVERE"]:
        conn = sqlite3.connect("floodwatch.db")
        c = conn.cursor()
        c.execute("SELECT id FROM alerts WHERE district=? AND active=1", (district,))
        if not c.fetchone():
            msg = f"{risk} flood risk detected in {district}, {region}. Rainfall: {rainfall}mm."
            c.execute('''INSERT INTO alerts (district, region, risk_level, rainfall, message, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)''',
                (district, region, risk, rainfall, msg, datetime.now().isoformat()))
            conn.commit()
        conn.close()

# ── API Routes ────────────────────────────────────────────────
@app.get("/")
def serve_index():
    return FileResponse("templates/index.html")

@app.get("/api/weather/{district_key}")
def get_weather(district_key: str):
    district_key = district_key.lower()
    if district_key not in GHANA_DISTRICTS:
        return {"error": "District not found"}
    d = GHANA_DISTRICTS[district_key]
    try:
        w = fetch_weather(d["lat"], d["lon"])
        temp = w["temperature_2m"]
        rainfall = w["precipitation"]
        humidity = w["relative_humidity_2m"]
        wind = w["wind_speed_10m"]
        rain = w["rain"]
        risk = calculate_risk(rainfall, humidity, wind, temp)
        save_weather(d["name"], d["region"], temp, rainfall, humidity, wind, risk)
        save_alert(d["name"], d["region"], risk, rainfall)
        return {
            "district": d["name"], "region": d["region"],
            "lat": d["lat"], "lon": d["lon"],
            "temperature": temp, "rainfall": rainfall,
            "rain": rain, "humidity": humidity,
            "wind_speed": wind, "risk_level": risk,
            "ml_powered": ML_AVAILABLE,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/alerts")
def get_alerts():
    conn = sqlite3.connect("floodwatch.db")
    c = conn.cursor()
    c.execute("SELECT * FROM alerts WHERE active=1 ORDER BY timestamp DESC LIMIT 20")
    rows = c.fetchall()
    conn.close()
    return {"alerts": [{"id": r[0], "district": r[1], "region": r[2],
                         "risk_level": r[3], "rainfall": r[4],
                         "message": r[5], "timestamp": r[6]} for r in rows],
            "count": len(rows)}

@app.get("/api/history/{district_key}")
def get_history(district_key: str):
    district_key = district_key.lower()
    if district_key not in GHANA_DISTRICTS:
        return {"error": "District not found"}
    d = GHANA_DISTRICTS[district_key]
    conn = sqlite3.connect("floodwatch.db")
    c = conn.cursor()
    c.execute('''SELECT temperature, rainfall, humidity, wind_speed, risk_level, timestamp
        FROM weather_logs WHERE district=? ORDER BY timestamp DESC LIMIT 20''', (d["name"],))
    rows = c.fetchall()
    conn.close()
    return {"district": d["name"], "history": [
        {"temperature": r[0], "rainfall": r[1], "humidity": r[2],
         "wind_speed": r[3], "risk_level": r[4], "timestamp": r[5]} for r in rows
    ]}

@app.get("/api/districts")
def get_all_districts():
    return {"districts": list(GHANA_DISTRICTS.keys()), "count": len(GHANA_DISTRICTS)}

@app.get("/api/monitor")
def monitor_all():
    results = []
    for key, d in GHANA_DISTRICTS.items():
        try:
            w = fetch_weather(d["lat"], d["lon"])
            rainfall = w["precipitation"]
            humidity = w["relative_humidity_2m"]
            wind = w["wind_speed_10m"]
            temp = w["temperature_2m"]
            risk = calculate_risk(rainfall, humidity, wind, temp)
            save_weather(d["name"], d["region"], temp, rainfall, humidity, wind, risk)
            save_alert(d["name"], d["region"], risk, rainfall)
            results.append({
                "district": d["name"], "region": d["region"],
                "risk_level": risk, "rainfall": rainfall,
                "temperature": temp
            })
        except:
            continue
    return {"monitored": len(results), "ml_powered": ML_AVAILABLE, "results": results}
@app.get("/api/geojson")
def get_geojson():
    try:
        with open("data/ghana_districts.geojson", "r") as f:
            import json
            return json.load(f)
    except:
        return {"error": "GeoJSON file not found"}
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)