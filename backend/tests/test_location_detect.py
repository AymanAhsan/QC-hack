import pytest
from fastapi.testclient import TestClient

from data import IN_STORE_LOCATION_IDS, LOCATION_COORDS
from location_detect import (
    ACCURACY_SLACK_MAX_M,
    MATCH_RADIUS_M,
    MAX_USABLE_ACCURACY_M,
    detect_store,
    haversine_m,
)
from main import app

client = TestClient(app)

TJ = LOCATION_COORDS["trader-joes"]
M_PER_DEG_LAT = 111_195


def north_of(point: tuple[float, float], metres: float) -> tuple[float, float]:
    return point[0] + metres / M_PER_DEG_LAT, point[1]


def test_every_in_store_location_has_coordinates():
    assert set(LOCATION_COORDS) == set(IN_STORE_LOCATION_IDS)


def test_haversine_known_distance():
    # One degree of latitude is about 111.2 km everywhere.
    assert haversine_m(40.0, -73.0, 41.0, -73.0) == pytest.approx(M_PER_DEG_LAT, rel=0.001)
    assert haversine_m(*TJ, *TJ) == 0


@pytest.mark.parametrize("store_id", IN_STORE_LOCATION_IDS)
def test_fix_at_each_store_matches_that_store(store_id):
    lat, lng = LOCATION_COORDS[store_id]
    result = detect_store(lat, lng, 10, LOCATION_COORDS)
    assert (result.status, result.merchant_id, result.distance_m) == ("matched", store_id, 0)


def test_fix_inside_radius_reports_measured_distance():
    lat, lng = north_of(TJ, 40)
    result = detect_store(lat, lng, 5, LOCATION_COORDS)
    assert result.status == "matched" and result.merchant_id == "trader-joes"
    assert result.distance_m == pytest.approx(40, abs=1)


def test_fix_outside_radius_is_no_match():
    lat, lng = north_of(TJ, MATCH_RADIUS_M + 25)
    result = detect_store(lat, lng, 5, LOCATION_COORDS)
    assert result.status == "no_match" and result.merchant_id is None


def test_accuracy_widens_the_radius_up_to_a_cap():
    lat, lng = north_of(TJ, MATCH_RADIUS_M + 30)
    assert detect_store(lat, lng, 0, LOCATION_COORDS).status == "no_match"
    assert detect_store(lat, lng, 30, LOCATION_COORDS).status == "matched"

    # A 150 m-accurate fix forgives only ACCURACY_SLACK_MAX_M, not its full error.
    lat, lng = north_of(TJ, MATCH_RADIUS_M + ACCURACY_SLACK_MAX_M + 15)
    assert detect_store(lat, lng, 150, LOCATION_COORDS).status == "no_match"


def test_missing_accuracy_is_treated_as_exact():
    lat, lng = north_of(TJ, 10)
    assert detect_store(lat, lng, None, LOCATION_COORDS).status == "matched"
    lat, lng = north_of(TJ, MATCH_RADIUS_M + 5)
    assert detect_store(lat, lng, None, LOCATION_COORDS).status == "no_match"


def test_coarse_fix_never_matches_even_on_top_of_a_store():
    result = detect_store(*TJ, MAX_USABLE_ACCURACY_M + 1, LOCATION_COORDS)
    assert result.status == "low_accuracy" and result.merchant_id is None
    assert detect_store(*TJ, MAX_USABLE_ACCURACY_M, LOCATION_COORDS).status == "matched"


def test_nearest_store_wins_when_two_are_in_range():
    # Whole Foods and Chipotle are ~100 m apart in Union Square.
    wf, chipotle = LOCATION_COORDS["whole-foods"], LOCATION_COORDS["chipotle"]
    assert haversine_m(*wf, *chipotle) < 2 * MATCH_RADIUS_M

    near_chipotle = (wf[0] + 0.75 * (chipotle[0] - wf[0]), wf[1] + 0.75 * (chipotle[1] - wf[1]))
    assert detect_store(*near_chipotle, 10, LOCATION_COORDS).merchant_id == "chipotle"
    near_wf = (wf[0] + 0.25 * (chipotle[0] - wf[0]), wf[1] + 0.25 * (chipotle[1] - wf[1]))
    assert detect_store(*near_wf, 10, LOCATION_COORDS).merchant_id == "whole-foods"


def test_no_stores_is_no_match():
    assert detect_store(*TJ, 5, {}).status == "no_match"


# --------------------------------------------------------------------------- API


def test_detect_endpoint_matches_a_store_and_it_feeds_recommend():
    r = client.post("/api/locations/detect", json={"lat": TJ[0], "lng": TJ[1], "accuracy_m": 12})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "matched" and body["is_demo_data"] is True
    loc = body["location"]
    assert loc["id"] == "trader-joes" and loc["distance_m"] == 0
    assert loc["merchant"]["name"] == "Trader Joe's" and loc["address"].startswith("142 E 14th")

    rec = client.get("/api/recommend", params={"merchant_id": loc["id"]}).json()
    assert rec["winner_card_id"] == "amex-gold"


def test_detect_endpoint_accuracy_is_optional():
    r = client.post("/api/locations/detect", json={"lat": TJ[0], "lng": TJ[1]})
    assert r.status_code == 200 and r.json()["status"] == "matched"


def test_detect_endpoint_no_match_and_low_accuracy():
    r = client.post("/api/locations/detect", json={"lat": 0.0, "lng": 0.0, "accuracy_m": 10})
    assert r.status_code == 200
    assert r.json() == {"status": "no_match", "location": None, "is_demo_data": True}

    r = client.post("/api/locations/detect", json={"lat": TJ[0], "lng": TJ[1], "accuracy_m": 900})
    assert r.json()["status"] == "low_accuracy" and r.json()["location"] is None


@pytest.mark.parametrize(
    "payload",
    [
        {"lat": 91, "lng": 0},
        {"lat": 0, "lng": -181},
        {"lat": 40.7},
        {"lat": 40.7, "lng": -73.9, "accuracy_m": -1},
        {"lat": 40.7, "lng": -73.9, "merchant_id": "costco"},
        {"lat": "north", "lng": -73.9},
    ],
)
def test_detect_endpoint_rejects_bad_input(payload):
    r = client.post("/api/locations/detect", json=payload)
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


def test_detect_endpoint_rejects_non_finite_numbers():
    r = client.post(
        "/api/locations/detect",
        content='{"lat": NaN, "lng": -73.9}',
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 422
