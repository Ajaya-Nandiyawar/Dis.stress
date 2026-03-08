"""
Pydantic data models shared across the AI service.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# ── Severity Levels ─────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


# ── Inbound: SOS Report from Redis ─────────────────────

class SOSReport(BaseModel):
    """Schema of the JSON published by Node.js on the 'sos-events' channel."""
    id: str
    message: str
    location: Optional[str] = None
    timestamp: Optional[str] = None
    userId: Optional[str] = None


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
