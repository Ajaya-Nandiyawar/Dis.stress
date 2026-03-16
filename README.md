<div align="center">

# 🆘 DIST.RESS Signal Network

### *Unified National Emergency Communication & Alert Orchestration*

**BlueBit 4.0 · Team Mario · Problem Statement 08 · PCCOE MLSC Hackathon**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?style=flat-square&logo=flutter&logoColor=white)](https://flutter.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Railway](https://img.shields.io/badge/Deployed-Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)](https://railway.app)
[![Vercel](https://img.shields.io/badge/Dashboard-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

---

> **Every minute after a disaster, the probability of survival drops by 80%.**  
> In India, the average gap between an emergency and first-responder arrival is **23 minutes**.  
> DIST.RESS closes that gap.

</div>

---

## 📖 Table of Contents

- [What It Does](#-what-it-does)
- [System Architecture](#-system-architecture)
- [The Four Signal Paths](#-the-four-signal-paths)
- [Sonic Cascade](#-sonic-cascade--offline-emergency-relay)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
- [Team](#-team)

---

## ✅ What It Does

DIST.RESS is a **real-time emergency alert network** with four layers:

| Layer | What it does |
|---|---|
| **Detect** | Four SOS sources: manual tap, Zero-Touch accelerometer auto-trigger, ESP32 IoT mesh nodes, and Sonic Cascade acoustic relay for offline phones |
| **Triage** | AI-powered NLP classifies every SOS by severity (Critical / Urgent / Standard) within 500ms via a Python FastAPI service |
| **Broadcast** | When threat confidence ≥ 85%, alerts fire simultaneously across SMS cell broadcast, MQTT to field nodes, and WebSocket to the dashboard |
| **Dispatch** | Google OR-Tools solves the Travelling Salesman Problem to compute the optimal ambulance route across active high-priority incidents |

Everything is live, event-driven, and runs without a single page refresh.


## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       EDGE / CLIENT                         │
│                                                             │
│  📱 Flutter App      🌐 React Dashboard    📟 ESP32 Nodes  │
│  (Android)           (Mapbox + Mantine)    (IoT Mesh)       │
└──────────────┬──────────────────┬──────────────┬────────────┘
               │  POST /api/sos   │ WebSocket     │ MQTT
               ▼                  │               ▼
┌─────────────────────────────────┼───────────────────────────┐
│              INGESTION LAYER    │        (Node.js / Railway) │
│                                 │                            │
│  Express REST API  ◄────────────┘   PostgreSQL (3 tables)   │
│  Socket.io Server                   Redis Pub/Sub            │
└────────────────────┬──────────────────────────────┬─────────┘
                     │  Redis channel: sos-events    │
                     ▼                               │
┌────────────────────────────────────┐               │
│         AI PROCESSING LAYER        │               │
│         (Python / Render)          │               │
│                                    │               │
│  NLP Severity Triage               │               │
│  Social Media Monitor              │               │
│  OR-Tools TSP Solver               │               │
└────────────────────┬───────────────┘               │
                     │  PATCH /api/sos/:id/triage     │
                     │  POST /api/alert/trigger       │
                     └───────────────────────────────►│
                                                      │
                                             WebSocket broadcast
                                             → Dashboard updates live
```

**Infrastructure:**
- **Backend:** Railway (Node.js 20 + PostgreSQL add-on + Redis add-on)
- **AI Service:** Render (Python 3.11 FastAPI)
- **Dashboard:** Vercel (React 18)
- **Mobile:** APK via Google Drive (Flutter / Android)

---

## 📡 The Four Signal Paths

### 1 · Manual SOS
A citizen taps the red SOS button in the Flutter app. The app fetches GPS coordinates, submits to `POST /api/sos` with `source: "manual"`, and a grey marker appears on the operations dashboard within 2 seconds. The AI triage service classifies it within 500ms and the marker updates to red, orange, or yellow automatically — no page refresh.

### 2 · Zero-Touch Auto-SOS
The phone monitors the accelerometer continuously — even with the screen off — via an Android Foreground Service with `WAKE_LOCK`. When the combined g-force across all three axes exceeds **2.7g**, an SOS fires automatically with no human input.

```
G-force magnitude = √(gx² + gy² + gz²)   (Z-axis gravity-compensated)
Threshold: 2.7g  |  Cooldown: 5 seconds   |  Message: "AUTO-SOS: Device impact detected"
```

A **hidden developer button** (long-press the app title for 3 seconds) fires the exact same POST request as a physical shake — for testing without shaking the device.

### 3 · ESP32 IoT Node Mesh
Six ESP32 nodes are deployed at fixed locations across Pune. Each has a seismic sensor and GPS. A Python simulator (`esp32_simulator.py`) replicates all six nodes and supports:
- Single node fire
- All 6 simultaneously (via `ThreadPoolExecutor`)
- Earthquake burst — all 6 within 3 seconds with random 0–500ms jitter between fires

Each report arrives with `source: "iot_node"` and a `node_id` (`node-001` through `node-006`).

### 4 · Sonic Cascade ↓ (see below)

---

## 🔊 Sonic Cascade — Offline Emergency Relay

> *What happens when the mobile network goes down in a disaster zone?*

Sonic Cascade allows a phone with **zero connectivity** to relay an SOS via a nearby online phone — using nothing but inaudible sound.

```
OFFLINE PHONE                        ONLINE PHONE
─────────────                        ────────────
SOS payload                          Microphone listens
     │                                    │
     ▼                                    ▼
Encode as FSK tones              FFT detects frequency per bit
  '0' bit = 18,000 Hz   ──────►  Reconstruct bit stream
  '1' bit = 20,000 Hz            Decode UTF-8 JSON payload
  20ms per bit                            │
  (inaudible to humans)                   ▼
                                  POST /api/sos
                                  source: "sonic_cascade"
                                          │
                                          ▼
                                  Dashboard marker appears
```

**Technical specs:**
- FSK encoding: 18kHz = `0`, 20kHz = `1`, 20ms/bit
- Reed-Solomon FEC — tolerates up to 30% signal corruption
- Reverse acknowledgement channel: 16–17kHz

**Fallback chain (in order):**
1. Direct HTTP (if connectivity available)
2. Acoustic FSK at 18–20 kHz
3. BLE Advertisement broadcast
4. Demo mode — JSON payload shown on screen for manual relay

---

## 🛠 Tech Stack

### Backend — Node.js 20 / Express / Railway

| Package | Purpose |
|---|---|
| `express` + `cors` | REST API (8 endpoints) |
| `socket.io` | WebSocket — 3 outbound events: `new-sos`, `triage-complete`, `broadcast-alert` |
| `pg` | PostgreSQL pool (max 10 connections, SSL in production) |
| `redis` | Pub/Sub event bus — 4 channels: `sos-events`, `alert-broadcast`, `routing-request`, `routing-response` |
| `axios` | Forwarding routing requests to AI service (8s timeout + greedy fallback) |

### AI Service — Python 3.11 / FastAPI / Render

| Package | Purpose |
|---|---|
| `fastapi` + `uvicorn` | Async REST API |
| `transformers` / `scikit-learn` | NLP severity triage classifier (Hindi + English keywords) |
| `ortools` | Google OR-Tools TSP solver with hard 3-second timeout |
| `redis-py` | Subscribes to `sos-events` channel in background thread |

### Dashboard — React 18 / Vercel

| Package | Purpose |
|---|---|
| `mapbox-gl` | Live heatmap layer + circle markers + TSP route LineString |
| `@mantine/core` | Zero-CSS UI framework — AppShell, Badge, Alert, Table, Button |
| `socket.io-client` | Real-time marker updates without polling |
| `axios` | API calls via centralised `client.js` instance |

### Mobile — Flutter / Android

| Package | Purpose |
|---|---|
| `sensors_plus` | Accelerometer stream for Zero-Touch detection |
| `geolocator` | GPS coordinates for SOS payloads |
| `flutter_foreground_task` | Android Foreground Service + `WAKE_LOCK` |
| `flutter_blue_plus` | BLE advertisements for Sonic Cascade fallback |
| `permission_handler` | Runtime permission requests |

---

## 📁 Repository Structure

```Bluebit/
└── distress-signal-network/
    │
    ├── 🟢 backend/                         # Node.js / Express API
    │   ├── server.js                       # 🌟 MAIN ENTRY POINT (Express + WebSocket)
    │   ├── .env                            # 🔐 Secrets (DB URL, Redis URL, API keys)
    │   │
    │   ├── api/
    │   │   ├── routes.js                   # 🚦 All API endpoint definitions
    │   │   └── handlers/
    │   │       ├── sos.js                  # Incoming SOS → NLP triage pipeline
    │   │       └── alert.js                # NLP webhook → broadcast trigger
    │   │
    │   ├── ws/
    │   │   └── socket.js                   # 📡 WebSocket (live push to dashboard + mobile)
    │   │
    │   ├── db/
    │   │   ├── pg.js                       # 🐘 PostgreSQL connection pool
    │   │   ├── redis.js                    # ⚡ Redis pub/sub connection
    │   │   └── migrate.js                  # Creates tables: sos_reports, alerts, resources
    │   │
    │   └── scripts/
    │       └── seed-demo.js                # 🌱 Seeds the Pune Earthquake Scenario
    │
    ├── 📱 mobile/distress_signal/          # Flutter Android App
    │   └── lib/
    │       ├── main.dart                   # 🌟 MAIN ENTRY POINT (app init)
    │       │
    │       ├── screens/
    │       │   ├── home_screen.dart        # 🏠 Live status + giant SOS button
    │       │   └── sos_history.dart        # History of sent distress signals
    │       │
    │       ├── services/
    │       │   ├── api_service.dart        # 🌐 HTTP requests to backend
    │       │   ├── sonic_cascade.dart      # 🔊 Acoustic FSK encode/decode + relay
    │       │   └── shake_detector.dart     # 💥 Zero-Touch accelerometer detection
    │       │
    │       └── constants/
    │           └── config.dart             # URLs, thresholds, source enum strings
    │
    ├── 💻 frontend/                        # React Dashboard (Vite)
    │   └── src/
    │       ├── main.jsx                    # 🌟 MAIN ENTRY POINT
    │       ├── App.jsx                     # Layout + WebSocket connection setup
    │       │
    │       ├── components/
    │       │   ├── MapView.jsx             # 🗺️ Live Mapbox heatmap + markers + route
    │       │   ├── AlertBanner.jsx         # 🚨 Green/red broadcast banner
    │       │   └── TriagePanel.jsx         # Active threats + ambulance sidebar
    │       │
    │       └── services/
    │           ├── socket.js               # Socket.io event listeners
    │           └── api.js                  # Initial heatmap + history fetch
    │
    ├── 🔌 iot/                             # IoT / Hardware Simulator
    │   └── esp32_simulator.py              # 📟 Simulates ESP32 LoRa mesh nodes
    │
    └── docs/
        └── api-contract.json               # 📜 Source of truth — all endpoints + WS events
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x
- Python 3.11+
- Flutter 3.x
- Railway account (backend + DB + Redis — all free tier)
- Render account (AI service — free tier)
- Vercel account (dashboard — free tier)
- Mapbox account (free tier — dashboard map token)

---

### 1 · Backend

```bash
cd distress-signal-network/backend
npm install
cp .env.example .env        # fill in your values
node db/migrate.js          # create tables
node seed-demo.js           # seed 25 Pune SOS reports + 3 ambulances
node server.js              # start on PORT 3001
```

**Required environment variables:**
```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://default:pass@host:port
AI_SERVICE_URL=https://your-render-url.onrender.com
```

**Verify it works:**
```bash
curl http://localhost:3001/health
# {"status":"ok","db":"connected","redis":"connected"}
```

---

### 2 · AI Service

```bash
cd distress-signal-network/ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Required environment variables:**
```env
BACKEND_URL=https://your-railway-url.railway.app
REDIS_URL=redis://default:pass@host:port
```

---

### 3 · Dashboard

```bash
cd distress-signal-network/dashboard
npm install

# .env.local for development
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_MAPBOX_TOKEN=your_mapbox_token_here

npm start       # opens localhost:3000
```

---

### 4 · ESP32 Simulator

```bash
pip install requests

BACKEND_URL=https://your-railway-url.railway.app \
  python distress-signal-network/mobile/esp32_simulator.py
```

---

### 5 · Flutter App

```bash
cd distress-signal-network/mobile

# Set your backend URL in lib/constants/config.dart:
# static const String backendUrl = 'https://your-railway-url.railway.app';

flutter pub get
flutter build apk --release --target-platform android-arm64
# APK: build/app/outputs/flutter-apk/app-release.apk
```

> ⚠️ **After installing on device:** Settings → Apps → DIST.RESS → Battery → **Unrestricted**
> Required for Zero-Touch to work with screen off on all Android OEMs.

---

## 📋 API Reference

Full contract with all field types, example payloads, and per-team notes: [`docs/api-contract.json`](docs/api-contract.json)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Backend + DB + Redis status |
| `POST` | `/api/sos` | None | Submit SOS report |
| `PATCH` | `/api/sos/:id/triage` | AI service only | Update severity + colour |
| `GET` | `/api/sos/heatmap` | None | All active reports for map |
| `GET` | `/api/sos/stats` | None | Counts by severity + source |
| `POST` | `/api/alert/trigger` | None | Fire broadcast (confidence ≥ 0.85) |
| `GET` | `/api/alerts/recent` | None | Recent broadcast history |
| `GET` | `/api/routing/optimise` | None | TSP route (max 15 stops) |

### POST /api/sos — Request Body

```json
{
  "lat": 18.5204,
  "lng": 73.8567,
  "message": "Building collapsed, 3 people trapped under debris",
  "source": "manual",
  "node_id": null,
  "metadata": { "people_count": 3, "battery_pct": 85 }
}
```

`source` must be exactly one of: `"manual"` · `"zero-touch"` · `"iot_node"` · `"sonic_cascade"`  
`node_id` must be present — send `null` for all non-`iot_node` sources.

### WebSocket Events (server → client)

```js
// New SOS arrives — always grey, severity null
socket.on('new-sos', ({ id, lat, lng, message, source, severity, colour, created_at }) => { })

// AI triage completed — update the marker
socket.on('triage-complete', ({ id, severity, label, colour, triaged_at }) => { })

// Emergency broadcast fired
socket.on('broadcast-alert', ({ alert_id, type, confidence, lat, lng, triggered_at }) => { })
```

### Severity Reference

| Value | Label | Colour | Meaning |
|---|---|---|---|
| `1` | CRITICAL — Trapped | `#FF0000` | Immediate life threat |
| `2` | URGENT — Medical | `#FF8800` | Medical emergency |
| `3` | STANDARD — Supplies | `#FFFF00` | Supplies / assistance |
| `null` | Awaiting Triage | `#888888` | Not yet classified |

---

## ⚙️ Key Design Decisions

**Redis over Kafka** — Kafka requires ~512MB minimum RAM to run. Railway free tier provides 512MB total. Redis Pub/Sub handles our event throughput at a fraction of the footprint and deploys as a 1-click Railway add-on.

**OR-Tools hard time limit** — The TSP solver has a 3-second hard cutoff. If no solution is found, the backend returns a greedy nearest-neighbour fallback route. The response always includes `solver_used: "or-tools" | "greedy-fallback"` so operators know exactly what computed their route.

**Twitter Spoofer** — The Twitter/X API rate-limits at 15 requests per 15 minutes on the free tier. The social media monitor reads from a 1,000-tweet local CSV dataset for live demo reliability. The NLP classification pipeline is identical — only the data source changes.

**JSONB metadata columns** — Every `sos_reports` and `alerts` row has a free-form `metadata JSONB` column. Surprise hackathon requirements (`people_count`, `photo_url`, `battery_pct`) can be added by callers without any schema migration or backend code change.

**`useRef` for Mapbox** — The Mapbox `Map` object lives in a React `useRef`, not `useState`. Storing it in state causes every React re-render to destroy and recreate the map — losing all layers, sources, and markers. Map data is updated by calling `map.getSource('sos-data').setData()` directly, bypassing React's render cycle entirely.

---

## 👥 Team

| Name | Role | Stack |
|---|---|---|
| **Aryan Ketkar** | Backend Lead | Node.js · PostgreSQL · Redis · Railway |
| **Shrinidhi Zangaruchre** | AI / NLP Lead | Python · FastAPI · OR-Tools · Render |
| **Ajinkya Ubale** | Frontend Lead | React · Mapbox GL · Mantine UI · Vercel |
| **Ajaya Nandiyawar** | Mobile / IoT Lead | Flutter · sensors_plus · ESP32 Simulator |

---

## 📜 License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**DIST.RESS does not replace first responders.**  
**It gives them 20 minutes back.**

*Built in 12 hours at BlueBit 4.0 — PCCOE MLSC Hackathon, Pune · March 2026*

</div>
