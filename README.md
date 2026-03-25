# AI Health Intelligence Dashboard

A multimodal, context-aware health intelligence system that uses camera-based PPG, voice analysis, facial expression tracking, and environmental context to deliver real-time risk assessments.

## Features

### Multimodal Input Methods

| Mode | How it works | Frontend location |
|------|-------------|-------------------|
| **Finger PPG** | Rear camera + torch captures red-channel pulse signal. Butterworth bandpass (0.8–3 Hz) + Welch periodogram extracts HR. | `Input` tab → Finger PPG card with live video, signal strength, and progress bar |
| **Face rPPG** | Front camera captures micro-color changes on skin. CHROM algorithm (3R−2G, 1.5R+G−1.5B) isolates pulse. | `Input` tab → Face Scan card with ROI overlay and CHROM badge |
| **Voice + Expression** | Web Speech API transcribes 5 health questions. Front camera tracks movement, brightness, and color variance for stress indicators. | `Input` tab → Voice card with live camera, audio level bars, transcript, and skip/stop/next controls |
| **Manual Entry** | Form input for HR, SpO2, temperature, ECG, emotion. | `Input` tab → Manual card with number/select fields |

### Dashboard Views

| View | What it shows | Key components |
|------|--------------|----------------|
| **Dashboard** | Full overview — risk status, vitals, chart, conditions, weather, community, alerts | `RiskStatus`, `VitalCards`, `RiskChart`, `ConditionCards`, `ExplanationPanel`, `WeatherAlert`, `CommunitySignals`, `AlertsFeed` |
| **Input** | Mode selector + active input method + live risk status | `ModeSwitch`, `CameraInput` / `VoiceInput` / `ManualInput`, `RiskStatus` |
| **Vitals** | Vital sign cards + trend chart + conditions | `VitalCards`, `TrendAnalysis`, `ConditionCards` |
| **Analytics** | Historical risk chart + trend analysis + explanations | `RiskChart`, `TrendAnalysis`, `ExplanationPanel` |
| **Community** | Regional symptom reports + weather health risks + doctor finder | `CommunitySignals`, `WeatherAlert`, `DoctorRecommendation` |
| **Alerts** | Alert feed + doctor recommendations + conditions | `AlertsFeed`, `DoctorRecommendation`, `ConditionCards` |

### Risk Assessment Engine

- **Rule engine** (35% weight): Clinical threshold scoring — HR, SpO2, temp, ECG, emotion, voice
- **ML engine** (65% weight): RandomForest + GradientBoosting ensemble trained on 5000 samples across 6 health profiles
- **Fusion**: Weighted combination with agreement bonus (+15% confidence when both agree)
- **Output**: Risk level (Normal / Risk / High Risk), confidence score, trend, detected conditions, factor explanations

### Context Enrichment

- **Weather**: OpenWeatherMap API maps conditions to health risks (cold/heat/humidity/wind/air quality)
- **Community**: Regional symptom aggregation with trend detection (rising/falling/stable) from MongoDB
- **Geolocation**: Browser geolocation for location-aware weather and community data

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.2 | React framework (App Router) |
| React | 19 | UI rendering |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Styling |
| Recharts | 3.8 | Charts (area, line) |
| GSAP | 3.14 | Animations |
| Lucide React | 0.577 | Icons |
| Web Speech API | — | Voice-to-text |
| AudioContext | — | Real-time audio level metering |
| Canvas + ImageData | — | PPG frame capture and processing |

### Backend (Flask API)
| Technology | Purpose |
|-----------|---------|
| Flask + Flask-CORS | REST API |
| scikit-learn | ML models (RandomForest, GradientBoosting, StandardScaler) |
| NumPy | Numerical processing |
| PyMongo | MongoDB storage |
| python-dotenv | Environment config |

### Backend (rPPG WebSocket)
| Technology | Purpose |
|-----------|---------|
| FastAPI + WebSockets | Real-time frame processing |
| OpenCV | Image decode, resize, color space conversion |
| SciPy | Butterworth filter, Welch periodogram |
| NumPy | Signal arrays |

### Infrastructure
| Component | Details |
|----------|---------|
| Database | MongoDB Atlas (predictions + community reports) |
| Weather API | OpenWeatherMap |
| PPG Backend | WebSocket on port 8000 |
| Flask API | REST on port 5000 |
| Frontend | Dev server on port 3000 |

## Project Structure

