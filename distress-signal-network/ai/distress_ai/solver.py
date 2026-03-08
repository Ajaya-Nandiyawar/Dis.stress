"""
OR-Tools TSP solver with greedy nearest-neighbour fallback.

Builds a Haversine distance matrix from depot + waypoints and returns
an optimised route ordering within a HARD 3-second time limit.
"""

from __future__ import annotations

import math
import time
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("distress.solver")

# ── Severity → label / colour  (shared with triage) ────

_SEVERITY_MAP: Dict[int, Tuple[str, str]] = {
    1: ("CRITICAL \u2014 Trapped",  "#FF0000"),
    2: ("URGENT \u2014 Medical",    "#FF8800"),
    3: ("STANDARD \u2014 Supplies", "#FFFF00"),
}

MAX_WAYPOINTS = 15
SOLVER_TIME_LIMIT_S = 3


# ── Haversine ───────────────────────────────────────────

def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> int:
    """Great-circle distance in metres between two points."""
    R = 6_371_000  # earth radius in metres
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlng / 2) ** 2)
    return int(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def _build_distance_matrix(
    points: List[Dict[str, float]],
) -> List[List[int]]:
    """
    Build a full NxN distance matrix (metres) from a list of
    {lat, lng} dicts.  Index 0 = depot.
    """
    n = len(points)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1, n):
            d = _haversine_m(
                points[i]["lat"], points[i]["lng"],
                points[j]["lat"], points[j]["lng"],
            )
            matrix[i][j] = d
            matrix[j][i] = d
    return matrix


# ── OR-Tools TSP solver ────────────────────────────────

def _solve_ortools(matrix: List[List[int]]) -> Optional[List[int]]:
    """
    Solve TSP with OR-Tools.  Returns ordered list of node indices
    (starting & ending at depot 0), or None if no solution in time.
    """
    try:
        from ortools.constraint_solver import routing_enums_pb2, pywrapcp
    except ImportError:
        logger.warning("[WARN]  ortools not installed — falling back to greedy")
        return None

    n = len(matrix)
    manager = pywrapcp.RoutingIndexManager(n, 1, 0)  # 1 vehicle, depot=0
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_idx, to_idx):
        from_node = manager.IndexToNode(from_idx)
        to_node = manager.IndexToNode(to_idx)
        return matrix[from_node][to_node]

    transit_id = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_id)

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    params.time_limit.seconds = SOLVER_TIME_LIMIT_S

    solution = routing.SolveWithParameters(params)

    if solution is None:
        return None

    # Extract ordered node indices
    route: List[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        route.append(manager.IndexToNode(index))
        index = solution.Value(routing.NextVar(index))
    return route


# ── Greedy nearest-neighbour fallback ───────────────────

def _solve_greedy(matrix: List[List[int]]) -> List[int]:
    """Nearest-neighbour greedy TSP starting from depot (index 0)."""
    n = len(matrix)
    visited = [False] * n
    route = [0]
    visited[0] = True

    for _ in range(n - 1):
        current = route[-1]
        best_next = -1
        best_dist = float("inf")
        for j in range(n):
            if not visited[j] and matrix[current][j] < best_dist:
                best_dist = matrix[current][j]
                best_next = j
        if best_next == -1:
            break
        route.append(best_next)
        visited[best_next] = True

    return route


# ── Public API ──────────────────────────────────────────

def optimise_route(
    depot: Dict[str, Any],
    waypoints: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Compute optimised route through waypoints starting from depot.

    Returns the full response dict matching the Node.js API spec.
    """
    # Build point list: index 0 = depot, 1..n = waypoints
    points = [{"lat": depot["lat"], "lng": depot["lng"]}]
    for wp in waypoints:
        points.append({"lat": wp["lat"], "lng": wp["lng"]})

    matrix = _build_distance_matrix(points)

    # Try OR-Tools first
    t0 = time.perf_counter()
    or_route = _solve_ortools(matrix)
    elapsed = time.perf_counter() - t0

    if or_route is not None:
        solver_used = "or-tools"
        ordered_indices = or_route
        logger.info("[OR-TOOLS]  Solved %d nodes in %.0fms", len(points), elapsed * 1000)
    else:
        solver_used = "greedy-fallback"
        ordered_indices = _solve_greedy(matrix)
        logger.warning("[GREEDY]  Fallback used for %d nodes", len(points))

    # Build response route (skip depot at index 0, only waypoints)
    route_stops: List[Dict[str, Any]] = []
    total_distance = 0
    prev_idx = 0  # start from depot

    stop_num = 0
    for node_idx in ordered_indices:
        if node_idx == 0:
            continue  # skip depot in output

        stop_num += 1
        wp = waypoints[node_idx - 1]  # offset by 1 (depot is 0)

        # Stop 1 = 0 distance (departure from depot)
        # Subsequent stops = distance from previous waypoint
        dist_from_prev = 0 if stop_num == 1 else matrix[prev_idx][node_idx]
        total_distance += dist_from_prev

        sev = wp.get("severity", 2)
        label, colour = _SEVERITY_MAP.get(sev, _SEVERITY_MAP[2])

        route_stops.append({
            "stop": stop_num,
            "id": wp["id"],
            "lat": wp["lat"],
            "lng": wp["lng"],
            "severity": sev,
            "label": label,
            "colour": colour,
            "distance_from_prev_m": dist_from_prev,
        })
        prev_idx = node_idx

    return {
        "route": route_stops,
        "depot": {
            "ambulance_id": depot.get("ambulance_id"),
            "lat": depot["lat"],
            "lng": depot["lng"],
        },
        "stops": len(route_stops),
        "total_distance_m": total_distance,
        "solver": solver_used,
        "computed_at": datetime.now(timezone.utc).isoformat(),
    }
