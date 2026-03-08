# 🚨 DIST.RESS Backend — Emergency Signal Network

This is the high-performance Node.js backend for the **Distress Signal Network**. It handles real-time SOS ingestion, NLP-based threat triage, and automated emergency broadcasts via WebSockets and Redis.

---

## 🛠️ Quick Start (Local Development)

### 1. Start the Backend Server
```bash
# From the backend directory
npm run dev
```
*Port: `3001`*

### 2. Start the External Tunnel (Ngrok)
To allow the frontend and mobile devices to reach your local server:
```bash
ngrok http 3001
```
*Copy the `https://xxxx.ngrok-free.app` URL and share it with the team.*

---

## 🧪 Demo & Testing Commands

### Data Seeding (Pune Earthquake Scenario)
Wipes existing demo data and inserts 25 geofenced SOS reports clustered around Pune.
```bash
npm run seed
```

### Database Migrations
Ensures the local or Railway PostgreSQL schema is up-to-date.
```bash
npm run migrate
```

---

## 🚀 Deployment (Railway)

### Deploy to Production
```bash
# Commits, pushes, and triggers Railway build
bash deploy.sh
```

---

## 🛰️ Core API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health & DB/Redis status |
| `POST` | `/api/sos` | Ingest new SOS distress signal |
| `GET` | `/api/sos/heatmap` | Fetch all active SOS coordinates |
| `POST` | `/api/alert/trigger` | Trigger NLP-confirmed emergency broadcast |
| `GET` | `/api/alerts/recent` | Fetch history of confirmed threats |

---

## 📡 WebSocket Events (Socket.io)

| Event | Direction | Payload |
| :--- | :--- | :--- |
| `new-sos` | Server -> Client | New incoming SOS data |
| `triage-complete` | Server -> Client | Updated severity for SOS |
| `broadcast-alert` | Server -> Client | High-confidence emergency alert |

---

Built for **BlueBit Hackathon 2026**. 🏆
