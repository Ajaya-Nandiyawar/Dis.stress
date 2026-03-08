"""
Redis subscriber — listens to 'sos-events' and 'alert-broadcast' channels.

Runs in a dedicated daemon thread so it never blocks the FastAPI event loop.

Channels:
  sos-events       → parse JSON, classify via triage, PATCH result back
  alert-broadcast   → set per-threat_type cooldown flag (180 s) so the
                     social-media monitor doesn't re-fire the same alert

CRITICAL: A crashed subscriber thread = all future SOS reports are
silently untriaged.  The ENTIRE message handler is wrapped in
try/except — exceptions are logged, the loop always continues.
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
from typing import Dict, Optional

import redis

from distress_ai.config import settings
from distress_ai.models import SOSReport
from distress_ai.triage import classify
from distress_ai.routing import patch_triage

logger = logging.getLogger("distress.subscriber")

_CHANNELS = ["sos-events", "alert-broadcast"]
_subscriber_thread: Optional[threading.Thread] = None
_stop_event = threading.Event()

# ── Cooldown state ──────────────────────────────────────
# Keyed by threat_type string → expiry timestamp (epoch).
# Shared with the monitor via is_on_cooldown().

_cooldowns: Dict[str, float] = {}
_cooldown_lock = threading.Lock()
_COOLDOWN_SECONDS = 180


def is_on_cooldown(threat_type: str) -> bool:
    """Return True if this threat_type was recently broadcast (< 180 s ago)."""
    with _cooldown_lock:
        expiry = _cooldowns.get(threat_type)
        if expiry is None:
            return False
        if time.time() >= expiry:
            # cooldown expired — clean up
            del _cooldowns[threat_type]
            return False
        return True


def _set_cooldown(threat_type: str) -> None:
    """Mark a threat_type as on cooldown for 180 seconds."""
    with _cooldown_lock:
        _cooldowns[threat_type] = time.time() + _COOLDOWN_SECONDS
    logger.info(
        "[COOLDOWN]  %s on cooldown for %ds", threat_type, _COOLDOWN_SECONDS,
    )


# ── SOS message handler ────────────────────────────────

async def _classify_and_patch(report: SOSReport) -> None:
    """Async coroutine: classify the report then PATCH the result."""
    result = await classify(report)
    logger.info(
        "[TRIAGE]  id=%d  severity=%d  label=%s  tags=%s",
        report.id, result.severity, result.label, result.tags,
    )
    await patch_triage(report.id, result)


def _handle_sos(raw: str, loop: asyncio.AbstractEventLoop) -> None:
    """
    Parse a raw JSON string from Redis, validate against SOSReport,
    then schedule async classify + PATCH on the event loop.

    IMPORTANT: ``raw`` is always a plain string — never assume it is
    already a dict.  Always call ``json.loads`` first.
    """
    try:
        data = json.loads(raw)
        report = SOSReport(**data)
        logger.info(
            "[IN]  SOS id=%d  source=%s  lat=%.4f  lng=%.4f  msg=%.60s",
            report.id, report.source.value,
            report.lat, report.lng,
            report.message[:60],
        )

        # Schedule async classify + PATCH on the main event loop
        asyncio.run_coroutine_threadsafe(
            _classify_and_patch(report), loop
        )

    except json.JSONDecodeError:
        logger.error("[FAIL]  Invalid JSON on sos-events: %s", raw[:200])
    except Exception:
        logger.exception("[FAIL]  Error processing SOS message")


# ── Alert-broadcast handler ─────────────────────────────

def _handle_alert_broadcast(raw: str) -> None:
    """
    Handle an alert-broadcast message from Node.js.
    Sets a cooldown flag keyed by threat_type so the social-media
    monitor won't re-fire the same alert type during demo.
    """
    try:
        data = json.loads(raw)
        threat_type = data.get("threat_type", "unknown")
        _set_cooldown(threat_type)
    except json.JSONDecodeError:
        logger.error("[FAIL]  Invalid JSON on alert-broadcast: %s", raw[:200])
    except Exception:
        logger.exception("[FAIL]  Error processing alert-broadcast message")


# ── Subscriber thread body ──────────────────────────────

def _subscriber_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Blocking loop — subscribes to both channels in one thread."""
    if not settings.redis_url:
        logger.error("[FAIL]  REDIS_URL not configured — subscriber will not start.")
        return

    logger.info("[INIT]  Connecting to Redis ...")
    try:
        client = redis.from_url(settings.redis_url)
        pubsub = client.pubsub()
        pubsub.subscribe(*_CHANNELS)
        logger.info("[OK]  Subscribed to channels: %s", _CHANNELS)

        for message in pubsub.listen():
            if _stop_event.is_set():
                break
            if message["type"] != "message":
                continue

            channel = message["channel"]
            if isinstance(channel, bytes):
                channel = channel.decode()

            raw = message["data"]
            if isinstance(raw, bytes):
                raw = raw.decode()

            if channel == "sos-events":
                _handle_sos(raw, loop)
            elif channel == "alert-broadcast":
                _handle_alert_broadcast(raw)

        pubsub.unsubscribe(*_CHANNELS)
        pubsub.close()
        client.close()
        logger.info("[STOP]  Redis subscriber stopped.")
    except redis.ConnectionError as exc:
        logger.error("[FAIL]  Redis connection failed: %s — subscriber will not run.", exc)
    except Exception:
        logger.exception("[FAIL]  Unexpected error in Redis subscriber")


# ── Public start / stop helpers ─────────────────────────

def start_subscriber() -> None:
    """Start the daemon subscriber thread (call once at app startup)."""
    global _subscriber_thread
    _stop_event.clear()

    loop = asyncio.get_event_loop()
    _subscriber_thread = threading.Thread(
        target=_subscriber_loop,
        args=(loop,),
        daemon=True,               # exits when app exits
        name="redis-subscriber",
    )
    _subscriber_thread.start()
    logger.info("[OK]  Subscriber thread started (daemon=True).")


def stop_subscriber() -> None:
    """Signal the subscriber thread to stop (call at app shutdown)."""
    _stop_event.set()
    if _subscriber_thread and _subscriber_thread.is_alive():
        _subscriber_thread.join(timeout=5)
    logger.info("[OK]  Subscriber thread joined.")
