"""
Social-media / NLP threat monitor.

Periodically scans a *simulated* social-media feed and runs a keyword /
sentiment scorer.  When a post's threat confidence reaches the configured
threshold (default 0.85), it fires POST /api/alert/trigger to the Node.js
backend so dashboards get an instant broadcast.

The simulated feed is designed to be trivially replaceable with a real
data source (Reddit via PRAW, RSS feeds, NewsAPI, etc.).
"""

from __future__ import annotations

import asyncio
import logging
import random
from datetime import datetime
from typing import Dict, List, Optional, Set

from distress_ai.config import settings
from distress_ai.models import AlertPayload
from distress_ai.routing import post_alert_trigger

logger = logging.getLogger("distress.monitor")

# ── Threat keyword dictionaries ─────────────────────────

_THREAT_KEYWORDS: Dict[str, Set[str]] = {
    "violence": {
        "attack", "bomb", "shooting", "riot", "assault",
        "weapon", "explosion", "hostage", "gunfire", "stabbing",
    },
    "natural_disaster": {
        "earthquake", "flood", "tsunami", "hurricane", "tornado",
        "wildfire", "landslide", "cyclone", "volcanic eruption",
    },
    "public_health": {
        "outbreak", "pandemic", "contamination", "toxic",
        "biohazard", "quarantine", "epidemic", "mass poisoning",
    },
    "infrastructure": {
        "bridge collapse", "building collapse", "dam breach",
        "power grid failure", "gas explosion", "derailment",
    },
}

# ── Simulated social-media feed ─────────────────────────

_SIMULATED_POSTS: List[Dict[str, str]] = [
    {"text": "Beautiful sunset at the park today",                         "location": ""},
    {"text": "Just saw smoke rising near the industrial area, several explosions heard",
     "location": "12.92,77.60"},
    {"text": "Traffic is terrible on MG Road as usual",                    "location": "12.97,77.62"},
    {"text": "BREAKING: Reports of flooding in low-lying areas after heavy rain, people trapped",
     "location": "13.01,77.55"},
    {"text": "New cafe opened on Church Street, great coffee!",            "location": ""},
    {"text": "Heard gunfire near the railway station, people running",     "location": "12.98,77.57"},
    {"text": "My dog is so cute",                                          "location": ""},
    {"text": "Major earthquake tremors felt across the city, buildings shaking violently",
     "location": "12.95,77.58"},
    {"text": "Enjoying the cricket match at Chinnaswamy",                  "location": ""},
    {"text": "Suspicious package found at metro station, area being evacuated",
     "location": "12.99,77.61"},
]


# ── Threat scoring ──────────────────────────────────────

def _score_post(text: str) -> tuple[str, float, List[str]]:
    """
    Score a social-media post for threat level.
    Returns (threat_type, confidence, matched_keywords).
    """
    lower = text.lower()
    best_type = "unknown"
    best_score = 0.0
    best_kws: List[str] = []

    for threat_type, keywords in _THREAT_KEYWORDS.items():
        matched = [kw for kw in keywords if kw in lower]
        if not matched:
            continue
        score = 0.70 + min(len(matched), 4) * 0.07
        if any(w in lower for w in ("breaking", "urgent", "emergency", "just now")):
            score += 0.05
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        if caps_ratio > 0.4:
            score += 0.03
        score = min(score, 1.0)

        if score > best_score:
            best_score = score
            best_type = threat_type
            best_kws = matched

    return best_type, round(best_score, 4), best_kws


# ── Background monitor loop ────────────────────────────

_running = False


async def monitor_loop() -> None:
    """
    Async background task: polls the simulated feed at the configured
    interval and fires alerts when threats are detected.
    """
    global _running
    _running = True
    logger.info(
        "[INIT]  Social-media monitor started  (poll every %ds, threshold %.2f)",
        settings.monitor_poll_interval,
        settings.alert_confidence_threshold,
    )

    while _running:
        try:
            batch = random.sample(
                _SIMULATED_POSTS, k=min(3, len(_SIMULATED_POSTS))
            )

            for post in batch:
                threat_type, confidence, kws = _score_post(post["text"])

                if confidence >= settings.alert_confidence_threshold:
                    logger.warning(
                        "[ALERT]  Threat detected!  type=%s  conf=%.2f  kws=%s",
                        threat_type, confidence, kws,
                    )
                    payload = AlertPayload(
                        source="social-media-monitor",
                        threat_type=threat_type,
                        description=f"Potential {threat_type} detected via social media.",
                        confidence=confidence,
                        detected_at=datetime.utcnow().isoformat(),
                        raw_text=post["text"],
                        location=post.get("location") or None,
                    )
                    await post_alert_trigger(payload)
                else:
                    if confidence > 0:
                        logger.debug(
                            "[INFO]  Sub-threshold post  type=%s  conf=%.2f",
                            threat_type, confidence,
                        )

        except Exception:
            logger.exception("[FAIL]  Error in social-media monitor cycle")

        await asyncio.sleep(settings.monitor_poll_interval)


def stop_monitor() -> None:
    """Signal the monitor loop to stop on next cycle."""
    global _running
    _running = False
    logger.info("[STOP]  Social-media monitor stopping.")
