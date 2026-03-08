"""
Pydantic data models shared across the AI service.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── SOS Source Enum ─────────────────────────────────────

class SOSSource(str, Enum):
    MANUAL = "manual"
    ZERO_TOUCH = "zero-touch"
    IOT_NODE = "iot_node"
    SONIC_CASCADE = "sonic_cascade"


# ── Inbound: SOS Report from Redis ─────────────────────

class SOSReport(BaseModel):
    """
    Schema of the raw JSON published by Node.js on the 'sos-events'
    channel.  Node.js publishes BEFORE sending the HTTP 201 response.
    """
    id: int
    lat: float
    lng: float
    message: str
    source: SOSSource
    node_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


# ── Triage Result ───────────────────────────────────────

class TriageResult(BaseModel):
    """
    Output of the triage classifier.
    severity : 1 (CRITICAL), 2 (URGENT), or 3 (STANDARD)
    """
    severity: int = Field(ge=1, le=3)
    label: str
    colour: str
    tags: List[str] = Field(default_factory=list)


# ── Outbound: Alert Payload for POST /api/alert/trigger ─

class AlertPayload(BaseModel):
    """
    Payload sent to POST /api/alert/trigger on the Node.js backend.

    type       : 'earthquake' | 'flood' | 'blast' | 'fire' | 'stampede'
    confidence : 0.0–1.0  (must be >= 0.85 to trigger broadcast)
    lat / lng  : epicentre of detected threat
    source     : always 'nlp' from this service
    """
    type: str
    confidence: float = Field(ge=0.0, le=1.0)
    lat: float
    lng: float
    source: str = "nlp"
