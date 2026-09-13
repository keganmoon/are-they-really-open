# Architecture v2 — optimized for near-zero traffic

Goal: almost nobody ever needs to actually load the page. The answer should be
visible from the tab title/favicon before it renders, and from the link preview
before anyone even taps it (iMessage/Slack/Discord/Facebook unfurl).

## Pieces

```
pasongs-open-status/
├── app/
│   ├── poller/square_poller.py     # unchanged — writes status.json every 1-5 min
│   ├── functions/                  # Cloudflare Pages Functions (edge, cheap, cached)
│   │   ├── status.js               # GET /api/status  -> tiny JSON, the one API
│   │   ├── favicon.js              # GET /favicon.ico  -> green/red dot SVG->ICO
│   │   └── og.js                   # GET /og.png       -> link-preview card image
│   ├── widget/
│   │   └── widget.js               # embeddable <script> badge for other sites
│   └── web/
│       ├── index.html              # static shell, meta tags point at /og.png
│       ├── style.css
│       └── script.js
└── docs/
```

## 1. The API — `GET /api/status`
One endpoint, one job. Reads the flat `status.json` the poller already writes
(no per-request POS calls — the poller is the only thing that ever talks to
Square/Clover/Toast). Served straight from Cloudflare's edge cache.

```json
{ "open": true, "as_of": "2026-09-12T18:04:00Z", "source": "recent_order" }
```

`Cache-Control: public, max-age=60, stale-while-revalidate=120` — browsers/bots
that hit it get a cached edge response almost every time; origin compute only
happens once a minute at most, regardless of visitor count.

## 2. Favicon that answers the question in the tab
`favicon.js` reads the same status and returns a tiny SVG (green dot = open,
red dot = closed, grey = unknown) converted to ICO, cached same as above. The
`<link rel="icon">` in `index.html` points at `/favicon.ico?v=` + a short
cache-busting minute-bucket so browser tab bars refresh without polling.
Anyone with the tab open (or pinned) sees status at a glance, zero clicks,
zero page loads beyond the favicon byte.

## 3. Link preview (OG image) that answers it before anyone taps
`og.js` renders a full-bleed card: big "OPEN" (green) or "CLOSED" (red) plus
"Pasong's Café" and the last-confirmed time, as a PNG. `index.html`'s
`<meta property="og:image">` and `twitter:image` point at `/og.png`. Every
messaging app that unfurls links (iMessage, Slack, Discord, FB, iOS Safari
share sheet) renders this automatically — the person sees OPEN/CLOSED in the
preview card and often never opens the link at all. Cached the same short
window as status, so it doesn't regenerate per-share.

## 4. Embeddable widget (for their FB page / Google Business link / etc.)
```html
<script src="https://ispasongsopen.com/widget.js" data-pasongs-badge></script>
```
Renders a small inline badge wherever it's dropped, fetching `/api/status`
once and caching in-memory for its own polling interval — no iframe, tiny
payload (~1KB script), no other assets pulled unless someone actually views
that page.

## 5. Traffic math
- Poller -> POS API: 1 call/minute, regardless of visitor count (this is the
  only thing that ever touches Square/Clover credentials).
- Everything human/bot-facing (page, favicon, og image, widget, API) reads a
  cached, edge-served artifact that's at most 60-120s stale. A viral spike in
  visitors costs Cloudflare's edge cache, not your origin or the POS API.
- Most real usage never even completes a page load — favicon + link preview
  answer the only question people have.
