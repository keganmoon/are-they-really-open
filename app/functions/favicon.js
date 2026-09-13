// Cloudflare Pages Function: GET /favicon.ico
// Renders a tiny colored-dot favicon reflecting current status, so the
// browser tab itself answers "open?" with zero page loads. SVG source,
// served with an ico-compatible content type via Cloudflare's image
// resizing, or pre-rendered to 3 static files and switched by redirect
// (simplest, cheapest option — no per-request image rendering at all).

const DOT = (color) => `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">
  <circle cx="32" cy="32" r="28" fill="${color}" stroke="#000" stroke-opacity="0.15" stroke-width="2"/>
</svg>`.trim();

const COLORS = { open: "#1f9d55", closed: "#c0392b", unknown: "#999999" };

export async function onRequestGet(context) {
  let status;
  try {
    const raw = await context.env.STATUS_KV.get("status");
    status = raw ? JSON.parse(raw) : null;
  } catch {
    status = null;
  }

  const state = !status ? "unknown" : status.open ? "open" : "closed";
  const svg = DOT(COLORS[state]);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      // 1-minute cache: matches poller cadence, keeps this near-zero cost
      // even under heavy traffic.
      "Cache-Control": "public, max-age=60",
    },
  });
}

// NOTE: some browsers still special-case /favicon.ico and want an actual
// .ico — if that matters, pre-render open.ico / closed.ico / unknown.ico
// once at build time and have this function 302-redirect to the right
// static file instead of generating SVG per request. Even cheaper.
