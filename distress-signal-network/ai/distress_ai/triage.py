"""
Rule-based triage classifier for SOS reports.

Scores messages by urgency signals (keywords, punctuation, capitalization)
and maps them to a severity level with a confidence score.
"""

from __future__ import annotations

import re
from typing import Dict, List, Set, Tuple

from distress_ai.models import SOSReport, Severity, TriageResult

# ── Keyword dictionaries (lowercase) ────────────────────

_CRITICAL_KEYWORDS: Set[str] = {
    "bomb", "explosion", "shooting", "gunfire", "hostage", "kidnap",
    "active shooter", "terrorist", "massacre", "mass casualty",
    "chemical attack", "biological attack", "nuclear",
}

_HIGH_KEYWORDS: Set[str] = {
    "fire", "trapped", "bleeding", "stabbed", "drowning", "collapsed",
    "earthquake", "flood", "tsunami", "tornado", "hurricane",
    "heart attack", "not breathing", "unconscious", "dying",
    "assault", "robbery", "weapon", "knife", "gun",
    "help", "help me", "save me", "please help", "emergency",
}

_MEDIUM_KEYWORDS: Set[str] = {
    "accident", "crash", "injured", "broken", "pain", "fell",
    "suspicious", "theft", "stolen", "missing", "lost child",
    "power outage", "gas leak", "smoke", "sirens",
    "need help", "urgent", "danger",
}

_LOW_KEYWORDS: Set[str] = {
    "noise complaint", "stray animal", "pothole", "graffiti",
    "litter", "parking", "traffic", "minor", "non-emergency",
}

# Mapping each keyword set to its (severity,  base_score)
_KEYWORD_TIERS: List[Tuple[Set[str], Severity, float]] = [
    (_CRITICAL_KEYWORDS, Severity.CRITICAL, 0.95),
    (_HIGH_KEYWORDS,     Severity.HIGH,     0.80),
    (_MEDIUM_KEYWORDS,   Severity.MEDIUM,   0.60),
    (_LOW_KEYWORDS,      Severity.LOW,      0.40),
]


# ── Helper scoring functions ────────────────────────────

def _keyword_score(text: str) -> Tuple[Severity, float, List[str]]:
    """Return the highest-matching severity, its base confidence, and matched tags."""
    lower = text.lower()
    for keywords, severity, base_score in _KEYWORD_TIERS:
        matched = [kw for kw in keywords if kw in lower]
        if matched:
            boost = min(len(matched) - 1, 3) * 0.02
            return severity, min(base_score + boost, 1.0), matched
    return Severity.LOW, 0.30, []


def _urgency_modifiers(text: str) -> Dict[str, float]:
    """Heuristic modifiers based on writing style."""
    mods: Dict[str, float] = {}

    alpha_chars = [c for c in text if c.isalpha()]
    if alpha_chars:
        caps_ratio = sum(1 for c in alpha_chars if c.isupper()) / len(alpha_chars)
        if caps_ratio > 0.6:
            mods["ALL_CAPS"] = 0.05

    excl_count = text.count("!")
    if excl_count >= 3:
        mods["EXCLAMATIONS"] = 0.03

    words = text.lower().split()
    if len(words) >= 3:
        repeats = sum(1 for a, b in zip(words, words[1:]) if a == b)
        if repeats >= 2:
            mods["REPETITION"] = 0.04

    if 0 < len(text.strip()) < 30:
        mods["SHORT_URGENT"] = 0.02

    return mods


def _maybe_escalate(severity: Severity, confidence: float) -> Severity:
    """Escalate severity by one level if confidence is very high."""
    order = [Severity.LOW, Severity.MEDIUM, Severity.HIGH, Severity.CRITICAL]
    idx = order.index(severity)
    if confidence >= 0.92 and idx < len(order) - 1:
        return order[idx + 1]
    return severity


# ── Public API ──────────────────────────────────────────

def classify(report: SOSReport) -> TriageResult:
    """
    Run the triage classifier on an SOS report.

    Returns a TriageResult with severity, confidence, matched tags,
    and a human-readable reasoning string.
    """
    text = report.message

    severity, confidence, tags = _keyword_score(text)
    mods = _urgency_modifiers(text)
    for label, delta in mods.items():
        confidence = min(confidence + delta, 1.0)
        tags.append(label)

    severity = _maybe_escalate(severity, confidence)

    reasoning_parts = [f"Matched keywords: {', '.join(tags) if tags else 'none'}"]
    if mods:
        reasoning_parts.append(f"Urgency signals: {', '.join(mods.keys())}")
    reasoning_parts.append(f"Final severity: {severity.value} ({confidence:.0%} confidence)")

    return TriageResult(
        severity=severity,
        confidence=round(confidence, 4),
        tags=tags,
        reasoning=" | ".join(reasoning_parts),
    )
