"""
Test for Checkpoint 3 — all 7 checks.
Run:  python -X utf8 test_subscriber.py
"""

import asyncio
import inspect
import json
import logging
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s",
    datefmt="%H:%M:%S",
)

from distress_ai.subscriber import _handle_sos, _handle_alert_broadcast, is_on_cooldown
from distress_ai.triage import classify
from distress_ai.models import SOSReport


def _make_report(msg, source="manual", sos_id=1):
    return SOSReport(
        id=sos_id, lat=18.52, lng=73.86, message=msg,
        source=source, metadata={}, created_at="2026-03-08T10:00:00Z",
    )


# ── 3.1  classify() is async def ──

def check_3_1():
    print("=== 3.1  classify() is async def ===")
    assert inspect.iscoroutinefunction(classify), "classify must be async def!"
    print("[PASS]  classify is async def\n")


# ── 3.2  At least 5 severity-1 terms including 'impact' ──

def check_3_2():
    print("=== 3.2  Severity-1 keyword coverage ===")
    sev1_words = ["trapped", "buried", "unconscious", "collapse", "impact",
                  "pinned", "stuck under", "cannot move"]
    results = []
    for word in sev1_words:
        r = asyncio.run(classify(_make_report(f"Person is {word}")))
        ok = r.severity == 1
        results.append(ok)
        print(f"  {'[PASS]' if ok else '[FAIL]'}  '{word}' -> severity {r.severity}")
    assert all(results), "Not all severity-1 keywords matched!"
    print(f"[PASS]  {len(sev1_words)} severity-1 keywords verified (including 'impact')\n")


# ── 3.3  Default returns severity 2, not None ──

def check_3_3():
    print("=== 3.3  Default (no match) returns severity 2 ===")
    r = asyncio.run(classify(_make_report("help me please")))
    assert r.severity == 2, f"Expected 2, got {r.severity}"
    assert r.label == "URGENT \u2014 Medical"
    print(f"[PASS]  'help me please' -> severity={r.severity}  label={r.label}\n")


# ── 3.4  Label strings use em-dash ──

def check_3_4():
    print("=== 3.4  Labels use em-dash (\\u2014) not hyphen ===")
    r1 = asyncio.run(classify(_make_report("trapped")))
    r2 = asyncio.run(classify(_make_report("injured")))
    r3 = asyncio.run(classify(_make_report("need water")))
    assert r1.label == "CRITICAL \u2014 Trapped",  f"Got: {r1.label}"
    assert r2.label == "URGENT \u2014 Medical",    f"Got: {r2.label}"
    assert r3.label == "STANDARD \u2014 Supplies", f"Got: {r3.label}"
    print(f"  sev=1: {r1.label}  colour={r1.colour}")
    print(f"  sev=2: {r2.label}  colour={r2.colour}")
    print(f"  sev=3: {r3.label}  colour={r3.colour}")
    print("[PASS]  All labels match spec with em-dash\n")


# ── 3.5  URL uses event['id'], not hardcoded ──

def check_3_5():
    print("=== 3.5  PATCH URL uses event['id'], not hardcoded 42 ===")
    from distress_ai import routing
    source = inspect.getsource(routing.patch_triage)
    assert "sos_id" in source and "{sos_id}" in source, "URL must use sos_id variable"
    assert '"/api/sos/42' not in source, "URL must NOT hardcode 42"
    print("[PASS]  URL constructed with f-string using sos_id\n")


# ── 3.6  Uses httpx.AsyncClient, not requests ──

def check_3_6():
    print("=== 3.6  Uses httpx.AsyncClient (not requests) ===")
    from distress_ai import routing
    source = inspect.getsource(routing)
    assert "httpx.AsyncClient" in source, "Must use httpx.AsyncClient"
    assert "import requests" not in source, "Must NOT use requests"
    print("[PASS]  httpx.AsyncClient confirmed, no 'requests'\n")


# ── 3.7  SOS handler test (simulates Redis publish) ──

def check_3_7():
    print("=== 3.7  SOS handler processes messages correctly ===")
    loop = asyncio.new_event_loop()
    messages = [
        json.dumps({
            "id": 42, "lat": 18.52, "lng": 73.86,
            "message": "Building collapsed, 3 people trapped",
            "source": "manual", "node_id": None, "metadata": {},
            "created_at": "2026-03-08T10:05:23.412Z",
        }),
        json.dumps({
            "id": 99, "lat": 12.97, "lng": 77.59,
            "message": "AUTO-SOS: Device impact detected",
            "source": "zero-touch", "node_id": None, "metadata": {},
            "created_at": "2026-03-08T10:06:00.000Z",
        }),
        "BAD JSON",
    ]
    for raw in messages:
        _handle_sos(raw, loop)
    loop.close()
    print("[PASS]  All messages handled, no crash\n")


if __name__ == "__main__":
    check_3_1()
    check_3_2()
    check_3_3()
    check_3_4()
    check_3_5()
    check_3_6()
    check_3_7()
    print("=== ALL CHECKPOINT 3 CHECKS PASSED ===")