```
AI_DASHBOARD/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard — state, routing, data flow
│   │   ├── layout.tsx                  # Root layout
│   │   └── globals.css                 # Tailwind base
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Sidebar.tsx             # Navigation + theme toggle
│   │   │   ├── Header.tsx              # Title bar, refresh, status
│   │   │   ├── RiskStatus.tsx          # Risk level ring + confidence + conditions
│   │   │   ├── VitalCards.tsx          # 6-card vital signs grid
│   │   │   ├── RiskChart.tsx           # Multi-line area chart (risk, HR, SpO2)
│   │   │   ├── WeatherAlert.tsx        # Weather conditions + health risks
│   │   │   ├── CommunitySignals.tsx    # Regional symptom reports + trends
│   │   │   └── AlertsFeed.tsx          # Live alert list (critical/warning/info)
│   │   ├── health/
│   │   │   ├── ConditionCards.tsx       # Detected conditions with severity
│   │   │   ├── ExplanationPanel.tsx     # Factor-by-factor risk breakdown
│   │   │   ├── TrendAnalysis.tsx        # HR/SpO2 trend line chart
│   │   │   └── DoctorRecommendation.tsx # Nearby doctor finder
│   │   ├── input/
│   │   │   ├── ModeSwitch.tsx          # 4-mode selector (finger/face/voice/manual)
│   │   │   ├── CameraInput.tsx         # PPG + rPPG camera capture + WS fusion
│   │   │   ├── VoiceInput.tsx          # Speech-to-text + expression tracking
│   │   │   └── ManualInput.tsx         # Manual vital entry form
│   │   └── ui/
│   │       ├── Badge.tsx               # Status badge with pulse option
│   │       ├── Card.tsx                # Themed card with glow variants
│   │       └── ProgressRing.tsx        # SVG circular progress
│   ├── contexts/
│   │   └── ThemeContext.tsx            # Dark/light theme (colors object)
│   ├── lib/
│   │   ├── types.ts                    # All TypeScript interfaces
│   │   ├── api.ts                      # API client + mock data generation
│   │   ├── ppg.ts                      # PPG signal processing (CHROM, FFT, Butterworth)
│   │   └── utils.ts                    # cn(), getRiskColor(), getVitalStatus()
│   └── package.json
├── backend/
│   ├── api/predict.py                  # Flask routes: /predict, /history, /stats, /health
│   ├── engine/
│   │   ├── rule_engine.py              # Clinical threshold scoring
│   │   ├── ml_engine.py                # Trained model inference
│   │   └── fusion_engine.py            # Weighted rule + ML combination
│   ├── context/
│   │   ├── weather.py                  # OpenWeatherMap integration
│   │   └── community.py               # Community symptom aggregation
│   ├── models/
│   │   ├── model.pkl                   # Trained ensemble model
│   │   └── scaler.pkl                  # Feature scaler
│   ├── db.py                           # MongoDB connection
│   ├── app.py                          # Entry point
│   ├── train_model.py                  # Model training script
│   └── requirements.txt
├── rppg_backend/
│   ├── server.py                       # FastAPI WebSocket server (face rPPG + finger PPG)
│   ├── start.sh                        # One-command startup
│   ├── requirements.txt                # fastapi, uvicorn, opencv, scipy, numpy
│   └── venv/
└── README.md
```

## Setup

### Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:3000
```

### Flask Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py               # http://localhost:5000
```

### rPPG Backend
```bash
cd rppg_backend
./start.sh                  # http://localhost:8000 (auto-creates venv)
```

## API

### POST /predict
```json
// Request
{ "hr": 105, "spo2": 92, "temp": 38.5, "ecg": "abnormal", "emotion": "stress", "voice_sentiment": "stress", "lat": 28.61, "lon": 77.20 }

// Response
{ "risk": "High Risk", "confidence": 0.87, "trend": "Declining", "weather": { "risk": "Cold weather risk", "temp": 12, ... }, "community": { "cough": 10, "fever": 5, ... }, "conditions": [...], "explanations": [...] }
```

### WebSocket /ws/{session_id}
Face rPPG — send base64 JPEG frames, receive `{ "type": "result", "bpm": 72, "confidence": 0.65, "mode": "chrom" }`.

### WebSocket /ws/finger/{session_id}
Finger PPG — same protocol, returns `{ "type": "result", "bpm": 74, "confidence": 0.82, "mode": "finger_ppg" }`.

## Signal Processing

### Finger PPG (Contact)
1. Rear camera + torch illuminates finger tissue
2. Red channel intensity tracked per frame
3. 2nd-order Butterworth bandpass 0.8–3.0 Hz
4. FFT (primary) + peak detection (secondary) for HR
5. Backend fusion: confidence-weighted average of local + WebSocket results

### Face rPPG (Contactless)
1. Front camera captures face ROI (60% width, 50% height)
2. CHROM algorithm: `xs = 3R − 2G`, `ys = 1.5R + G − 1.5B`, `signal = xs − α·ys`
3. Butterworth bandpass 0.7–4.0 Hz
4. Welch periodogram for frequency-domain HR
5. YCrCb skin detection (Cb 77–127, Cr 133–173) on backend

### Voice + Expression
1. Web Speech API captures speech per question (auto-restarts on Chrome silence)
2. Keywords extracted per category (mood, pain, stress, sleep, symptoms)
3. Front camera tracks frame-diff movement, color variance, brightness
4. Fusion: voice keywords + face expression → mood, stress level, emotion, pain detection

## ML Model

- **Training**: 5000 synthetic samples across 6 profiles (healthy, mild risk, moderate, severe, bradycardia, hypothermia)
- **Features**: HR, SpO2, Temp, ECG, Emotion, Voice Sentiment (StandardScaler normalized)
- **Models**: RandomForest (200 trees) + GradientBoosting (150 estimators)
- **Fusion**: 35% rule-based + 65% ML, agreement bonus, condition detection, factor explanations

## Team

| Role | Scope |
|------|-------|
| Person 1 | Sensor integration — camera PPG, facial analysis, voice pipeline |
| Person 2 | Frontend — Next.js dashboard, components, data visualization |
| Person 3 | Backend ML — rule engine, ML models, fusion engine |
| Person 4 | Backend API — Flask API, weather context, community signals |
