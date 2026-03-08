"""
DIST.RESS Signal Network — Python AI / NLP Service

FastAPI application that:
  - Subscribes to Redis 'sos-events' (inbound from Node.js)
  - Classifies each SOS report with a triage severity
  - PATCHes the triage result back to Node.js
  - Monitors a simulated social-media feed for threats
  - POSTs high-confidence alerts to Node.js
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from distress_ai.config import settings
from distress_ai.monitor import monitor_loop, stop_monitor
from distress_ai.subscriber import start_subscriber, stop_subscriber

# ── Logging ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("distress.main")


# ── Lifespan (startup / shutdown) ───────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[START]  DIST.RESS AI service starting ...")
    logger.info("[CONFIG]  REDIS_URL = %s", settings.redis_url or "(not set)")
    logger.info("[CONFIG]  BACKEND_URL = %s", settings.backend_url or "(not set)")

    start_subscriber()
    monitor_task = asyncio.create_task(monitor_loop())

    yield

    logger.info("[STOP]  DIST.RESS AI service shutting down ...")
    stop_subscriber()
    stop_monitor()
    monitor_task.cancel()
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass


# ── App creation ────────────────────────────────────────

app = FastAPI(
    title="DIST.RESS AI / NLP Service",
    description=(
        "Triage classifier and social-media threat monitor "
        "for the DIST.RESS Signal Network."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routes ──────────────────────────────────────────────

@app.get("/health", tags=["ops"])
async def health():
    """Readiness / liveness probe."""
    return {"status": "ok"}


@app.get("/", tags=["ops"])
async def root():
    return {"message": "DIST.RESS AI / NLP Service is running."}


# ── Entrypoint ──────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "distress_ai.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
