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
        const response = await fetch(`https://ghfloodwatch.onrender.com/api/weather/${encodeURIComponent(input)}`);
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
        const response = await fetch(`https://ghfloodwatch.onrender.com/api/weather/${encodeURIComponent(district.key)}`);
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
    // Use backend risk level
        assessFloodRisk(data.rainfall, data.humidity, data.wind_speed, data.district, data.risk_level);

        // Load chart for this district
        loadChart(district.key);

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
// Load active alerts
async function loadAlerts() {
    try {
        const response = await fetch('https://ghfloodwatch.onrender.com/api/alerts');
        const data = await response.json();

        const alertsList = document.getElementById('alertsList');
        const alertCount = document.getElementById('alertCount');

        alertCount.textContent = data.count;

        if (data.count === 0) {
            alertsList.innerHTML = '<p class="no-alerts">✅ No active alerts — all districts stable</p>';
            return;
        }

        alertsList.innerHTML = data.alerts.map(alert => `
            <div class="alert-item ${alert.risk_level.toLowerCase()}">
                <strong>⚠️ ${alert.district}, ${alert.region}</strong>
                <p>${alert.message}</p>
                <p style="font-size:0.75rem; color:#58a6ff">${new Date(alert.timestamp).toLocaleString()}</p>
            </div>
        `).join('');

    } catch(e) {
        console.log("Could not load alerts:", e);
    }
}

// Load rainfall history chart for a district
async function loadChart(districtKey) {
    try {
        const response = await fetch(`https://ghfloodwatch.onrender.com/api/history/${encodeURIComponent(districtKey)}`);
        const data = await response.json();

        if (!data.history || data.history.length === 0) return;

        const labels = data.history.map((_, i) => `Reading ${data.history.length - i}`).reverse();
        const rainfall = data.history.map(h => h.rainfall).reverse();
        const humidity = data.history.map(h => h.humidity).reverse();

        const ctx = document.getElementById('rainfallChart').getContext('2d');

        // Destroy existing chart if any
        if (window.floodChart) window.floodChart.destroy();

        window.floodChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Rainfall (mm)',
                        data: rainfall,
                        borderColor: '#58a6ff',
                        backgroundColor: 'rgba(88, 166, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Humidity (%)',
                        data: humidity,
                        borderColor: '#3fb950',
                        backgroundColor: 'rgba(63, 185, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#8b949e', font: { size: 11 } }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#8b949e', font: { size: 10 } },
                        grid: { color: '#21262d' }
                    },
                    y: {
                        ticks: { color: '#8b949e', font: { size: 10 } },
                        grid: { color: '#21262d' }
                    }
                }
            }
        });

    } catch(e) {
        console.log("Could not load chart:", e);
    }
}
// Load all districts as colored circles
async function loadAllDistricts() {
    const districts = [
        {name: "Accra", region: "Greater Accra", coords: [5.6037, -0.1870], key: "accra"},
        {name: "Kumasi", region: "Ashanti", coords: [6.6885, -1.6244], key: "kumasi"},
        {name: "Tamale", region: "Northern", coords: [9.4075, -0.8533], key: "tamale"},
        {name: "Takoradi", region: "Western", coords: [4.8845, -1.7554], key: "takoradi"},
        {name: "Cape Coast", region: "Central", coords: [5.1054, -1.2466], key: "cape coast"},
        {name: "Sunyani", region: "Bono", coords: [7.3349, -2.3123], key: "sunyani"},
        {name: "Ho", region: "Volta", coords: [6.6011, 0.4712], key: "ho"},
        {name: "Koforidua", region: "Eastern", coords: [6.0940, -0.2574], key: "koforidua"},
        {name: "Bolgatanga", region: "Upper East", coords: [10.7856, -0.8514], key: "bolgatanga"},
        {name: "Wa", region: "Upper West", coords: [10.0601, -2.5099], key: "wa"},
        {name: "Techiman", region: "Bono East", coords: [7.5833, -1.9333], key: "techiman"},
        {name: "Yendi", region: "Northern", coords: [9.4422, -0.0136], key: "yendi"},
        {name: "Obuasi", region: "Ashanti", coords: [6.2000, -1.6667], key: "obuasi"},
        {name: "Tema", region: "Greater Accra", coords: [5.6698, -0.0166], key: "tema"},
        {name: "Winneba", region: "Central", coords: [5.3500, -0.6333], key: "winneba"},
        {name: "Sogakope", region: "Volta", coords: [5.8719, 0.6069], key: "sogakope"},
        {name: "Nalerigu", region: "North East", coords: [10.5167, -0.3667], key: "nalerigu"},
        {name: "Damongo", region: "Savannah", coords: [9.0833, -1.8167], key: "damongo"},
        {name: "Dambai", region: "Oti", coords: [8.0698, 0.1760], key: "dambai"},
        {name: "Sefwi Wiawso", region: "Western North", coords: [6.2000, -2.4833], key: "sefwi wiawso"}
    ];

    const colors = {
        "LOW": "#3fb950",
        "MODERATE": "#d29922", 
        "HIGH": "#f85149",
        "SEVERE": "#ff0000"
    };

    // Place markers immediately with default color, then update with real data
    for (const d of districts) {
        try {
            const response = await fetch(`https://ghfloodwatch.onrender.com/api/weather/${encodeURIComponent(d.key)}`);
            const data = await response.json();
            const risk = data.risk_level || "LOW";
            const color = colors[risk] || "#58a6ff";

            L.circleMarker(d.coords, {
                radius: 14,
                fillColor: color,
                color: "#ffffff",
                weight: 2.5,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(map)
            .bindPopup(`
                <b>${d.name}, ${d.region}</b><br>
                🌡️ Temp: <strong>${data.temperature}°C</strong><br>
                🌧️ Rainfall: <strong>${data.rainfall}mm</strong><br>
                💧 Humidity: <strong>${data.humidity}%</strong><br>
                ⚠️ Risk: <strong style="color:${color}">${risk}</strong>
            `);
        } catch(e) {
            // Place grey marker if fetch fails
            L.circleMarker(d.coords, {
                radius: 14,
                fillColor: "#58a6ff",
                color: "#ffffff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(map)
            .bindPopup(`<b>${d.name}, ${d.region}</b><br>Data unavailable`);
        }
    }
    console.log("✅ All district markers loaded");
}
// Load on startup
loadGeoJSON();
setTimeout(loadAllDistricts, 2000);
loadAlerts();
setInterval(loadAlerts, 30000);