# 🌊 GH FloodWatch

An AI-powered flood risk intelligence system for Ghanaian communities — built with real-time weather data, machine learning predictions, and interactive mapping.

🔗 **Live App:** https://ghfloodwatch.onrender.com

## Features
- 🗺️ Interactive map of Ghana with district boundaries
- 🤖 ML-powered flood risk predictions (Random Forest, 83.7% accuracy)
- 🌧️ Real-time weather data for 20 Ghanaian districts
- 📊 Historical rainfall and humidity charts
- 🚨 Automated flood alerts for HIGH and SEVERE risk areas
- 🗄️ SQLite database storing weather history

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript, Leaflet.js, Chart.js
- **Backend:** Python, FastAPI, SQLite
- **ML Model:** scikit-learn Random Forest Classifier
- **Weather API:** Open-Meteo (free, no API key required)
- **Deployment:** Render

## Districts Monitored
Accra, Kumasi, Tamale, Takoradi, Cape Coast, Ho, Koforidua, Bolgatanga, Wa, Sunyani, Techiman, Yendi, Obuasi, Tema, Winneba, Sogakope, Nalerigu, Damongo, Dambai, Sefwi Wiawso

## ML Model Details
- Algorithm: Random Forest Classifier (200 estimators)
- Training data: 5,000 synthetic samples based on Ghana's seasonal rainfall patterns
- Features: rainfall, humidity, temperature, wind speed, consecutive rain days, month, season
- Accuracy: 83.7%
- Risk levels: LOW, MODERATE, HIGH, SEVERE

## Built By
Derrick Kwakye —  Engineering Student