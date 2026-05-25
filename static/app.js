// Initialize map centered on Ghana
const map = L.map('map').setView([7.9465, -1.0232], 7);

// Dark themed map tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
}).addTo(map);

// Ghana districts with coordinates
const ghanaDistricts = {
    "accra": { lat: 5.6037, lon: -0.1870, name: "Accra", region: "Greater Accra" },
    "kumasi": { lat: 6.6885, lon: -1.6244, name: "Kumasi", region: "Ashanti" },
    "tamale": { lat: 9.4075, lon: -0.8533, name: "Tamale", region: "Northern" },
    "takoradi": { lat: 4.8845, lon: -1.7554, name: "Takoradi", region: "Western" },
    "cape coast": { lat: 5.1054, lon: -1.2466, name: "Cape Coast", region: "Central" },
    "sunyani": { lat: 7.3349, lon: -2.3123, name: "Sunyani", region: "Bono" },
    "ho": { lat: 6.6011, lon: 0.4712, name: "Ho", region: "Volta" },
    "koforidua": { lat: 6.0940, lon: -0.2574, name: "Koforidua", region: "Eastern" },
    "bolgatanga": { lat: 10.7856, lon: -0.8514, name: "Bolgatanga", region: "Upper East" },
    "wa": { lat: 10.0601, lon: -2.5099, name: "Wa", region: "Upper West" },
    "techiman": { lat: 7.5833, lon: -1.9333, name: "Techiman", region: "Bono East" },
    "yendi": { lat: 9.4422, lon: -0.0136, name: "Yendi", region: "Northern" },
    "obuasi": { lat: 6.2000, lon: -1.6667, name: "Obuasi", region: "Ashanti" },
    "tema": { lat: 5.6698, lon: -0.0166, name: "Tema", region: "Greater Accra" },
    "winneba": { lat: 5.3500, lon: -0.6333, name: "Winneba", region: "Central" },
    "sogakope": { lat: 5.8719, lon: 0.6069, name: "Sogakope", region: "Volta" },
    "nalerigu": { lat: 10.5167, lon: -0.3667, name: "Nalerigu", region: "North East" },
    "damongo": { lat: 9.0833, lon: -1.8167, name: "Damongo", region: "Savannah" },
    "dambai": { lat: 8.0698, lon: 0.1760, name: "Dambai", region: "Oti" },
    "sefwi wiawso": { lat: 6.2000, lon: -2.4833, name: "Sefwi Wiawso", region: "Western North" },
};
    

// Current marker
let currentMarker = null;

// Search function
async function searchLocation() {
    const input = document.getElementById('locationInput').value.toLowerCase().trim();

    if (!input) return;

    // Show loading
    document.getElementById('weatherCard').innerHTML = `
        <h3>⏳ Loading weather data...</h3>
        <p>Fetching live data for ${input}...</p>
    `;

    try {
        const response = await fetch(`http://localhost:8000/api/weather/${encodeURIComponent(input)}`);
        const data = await response.json();

        if (data.error) {
            document.getElementById('weatherCard').innerHTML = `
                <h3>❌ District Not Found</h3>
                <p>Try: Accra, Kumasi, Tamale, Takoradi, Cape Coast, Ho, Koforidua, Bolgatanga, Wa, Sunyani, Tema, Damongo, Yendi, Obuasi, Winneba, Sogakope, Techiman, Dambai, Nalerigu, Sefwi Wiawso</p>
            `;
            return;
        }

        // Move map to location
        map.setView([data.lat, data.lon], 11);

        // Remove old marker
        if (currentMarker) map.removeLayer(currentMarker);

        // Add new marker
        currentMarker = L.marker([data.lat, data.lon])
            .addTo(map)
            .bindPopup(`<b>${data.district}, ${data.region}</b><br>Rainfall: ${data.rainfall}mm<br>Risk: ${data.risk_level}`)
            .openPopup();

        await fetchWeather({...data, key: input});

    } catch (error) {
        document.getElementById('weatherCard').innerHTML = `
            <h3>⚠️ Error</h3>
            <p>Check your internet connection and try again.</p>
        `;
    }
}
    

    

// Fetch live weather from Open-Meteo (free, no API key needed)
async function fetchWeather(district) {
    try {
        const response = await fetch(`http://localhost:8000/api/weather/${encodeURIComponent(district.key)}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Update weather card
        document.getElementById('weatherCard').innerHTML = `
            <h3>📍 ${data.district}, ${data.region}</h3>
            <p>🌡️ Temperature: <strong>${data.temperature}°C</strong></p>
            <p>🌧️ Current Rainfall: <strong>${data.rainfall} mm</strong></p>
            <p>💧 Rain: <strong>${data.rain} mm</strong></p>
            <p>⏰ Updated: <strong>${new Date(data.timestamp).toLocaleTimeString()}</strong></p>
        `;

        // Update stats
        document.getElementById('rainfall').textContent = data.rainfall;
        document.getElementById('humidity').textContent = data.humidity;
        document.getElementById('windspeed').textContent = data.wind_speed;

        // Use backend risk level
        assessFloodRisk(data.rainfall, data.humidity, data.wind_speed, data.district, data.risk_level);

    } catch (error) {
        document.getElementById('weatherCard').innerHTML = `
            <h3>⚠️ Error fetching data</h3>
            <p>Check your internet connection and try again.</p>
        `;
    }
}
        

// Flood risk assessment logic
function assessFloodRisk(rainfall, humidity, wind, locationName, riskOverride = null) {
    let risk = "";
    let description = "";
    let colorClass = "";
    let markerColor = "";

    const level = riskOverride || (rainfall >= 20 ? "SEVERE" : rainfall >= 10 ? "HIGH" : rainfall >= 5 ? "MODERATE" : "LOW");

    if (level === "SEVERE") {
        risk = "🔴 SEVERE";
        colorClass = "severe";
        description = "Extremely high flood risk. Immediate evacuation may be required in low-lying areas.";
    } else if (level === "HIGH") {
        risk = "🟠 HIGH";
        colorClass = "high";
        description = "High flood risk. Avoid low-lying and waterlogged areas.";
    } else if (level === "MODERATE") {
        risk = "🟡 MODERATE";
        colorClass = "moderate";
        description = "Moderate flood risk. Monitor conditions closely.";
    } else {
        risk = "🟢 LOW";
        colorClass = "low";
        description = "Low flood risk. Conditions are currently stable.";
    }

    // Update risk badge
    const badge = document.getElementById('riskBadge');
    badge.textContent = risk;
    badge.className = `risk-badge ${colorClass}`;
    document.getElementById('riskDescription').textContent = description;

    // Update marker popup
    if (currentMarker) {
        currentMarker.setPopupContent(`
            <b>${locationName}</b><br>
            Rainfall: ${rainfall}mm<br>
            Risk: ${risk}
        `);
    }
}

// Allow pressing Enter to search
document.getElementById('locationInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchLocation();
});