"""
NLP Triage Classifier — maps raw citizen messages to severity 1, 2, or 3.

Must complete classification within 500 ms so the dashboard can flip
the SOS marker from grey (new) to coloured (triaged).

Severity mapping:
  1  CRITICAL — Trapped   #FF0000   (trapped, buried, unconscious, collapse, impact, pinned, stuck under, cannot move)
  2  URGENT — Medical     #FF8800   (injured, bleeding, medical, ambulance, broken, hurt, wound, accident)
  3  STANDARD — Supplies  #FFFF00   (food, water, shelter, supplies, stranded)
  default → 2 (URGENT) as safe fallback
"""

from __future__ import annotations

from typing import List, Tuple

from distress_ai.models import SOSReport, TriageResult

# ── Keyword tiers  (checked top-down, first match wins) ─

_SEVERITY_KEYWORDS: List[Tuple[int, List[str]]] = [
    (1, [
        "trapped", "buried", "unconscious", "collapse",
        "impact", "pinned", "stuck under", "cannot move",
    ]),
    (2, [
        "injured", "bleeding", "medical", "ambulance",
        "broken", "hurt", "wound", "accident",
    ]),
    (3, [
        "food", "water", "shelter", "supplies", "stranded",
    ]),
]

# ── Severity → label + colour  (em-dash \u2014, not hyphen) ──

_SEVERITY_MAP = {
    1: ("CRITICAL \u2014 Trapped",  "#FF0000"),
    2: ("URGENT \u2014 Medical",    "#FF8800"),
    3: ("STANDARD \u2014 Supplies", "#FFFF00"),
}

_DEFAULT_SEVERITY = 2


# ── Public API ──────────────────────────────────────────

async def classify(report: SOSReport) -> TriageResult:
    """
    Classify an SOS report by scanning ``report.message`` for keywords.

    Returns a ``TriageResult`` with integer severity (1/2/3),
    human-readable label, hex colour, and matched tags.

    If no keywords match, defaults to severity 2 (URGENT).
    """
    text = report.message.lower()
    matched_tags: List[str] = []
    severity = _DEFAULT_SEVERITY

    for sev, keywords in _SEVERITY_KEYWORDS:
        hits = [kw for kw in keywords if kw in text]
        if hits:
            severity = sev
            matched_tags = hits
            break                       # first tier wins

    label, colour = _SEVERITY_MAP[severity]

    return TriageResult(
        severity=severity,
        label=label,
        colour=colour,
        tags=matched_tags,
    )
