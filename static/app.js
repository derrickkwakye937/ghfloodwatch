// Initialize map centered on Ghana
const map = L.map('map').setView([7.9465, -1.0232], 7);

// Dark themed map tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
}).addTo(map);

// Ghana districts with coordinates
const ghanaDistricts = {
    "accra": { lat: 5.6037, lon: -0.1870, name: "Accra, Greater Accra" },
    "kumasi": { lat: 6.6885, lon: -1.6244, name: "Kumasi, Ashanti" },
    "tamale": { lat: 9.4075, lon: -0.8533, name: "Tamale, Northern" },
    "takoradi": { lat: 4.8845, lon: -1.7554, name: "Takoradi, Western" },
    "cape coast": { lat: 5.1054, lon: -1.2466, name: "Cape Coast, Central" },
    "sunyani": { lat: 7.3349, lon: -2.3123, name: "Sunyani, Bono" },
    "ho": { lat: 6.6011, lon: 0.4712, name: "Ho, Volta" },
    "koforidua": { lat: 6.0940, lon: -0.2574, name: "Koforidua, Eastern" },
    "bolgatanga": { lat: 10.7856, lon: -0.8514, name: "Bolgatanga, Upper East" },
    "wa": { lat: 10.0601, lon: -2.5099, name: "Wa, Upper West" }
};

// Current marker
let currentMarker = null;

// Search function
async function searchLocation() {
    const input = document.getElementById('locationInput').value.toLowerCase().trim();

    // Check if district exists
    const district = ghanaDistricts[input];

    if (!district) {
        document.getElementById('weatherCard').innerHTML = `
            <h3>❌ District Not Found</h3>
            <p>Try: Accra, Kumasi, Tamale, Takoradi, Cape Coast, Ho, Koforidua, Bolgatanga, Wa, Sunyani</p>
        `;
        return;
    }

    // Move map to location
    map.setView([district.lat, district.lon], 11);

    // Remove old marker
    if (currentMarker) map.removeLayer(currentMarker);

    // Add new marker
    currentMarker = L.marker([district.lat, district.lon])
        .addTo(map)
        .bindPopup(`<b>${district.name}</b><br>Fetching weather data...`)
        .openPopup();

    // Show loading state
    document.getElementById('weatherCard').innerHTML = `
        <h3>⏳ Loading weather data...</h3>
        <p>Fetching live data for ${district.name}</p>
    `;

    // Fetch weather data
    await fetchWeather(district);
}

// Fetch live weather from Open-Meteo (free, no API key needed)
async function fetchWeather(district) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${district.lat}&longitude=${district.lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,rain&daily=precipitation_sum&timezone=Africa%2FAccra&forecast_days=1`;

        const response = await fetch(url);
        const data = await response.json();

        const current = data.current;
        const temp = current.temperature_2m;
        const humidity = current.relative_humidity_2m;
        const rainfall = current.precipitation;
        const wind = current.wind_speed_10m;
        const rain = current.rain;

        // Update weather card
        document.getElementById('weatherCard').innerHTML = `
            <h3>📍 ${district.name}</h3>
            <p>🌡️ Temperature: <strong>${temp}°C</strong></p>
            <p>🌧️ Current Rainfall: <strong>${rainfall} mm</strong></p>
            <p>💧 Rain: <strong>${rain} mm</strong></p>
        `;

        // Update stats
        document.getElementById('rainfall').textContent = rainfall;
        document.getElementById('humidity').textContent = humidity;
        document.getElementById('windspeed').textContent = wind;

        // Calculate flood risk
        assessFloodRisk(rainfall, humidity, wind, district.name);

    } catch (error) {
        document.getElementById('weatherCard').innerHTML = `
            <h3>⚠️ Error fetching data</h3>
            <p>Check your internet connection and try again.</p>
        `;
    }
}

// Flood risk assessment logic
function assessFloodRisk(rainfall, humidity, wind, locationName) {
    let risk = "";
    let description = "";
    let colorClass = "";
    let markerColor = "";

    if (rainfall >= 20) {
        risk = "🔴 SEVERE";
        colorClass = "severe";
        description = "Extremely high flood risk. Immediate evacuation may be required in low-lying areas.";
        markerColor = "red";
    } else if (rainfall >= 10) {
        risk = "🟠 HIGH";
        colorClass = "high";
        description = "High flood risk. Avoid low-lying and waterlogged areas.";
        markerColor = "orange";
    } else if (rainfall >= 5) {
        risk = "🟡 MODERATE";
        colorClass = "moderate";
        description = "Moderate flood risk. Monitor conditions closely.";
        markerColor = "yellow";
    } else {
        risk = "🟢 LOW";
        colorClass = "low";
        description = "Low flood risk. Conditions are currently stable.";
        markerColor = "green";
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