# Pasong's "Are We Open?" — App Framework

Minimal, POS-agnostic skeleton. Ships as: a tiny backend poller that writes a status
file, and a static page that reads it. No framework bloat, easy to hand off or kill.

```
pasongs-open-status/
├── app/
│   ├── poller/
│   │   ├── square_poller.py      # polls Square Orders/Labor API, writes status.json
│   │   ├── clover_poller.py      # alt implementation if Clover instead
│   │   └── config.example.env    # POS_PROVIDER, ACCESS_TOKEN, LOCATION_ID, thresholds
│   ├── api/
│   │   └── status.json           # { "open": true, "as_of": "...", "source": "orders_recent" }
│   └── web/
│       ├── index.html            # single page, big OPEN/CLOSED badge + hours fallback
│       ├── style.css
│       └── script.js             # fetches status.json every 60s, renders badge
└── docs/
    ├── RESEARCH.md
    └── OUTREACH_EMAIL.md
```

## Design choices
- **Static frontend, no user data, no login.** Just fetches a public JSON status blob.
- **Poller runs server-side only** (their POS credentials never touch the browser).
  Cheapest hosting: a scheduled Cloudflare Worker / Vercel cron / tiny VPS cron job
  hitting the POS API every few minutes and writing `status.json` to static hosting
  (Cloudflare Pages, Netlify, GitHub Pages — all free tier for this traffic).
- **Status logic (Square example):**
  ```
  recent_order = latest COMPLETED order/payment in last OPEN_WINDOW_MINUTES (e.g. 20)
  clocked_in   = any employee shift open right now (Labor API)
  open = recent_order OR clocked_in
  if poll fails N times in a row -> fall back to posted hours (Locations API) as best guess,
     flagged "estimated from posted hours" in the UI so it's never silently wrong
  ```
- **Single read-only OAuth scope.** No write scope requested, ever. Token stored only
  in the poller's environment, never shipped to the browser bundle.
- **Kill switch:** owner can revoke the OAuth grant from their own POS dashboard at
  any time; page just falls back to posted hours automatically, nothing breaks.

## Domain
`ispasongsopen.com` (already grabbed) is a great literal fit — cheap, on-brand, and
tells you exactly what it does before you click.

## Build order (once POS + OK from owner is confirmed)
1. Stand up static page with hardcoded posted hours (ships value on day one even
   before any API integration).
2. Register read-only OAuth app with the confirmed POS provider.
3. Owner does the one-click consent from their dashboard.
4. Wire poller -> status.json -> live badge.
5. Add "last confirmed X minutes ago" timestamp for transparency/trust.
