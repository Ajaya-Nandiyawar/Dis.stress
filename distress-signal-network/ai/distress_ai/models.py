"""
Pydantic data models shared across the AI service.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Severity Levels ─────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


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

    The ``message`` field is the raw citizen text that the NLP
    classifier runs on.  ``id`` is the PostgreSQL PK required in the
    PATCH callback URL.
    """
    id: int                                          # PG primary key
    lat: float                                       # latitude
    lng: float                                       # longitude
    message: str                                     # raw citizen text → NLP input
    source: SOSSource                                # origin of the report
    node_id: Optional[str] = None                    # only when source == 'iot_node'
    metadata: Dict[str, Any] = Field(default_factory=dict)  # free JSON
    created_at: str                                  # ISO 8601 timestamp


# ── Triage Result ───────────────────────────────────────

class TriageResult(BaseModel):
    """Output of the triage classifier."""
    severity: Severity
    confidence: float = Field(ge=0.0, le=1.0)
    tags: List[str] = Field(default_factory=list)
    reasoning: str = ""


# ── Outbound: Alert Payload for POST /api/alert/trigger ─

class AlertPayload(BaseModel):
    """Payload sent to Node.js when the social-media monitor detects a threat."""
    source: str
    threat_type: str
    description: str
    confidence: float = Field(ge=0.0, le=1.0)
    detected_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    raw_text: Optional[str] = None
    location: Optional[str] = None
