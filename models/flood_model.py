import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

# ── Generate realistic Ghana flood training data ─────────────
np.random.seed(42)
n_samples = 5000

# Ghana has two rainy seasons:
# Major: April–July | Minor: September–November
# Dry season: December–March, August

def generate_ghana_flood_data(n):
    data = []
    for _ in range(n):
        # Random month (1-12)
        month = np.random.randint(1, 13)

        # Rainfall based on Ghana's seasonal patterns
        if month in [4, 5, 6]:        # Major rainy season peak
            rainfall = np.random.exponential(18)
        elif month in [3, 7]:          # Shoulder months
            rainfall = np.random.exponential(10)
        elif month in [9, 10]:         # Minor rainy season
            rainfall = np.random.exponential(12)
        elif month in [8, 11]:         # Transition
            rainfall = np.random.exponential(6)
        else:                           # Dry season
            rainfall = np.random.exponential(2)

        rainfall = min(rainfall, 80)   # cap at 80mm

        # Humidity correlated with rainfall
        base_humidity = 60 + (rainfall * 1.2) + np.random.normal(0, 8)
        humidity = np.clip(base_humidity, 40, 100)

        # Temperature — Ghana ranges 22–35°C
        if month in [11, 12, 1, 2, 3]:
            temperature = np.random.normal(30, 2)
        else:
            temperature = np.random.normal(26, 2)
        temperature = np.clip(temperature, 22, 38)

        # Wind speed
        wind_speed = np.random.exponential(8) + np.random.normal(0, 2)
        wind_speed = np.clip(wind_speed, 0, 60)

        # Days of consecutive rain
        if month in [4, 5, 6, 9, 10]:
            consecutive_rain_days = np.random.randint(0, 10)
        else:
            consecutive_rain_days = np.random.randint(0, 3)

        # Season encoding
        if month in [4, 5, 6, 7]:
            season = 3   # Major rainy
        elif month in [9, 10, 11]:
            season = 2   # Minor rainy
        elif month == 8:
            season = 1   # Little dry
        else:
            season = 0   # Dry

        # ── Flood risk label ──────────────────────────────────
        risk_score = 0
        risk_score += min(rainfall / 5, 15)
        risk_score += (humidity - 60) / 5 if humidity > 60 else 0
        risk_score += wind_speed / 10
        risk_score += consecutive_rain_days * 1.5
        risk_score += season * 2
        risk_score += np.random.normal(0, 1.5)   # noise

        if risk_score >= 18:
            risk = "SEVERE"
        elif risk_score >= 12:
            risk = "HIGH"
        elif risk_score >= 6:
            risk = "MODERATE"
        else:
            risk = "LOW"

        data.append([rainfall, humidity, temperature, wind_speed,
                      consecutive_rain_days, month, season, risk])

    return pd.DataFrame(data, columns=[
        'rainfall', 'humidity', 'temperature', 'wind_speed',
        'consecutive_rain_days', 'month', 'season', 'risk_level'
    ])

# ── Train the model ───────────────────────────────────────────
print("Generating Ghana flood training data...")
df = generate_ghana_flood_data(n_samples)

print(f"Dataset shape: {df.shape}")
print("\nRisk level distribution:")
print(df['risk_level'].value_counts())

# Features and labels
X = df[['rainfall', 'humidity', 'temperature', 'wind_speed',
        'consecutive_rain_days', 'month', 'season']]
y = df['risk_level']

# Encode labels
le = LabelEncoder()
y_encoded = le.fit_transform(y)

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42
)

# Train Random Forest
print("\nTraining Random Forest model...")
model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\nModel Accuracy: {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=le.classes_))

# Feature importance
print("\nFeature Importance:")
features = ['rainfall', 'humidity', 'temperature', 'wind_speed',
            'consecutive_rain_days', 'month', 'season']
for feat, imp in sorted(zip(features, model.feature_importances_),
                         key=lambda x: x[1], reverse=True):
    print(f"  {feat}: {imp:.3f}")

# Save model and encoder
os.makedirs('models', exist_ok=True)
joblib.dump(model, 'models/flood_model.pkl')
joblib.dump(le, 'models/label_encoder.pkl')
print("\n✅ Model saved to models/flood_model.pkl")