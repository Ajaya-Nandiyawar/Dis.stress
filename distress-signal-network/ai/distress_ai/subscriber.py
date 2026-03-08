"""
Redis subscriber — listens to the 'sos-events' channel for inbound
SOS reports published by the Node.js backend.

Runs in a dedicated background thread so it does not block the
FastAPI event loop.  After classifying each report it fires the
outbound PATCH call asynchronously.
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
from typing import Optional

import redis

from distress_ai.config import settings
from distress_ai.models import SOSReport
from distress_ai.triage import classify
from distress_ai.routing import patch_triage

logger = logging.getLogger("distress.subscriber")

_CHANNEL = "sos-events"
_subscriber_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()


# ── Message handler ─────────────────────────────────────

def _handle_message(raw: str, loop: asyncio.AbstractEventLoop) -> None:
    """
    Parse a raw JSON string from Redis, validate it against SOSReport,
    run the triage classifier, and schedule the outbound PATCH.

    IMPORTANT: ``raw`` is always a plain string — never assume it is
    already a dict.  Always call ``json.loads`` first.
    """
    try:
        data = json.loads(raw)
        report = SOSReport(**data)
        logger.info(
            "[IN]  SOS id=%d  source=%s  lat=%.4f  lng=%.4f  msg=%s",
            report.id, report.source.value,
            report.lat, report.lng,
            report.message[:80],
        )

        result = classify(report)
        logger.info(
            "[TRIAGE]  id=%d  severity=%s  confidence=%.2f  tags=%s",
            report.id, result.severity.value, result.confidence, result.tags,
        )

        # Schedule the async outbound call on the main event loop.
        # patch_triage needs the id as an int for the URL path param.
        asyncio.run_coroutine_threadsafe(
            patch_triage(report.id, result), loop
        )

    except json.JSONDecodeError:
        logger.error("[FAIL]  Invalid JSON on %s: %s", _CHANNEL, raw[:200])
    except Exception:
        logger.exception("[FAIL]  Error processing SOS message")


# ── Subscriber thread body ──────────────────────────────

def _subscriber_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Blocking loop that listens to Redis pub/sub."""
    if not settings.redis_url:
        logger.error("[FAIL]  REDIS_URL not configured — subscriber will not start.")
        return

    logger.info("[INIT]  Connecting to Redis ...")
    try:
        client = redis.from_url(settings.redis_url)
        pubsub = client.pubsub()
        pubsub.subscribe(_CHANNEL)
        logger.info("[OK]  Subscribed to channel: %s", _CHANNEL)

        for message in pubsub.listen():
            if _stop_event.is_set():
                break
            if message["type"] == "message":
                _handle_message(message["data"].decode(), loop)

        pubsub.unsubscribe(_CHANNEL)
        pubsub.close()
        client.close()
        logger.info("[STOP]  Redis subscriber stopped.")
    except redis.ConnectionError as exc:
        logger.error("[FAIL]  Redis connection failed: %s — subscriber will not run.", exc)
    except Exception:
        logger.exception("[FAIL]  Unexpected error in Redis subscriber")


# ── Public start / stop helpers ─────────────────────────

def start_subscriber() -> None:
    """Start the subscriber thread (call once at app startup)."""
    global _subscriber_thread
    _stop_event.clear()

    loop = asyncio.get_event_loop()
    _subscriber_thread = threading.Thread(
        target=_subscriber_loop,
        args=(loop,),
        daemon=True,
        name="redis-subscriber",
    )
    _subscriber_thread.start()
    logger.info("[OK]  Subscriber thread started.")


def stop_subscriber() -> None:
    """Signal the subscriber thread to stop (call at app shutdown)."""
    _stop_event.set()
    if _subscriber_thread and _subscriber_thread.is_alive():
        _subscriber_thread.join(timeout=5)
    logger.info("[OK]  Subscriber thread joined.")
