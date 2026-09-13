"""
Square poller skeleton — read-only.

Requires only ORDERS_READ (or PAYMENTS_READ) and optionally EMPLOYEES_READ/
TIMECARDS_READ scopes on the OAuth token. Never requests write scopes.

Run on a schedule (cron / Cloudflare Worker / GitHub Action) every 1-5 minutes.
Writes app/api/status.json which the static frontend polls.
"""
import json
import os
import datetime
import urllib.request

SQUARE_ACCESS_TOKEN = os.environ["SQUARE_ACCESS_TOKEN"]  # read-only scoped token
LOCATION_ID = os.environ["SQUARE_LOCATION_ID"]
OPEN_WINDOW_MINUTES = int(os.environ.get("OPEN_WINDOW_MINUTES", "20"))
STATUS_PATH = os.environ.get("STATUS_PATH", "app/api/status.json")
SQUARE_API_BASE = "https://connect.squareup.com/v2"


def _get(path, body=None):
    req = urllib.request.Request(
        f"{SQUARE_API_BASE}{path}",
        data=json.dumps(body).encode() if body else None,
        headers={
            "Authorization": f"Bearer {SQUARE_ACCESS_TOKEN}",
            "Content-Type": "application/json",
            "Square-Version": "2024-01-18",
        },
        method="POST" if body else "GET",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.load(resp)


def recent_completed_order_exists():
    """Search orders at this location updated within the open window."""
    since = (datetime.datetime.utcnow() - datetime.timedelta(minutes=OPEN_WINDOW_MINUTES))
    since_iso = since.strftime("%Y-%m-%dT%H:%M:%S+00:00")
    body = {
        "location_ids": [LOCATION_ID],
        "query": {
            "filter": {
                "date_time_filter": {
                    "updated_at": {"start_at": since_iso}
                },
                "state_filter": {"states": ["COMPLETED", "OPEN"]},
            },
            "sort": {"sort_field": "UPDATED_AT", "sort_order": "DESC"},
        },
        "limit": 1,
    }
    data = _get("/orders/search", body)
    return bool(data.get("orders"))


def any_employee_clocked_in():
    """Optional stronger signal: is anyone on a currently-open shift?"""
    body = {
        "query": {
            "filter": {
                "location_ids": [LOCATION_ID],
                "status": "OPEN",
            }
        },
        "limit": 1,
    }
    data = _get("/labor/shifts/search", body)
    return bool(data.get("shifts"))


def write_status(open_now: bool, source: str):
    payload = {
        "open": open_now,
        "as_of": datetime.datetime.utcnow().isoformat() + "Z",
        "source": source,
    }
    with open(STATUS_PATH, "w") as f:
        json.dump(payload, f, indent=2)


def main():
    try:
        clocked_in = any_employee_clocked_in()
        recent_order = recent_completed_order_exists()
        is_open = clocked_in or recent_order
        source = "labor_shift" if clocked_in else ("recent_order" if recent_order else "no_activity")
        write_status(is_open, source)
    except Exception as exc:  # noqa: BLE001 - fall back safely, never crash silently
        print(f"poller error, falling back to posted hours: {exc}")
        write_status(False, "posted_hours_fallback")


if __name__ == "__main__":
    main()
