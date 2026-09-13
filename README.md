# Are We Open?

A tiny, POS-agnostic "is this restaurant open right now?" status page — designed so
**almost nobody ever has to load the page**.

The answer shows up in the browser tab (favicon dot), in the link preview when the
URL is shared in iMessage/Slack/Discord/Facebook, and as an embeddable badge on any
other site. Loading the actual page is the fallback, not the point.

## Why

Restaurant hours lie. Posted hours say 9pm; the kitchen closed at 8:15 because it was
dead. This reads the **point-of-sale system** instead: if orders are still being rung
up, the place is open. No staff action required, nothing to remember to update.

## How it works

```
Square/Clover/Toast API
        │  (poller — the ONLY thing that talks to the POS)
        ▼
   status.json          { "open": true, "as_of": "...", "source": "recent_order" }
        │
        ├── /api/status   tiny JSON, edge-cached
        ├── /favicon.ico  green or red dot, answers from the tab
        ├── /og.png       link-preview card, answers before anyone taps
        └── /            static page (the fallback)
```

A background poller hits the POS every 1–5 minutes and writes a flat `status.json`.
Everything else reads that file. Per-request POS calls never happen, so API rate
limits are a non-issue no matter how much traffic the page gets.

`Cache-Control: public, max-age=60, stale-while-revalidate=120` means the edge serves
nearly every request without origin compute.

### "Open" is inferred, not scheduled

| Source | Meaning |
|---|---|
| `recent_order` | An order was rung up within `OPEN_WINDOW_MINUTES`. Definitive. |
| `schedule` | No recent orders; falls back to posted business hours. |
| `manual` | Explicit override. |

## Layout

```
app/
├── poller/square_poller.py   # polls POS, writes status.json
├── functions/                # Cloudflare Pages Functions (edge)
│   ├── status.js             # GET /api/status
│   ├── favicon.js            # GET /favicon.ico  — green/red dot
│   └── og.js                 # GET /og.png       — link-preview card
├── widget/widget.js          # embeddable <script> badge
├── web/                      # static shell
└── api/status.json           # what the poller writes
docs/
├── ARCHITECTURE_V2.md        # the near-zero-traffic design
├── FRAMEWORK.md              # POS-agnostic skeleton
└── RESEARCH.md               # POS API notes
```

## Setup

```bash
cp app/poller/config.example.env app/poller/config.env
# fill in SQUARE_ACCESS_TOKEN (read-only!) and SQUARE_LOCATION_ID
python3 app/poller/square_poller.py
```

| Variable | Meaning |
|---|---|
| `POS_PROVIDER` | `square` (Clover/Toast are the extension points) |
| `SQUARE_ACCESS_TOKEN` | **Read-only** OAuth token. It only needs to list orders. |
| `SQUARE_LOCATION_ID` | Which location to watch |
| `OPEN_WINDOW_MINUTES` | Minutes since the last order before considered closed (default 20) |
| `STATUS_PATH` | Where to write the status file |

Deploy `app/` to Cloudflare Pages; run the poller anywhere with cron or a systemd
timer.

## Adding another POS

Write a module that produces the same `status.json` shape. Nothing downstream knows
or cares which POS produced it — that is the whole design.

## Security

The POS token lives only where the poller runs, never in the frontend or the edge
functions. Use a **read-only** token scoped to order listing. The public API exposes
one boolean and a timestamp; no order data, no customer data, no revenue figures.

## License

MIT — see [LICENSE](LICENSE).
