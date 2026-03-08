"""
Outbound HTTP routing — sends triage results and alert payloads
to the Node.js backend.

Uses httpx.AsyncClient with automatic retries and timeouts.
No hardcoded URLs; everything comes from config / environment.
"""

from __future__ import annotations

import logging

import httpx

from distress_ai.config import settings
from distress_ai.models import AlertPayload, TriageResult

logger = logging.getLogger("distress.routing")

_TIMEOUT = httpx.Timeout(timeout=10.0, connect=5.0)
_RETRIES = 3


async def _request_with_retries(
    method: str,
    url: str,
    json_body: dict,
) -> httpx.Response | None:
    """Fire an HTTP request with simple retry logic."""
    for attempt in range(1, _RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
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


# ── Public helpers ──────────────────────────────────────

async def patch_triage(sos_id: int, result: TriageResult) -> bool:
    """
    PATCH /api/sos/{id}/triage on the Node.js backend.
    Returns True if the backend accepted the request.
    """
    if not settings.backend_url:
        logger.error("[FAIL]  BACKEND_URL not configured, skipping PATCH")
        return False

    url = f"{settings.backend_url}/api/sos/{sos_id}/triage"
    body = {
        "severity": result.severity.value,
        "confidence": result.confidence,
        "tags": result.tags,
        "reasoning": result.reasoning,
    }
    resp = await _request_with_retries("PATCH", url, body)
    return resp is not None and resp.is_success


async def post_alert_trigger(payload: AlertPayload) -> bool:
    """
    POST /api/alert/trigger on the Node.js backend.
    Called when the social-media monitor detects a high-confidence threat.
    Returns True if the backend accepted the alert.
    """
    if not settings.backend_url:
        logger.error("[FAIL]  BACKEND_URL not configured, skipping POST")
        return False

    url = f"{settings.backend_url}/api/alert/trigger"
    resp = await _request_with_retries("POST", url, payload.model_dump())
    return resp is not None and resp.is_success
