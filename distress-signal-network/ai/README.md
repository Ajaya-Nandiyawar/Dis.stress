# 🧠 DIST.RESS AI / NLP Service

> **Python FastAPI microservice** powering real-time NLP triage, social-media threat detection, and emergency route optimisation for the DIST.RESS Signal Network.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Node.js Backend                     │
│  https://tempestuous-cleopatra-scabbily.ngrok-free.dev│
└──────┬──────────────┬───────────────┬────────────────┘
       │ Redis PubSub │  HTTP PATCH   │  HTTP POST
       │  sos-events  │  /api/sos/:id │  /api/alert
       ▼              │   /triage     │   /trigger
┌──────────────────┐  │               │
│  Redis (Railway) │  │               │
└──────┬───────────┘  │               │
       │              │               │
       ▼              ▼               ▼
┌──────────────────────────────────────────────────────┐
│              🧠 This AI Service (FastAPI)            │
│                  (Render — port $PORT)               │
│                                                      │
│  ┌─────────────┐  ┌───────────┐  ┌────────────────┐  │
│  │ Subscriber  │  │  Triage   │  │ Social Monitor │  │
│  │ (Redis sub) │→ │ Classifier│  │  (Background)  │  │
│  └─────────────┘  └───────────┘  └────────────────┘  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  OR-Tools TSP Solver — /routing/optimise        │ │
│  │  POST /optimise (simplified for Node.js)        │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ai/
├── distress_ai/
│   ├── __init__.py        # Package init
│   ├── config.py          # Pydantic Settings (env vars)
│   ├── main.py            # FastAPI app, lifespan, routes
│   ├── models.py          # Pydantic data models
│   ├── monitor.py         # Background social-media threat detector
│   ├── routing.py         # Outbound HTTP (PATCH triage, POST alert)
│   ├── solver.py          # OR-Tools TSP + greedy fallback
│   ├── subscriber.py      # Redis PubSub listener thread
│   └── triage.py          # NLP severity classifier
├── test_solver.py         # Checkpoint 5 tests (OR-Tools)
├── test_subscriber.py     # Checkpoint 4 tests (Redis + triage)
├── test_wiring.py         # Checkpoint 6 tests (wiring + error handling)
├── requirements.txt       # Python dependencies
├── .env.example           # Template environment variables
├── .python-version        # Forces Python 3.11 on Render
└── README.md              # ← You are here
```

---

## ⚡ Quickstart

### 1. Install dependencies
```bash
cd distress-signal-network/ai
pip install -r requirements.txt
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Run the service
```bash
uvicorn distress_ai.main:app --port 8001
```

The service will:
- ✅ Connect to Redis and subscribe to `sos-events` + `alert-broadcast`
- ✅ Start the background social-media threat monitor (polls every 30s)
- ✅ Listen on `http://localhost:8001` for API requests

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Keep-warm ping — returns `{"status": "ok"}` in < 100ms |
| `GET` | `/` | Service info |
| `POST` | `/optimise` | **Simplified TSP** — returns `{"ordered_waypoint_ids": [...]}` |
| `POST` | `/routing/optimise` | **Full TSP** — returns complete route with distances, labels, colours |

### `POST /optimise` (used by Node.js backend)
```json
// Request
{
  "depot": { "lat": 18.5150, "lng": 73.8500 },
  "waypoints": [
    { "id": 42, "lat": 18.5204, "lng": 73.8567 },
    { "id": 40, "lat": 18.5089, "lng": 73.8259 }
  ]
}

// Response
{ "ordered_waypoint_ids": [42, 40] }
```

### `POST /routing/optimise` (full response)
```json
// Response
{
  "route": [
    { "stop": 1, "id": 42, "lat": 18.5204, "lng": 73.8567,
      "severity": 1, "label": "CRITICAL — Trapped", "colour": "#FF0000",
      "distance_from_prev_m": 0 },
    { "stop": 2, "id": 40, "lat": 18.5089, "lng": 73.8259,
      "severity": 2, "label": "URGENT — Medical", "colour": "#FF8800",
      "distance_from_prev_m": 2310 }
  ],
  "stops": 2,
  "total_distance_m": 2310,
  "solver": "or-tools"
}
```

---

## 🧪 Background Pipelines

### Redis Subscriber (`subscriber.py`)
Listens to `sos-events` channel → runs NLP triage → PATCHes severity back to the Node.js backend (`https://tempestuous-cleopatra-scabbily.ngrok-free.dev`) within 500ms.

### Social-Media Monitor (`monitor.py`)
Polls simulated social feeds every 30s. Detects threats (`earthquake`, `flood`, `blast`, `fire`, `stampede`) with confidence scoring. If confidence ≥ 0.85, fires `POST /api/alert/trigger` to the backend. Respects a 3-minute per-threat-type cooldown to prevent spamming.

### NLP Triage Classifier (`triage.py`)
Keyword-based severity classifier:

| Severity | Label | Colour | Keywords |
|----------|-------|--------|----------|
| 1 | CRITICAL — Trapped | `#FF0000` | trapped, buried, collapsed, impact |
| 2 | URGENT — Medical | `#FF8800` | injured, bleeding, broken, ambulance |
| 3 | STANDARD — Supplies | `#FFFF00` | food, water, shelter, supplies |

---

## 🛣️ OR-Tools TSP Solver (`solver.py`)

- **Max 15 waypoints** — returns HTTP 400 if exceeded
- **3-second hard timeout** — prevents blocking other requests
- **Greedy fallback** — nearest-neighbour algorithm activates if OR-Tools times out
- **Haversine distance matrix** — accurate real-world metre distances

---

## 🔧 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | Yes | Redis connection string (Railway) |
| `BACKEND_URL` | Yes | Node.js backend URL — currently `https://tempestuous-cleopatra-scabbily.ngrok-free.dev` |
| `TRIAGE_CONFIDENCE_THRESHOLD` | No | Default: `0.70` |
| `ALERT_CONFIDENCE_THRESHOLD` | No | Default: `0.85` |
| `MONITOR_INTERVAL_SECONDS` | No | Default: `30` |
| `HOST` | No | Default: `0.0.0.0` |
| `PORT` | No | Default: `8001` |

---

## 🚀 Deployment (Render)

| Setting | Value |
|---------|-------|
| **Branch** | `main` |
| **Root Directory** | `distress-signal-network/ai` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install --upgrade pip && pip install setuptools wheel && pip install -r requirements.txt` |
| **Start Command** | `uvicorn distress_ai.main:app --host 0.0.0.0 --port $PORT` |
| **Python Version** | `3.11.9` (set via `PYTHON_VERSION` env var) |

---

## 🧪 Running Tests

```bash
python -X utf8 test_subscriber.py   # Checkpoint 4 — Redis + triage
python -X utf8 test_solver.py       # Checkpoint 5 — OR-Tools TSP
python -X utf8 test_wiring.py       # Checkpoint 6 — Wiring + error handling
```

---

## 👥 Team Mario — BlueBit 4.0
