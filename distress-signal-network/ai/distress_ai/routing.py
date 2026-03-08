"""
Outbound HTTP routing — sends triage results and alert payloads
to the Node.js backend.

Uses httpx.AsyncClient with automatic retries and timeouts.
No hardcoded URLs; everything comes from config / environment.
"""

from __future__ import annotations

import logging
import time

import httpx

from distress_ai.config import settings
from distress_ai.models import AlertPayload, TriageResult

logger = logging.getLogger("distress.routing")

_TIMEOUT = httpx.Timeout(timeout=5.0, connect=2.0)
_RETRIES = 2


async def _request_with_retries(
    method: str,
    url: str,
    json_body: dict,
) -> httpx.Response | None:
    """Fire an HTTP request with simple retry logic and ngrok bypass header."""
    headers = {"ngrok-skip-browser-warning": "true"}
    
    for attempt in range(1, _RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT, headers=headers) as client:
                resp = await client.request(method, url, json=json_body)
                resp.raise_for_status()
                logger.info("[OK]  %s %s -> %s", method, url, resp.status_code)
                return resp
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "[WARN]  %s %s returned %s (attempt %d/%d)",
                method, url, exc.response.status_code, attempt, _RETRIES,
            )
        except httpx.RequestError as exc:
            logger.warning(
                "[WARN]  %s %s failed: %s (attempt %d/%d)",
                method, url, exc, attempt, _RETRIES,
            )
    logger.error("[FAIL]  %s %s failed after %d attempts", method, url, _RETRIES)
    return None


# ── Triage callback: PATCH /api/sos/{id}/triage ─────────

async def patch_triage(sos_id: int, result: TriageResult) -> bool:
    """
    PATCH {BACKEND_URL}/api/sos/{id}/triage
    Body: { "severity": int, "label": str, "colour": str }
    """
    if not settings.backend_url:
        logger.error("[FAIL]  BACKEND_URL not configured, skipping PATCH")
        return False

    url = f"{settings.backend_url}/api/sos/{sos_id}/triage"
    body = {
        "severity": result.severity,
        "label": result.label,
        "colour": result.colour,
    }

    t0 = time.perf_counter()
    resp = await _request_with_retries("PATCH", url, body)
    elapsed_ms = (time.perf_counter() - t0) * 1000

    if resp is not None and resp.is_success:
        logger.info(
            "[TRIAGE-CB]  id=%d  severity=%d  label=%s  status=%d  %.0fms",
            sos_id, result.severity, result.label, resp.status_code, elapsed_ms,
        )
        return True

    logger.warning(
        "[TRIAGE-CB]  id=%d  PATCH failed after %.0fms", sos_id, elapsed_ms,
    )
    return False


# ── Alert trigger: POST /api/alert/trigger ──────────────

async def post_alert_trigger(payload: AlertPayload) -> bool:
    """
    POST {BACKEND_URL}/api/alert/trigger
    Body: { "type": str, "confidence": float, "lat": float, "lng": float, "source": "nlp" }
    """
    if not settings.backend_url:
        logger.error("[FAIL]  BACKEND_URL not configured, skipping POST")
        return False

    url = f"{settings.backend_url}/api/alert/trigger"
    body = {
        "type": payload.type,
        "confidence": payload.confidence,
        "lat": payload.lat,
        "lng": payload.lng,
        "source": payload.source,
    }
    resp = await _request_with_retries("POST", url, body)

    if resp is not None and resp.is_success:
        logger.info(
            "[ALERT-CB]  type=%s  conf=%.2f  lat=%.4f  lng=%.4f  status=%d",
            payload.type, payload.confidence, payload.lat, payload.lng,
            resp.status_code,
        )
        return True

    logger.warning(
        "[ALERT-CB]  POST failed for type=%s", payload.type,
    )
    return False
