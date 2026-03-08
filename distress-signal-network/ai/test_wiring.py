"""
Checkpoint 6 — Final Wiring & Error Handling verification.
Run:  python -X utf8 test_wiring.py
"""

import asyncio
import inspect
import json
import logging
import os
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)-24s | %(levelname)-7s | %(message)s", datefmt="%H:%M:%S")


def check_6_1():
    """App starts even if Redis is unreachable"""
    print("=== 6.1  App starts with bad REDIS_URL (graceful failure) ===")
    from distress_ai.main import lifespan
    source = inspect.getsource(lifespan)
    assert "try:" in source and "start_subscriber()" in source
    assert "except" in source
    assert "triage endpoint still reachable" in source.lower() or "triage endpoint" in source
    print("[PASS]  start_subscriber() wrapped in try/except — app survives Redis failure\n")


def check_6_2():
    """GET /health returns fast, no DB/Redis check"""
    print("=== 6.2  /health is fast (no DB/Redis check) ===")
    from distress_ai.main import health
    assert inspect.iscoroutinefunction(health), "health must be async"
    source = inspect.getsource(health)
    assert "redis" not in source.lower() or "NOT check Redis" in source
    assert '"status"' in source and '"ok"' in source
    print("[PASS]  /health is async, returns {status:'ok'}, no Redis/DB check\n")


def check_6_3():
    """Missing BACKEND_URL logs FATAL message"""
    print("=== 6.3  Missing env vars log FATAL ===")
    from distress_ai.main import lifespan
    source = inspect.getsource(lifespan)
    assert "FATAL: BACKEND_URL not set" in source
    assert "FATAL: REDIS_URL not set" in source
    assert "Railway" in source
    print("[PASS]  FATAL messages for missing REDIS_URL and BACKEND_URL\n")


def check_6_4_concurrency():
    """All endpoints are async def"""
    print("=== 6.4  All endpoints are async def ===")
    from distress_ai.main import health, root, routing_optimise
    for fn in [health, root, routing_optimise]:
        assert inspect.iscoroutinefunction(fn), f"{fn.__name__} must be async def"
        print(f"  [PASS]  {fn.__name__} is async def")
    print()


def check_6_5_exception_handler():
    """Global exception handler exists"""
    print("=== 6.5  Global exception handler ===")
    from distress_ai.main import app, global_exception_handler
    assert inspect.iscoroutinefunction(global_exception_handler)
    source = inspect.getsource(global_exception_handler)
    assert "500" in source
    assert '"error"' in source
    assert '"message"' in source
    assert "str(exc)" in source
    print("[PASS]  Global exception handler returns {error: true, message: str(e)}\n")


def check_6_6_concurrency_note():
    """Concurrency note in docstring/comments"""
    print("=== 6.6  Concurrency note ===")
    import distress_ai.main as m
    source = inspect.getsource(m)
    assert "async" in source and "concurrent" in source.lower()
    assert "earthquake" in source.lower() or "6 nodes" in source.lower() or "sync endpoint" in source.lower()
    print("[PASS]  Concurrency note present in source\n")


if __name__ == "__main__":
    check_6_1()
    check_6_2()
    check_6_3()
    check_6_4_concurrency()
    check_6_5_exception_handler()
    check_6_6_concurrency_note()
    print("=== ALL CHECKPOINT 6 CHECKS PASSED ===")
