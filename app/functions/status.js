// Cloudflare Pages Function: GET /api/status
// Single read-only endpoint. Reads the flat status file the poller writes —
// never talks to the POS API directly (that's the poller's job, on its own
// schedule). Cheap, cacheable, safe to hammer.

export async function onRequestGet(context) {
  // In production, STATUS_KV is a Cloudflare KV namespace the poller writes to.
  // Falls back to a bundled static file for local/dev preview.
  let status;
  try {
    const raw = await context.env.STATUS_KV.get("status");
    status = raw ? JSON.parse(raw) : null;
  } catch {
    status = null;
  }

  if (!status) {
    status = {
      open: false,
      as_of: new Date(0).toISOString(),
      source: "posted_hours_fallback",
    };
  }

  return new Response(JSON.stringify(status), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      "Access-Control-Allow-Origin": "*", // widget can be embedded cross-origin
    },
  });
}
