"""Match a device GPS fix to a demo store. Pure functions, no I/O.

The fix comes from the browser's Geolocation API. A store matches when the fix
is within MATCH_RADIUS_M of its coordinates, forgiving part of the fix's own
error; when two stores qualify the nearer one wins. A fix too coarse to tell
stores apart (Wi-Fi or IP based, hundreds of metres) never matches.
"""

from __future__ import annotations

import math
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal

EARTH_RADIUS_M = 6_371_000

MATCH_RADIUS_M = 75  # fix-to-store distance that still counts as "in the store"
ACCURACY_SLACK_MAX_M = 50  # most of the fix's own error we forgive on top of that
MAX_USABLE_ACCURACY_M = 200  # a worse fix cannot place you in one particular store


@dataclass(frozen=True)
class Detection:
    status: Literal["matched", "no_match", "low_accuracy"]
    merchant_id: str | None = None
    distance_m: int | None = None


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((phi2 - phi1) / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def detect_store(
    lat: float,
    lng: float,
    accuracy_m: float | None,
    stores: Mapping[str, tuple[float, float]],
) -> Detection:
    """Return the store (by id) the fix is in, if any.

    `accuracy_m` is the Geolocation API's horizontal accuracy radius; None means
    the client did not report one, which is treated as an exact fix.
    """
    if accuracy_m is not None and accuracy_m > MAX_USABLE_ACCURACY_M:
        return Detection("low_accuracy")

    nearest_id: str | None = None
    nearest_m = math.inf
    for store_id, (store_lat, store_lng) in stores.items():
        d = haversine_m(lat, lng, store_lat, store_lng)
        if d < nearest_m:
            nearest_id, nearest_m = store_id, d

    reach = MATCH_RADIUS_M + min(accuracy_m or 0.0, ACCURACY_SLACK_MAX_M)
    if nearest_id is None or nearest_m > reach:
        return Detection("no_match")
    return Detection("matched", nearest_id, round(nearest_m))
