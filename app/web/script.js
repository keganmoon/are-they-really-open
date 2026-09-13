// Polls the static status.json (written server-side by the poller) and
// renders a big OPEN/CLOSED badge. No POS credentials ever touch this file.

const STATUS_URL = "/api/status.json";
const POLL_MS = 60_000;

async function refresh() {
  const badge = document.getElementById("badge");
  const detail = document.getElementById("detail");
  try {
    const res = await fetch(`${STATUS_URL}?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();

    badge.className = "badge " + (data.open ? "open" : "closed");
    badge.textContent = data.open ? "OPEN" : "CLOSED";

    const asOf = new Date(data.as_of);
    const mins = Math.max(0, Math.round((Date.now() - asOf.getTime()) / 60000));
    const sourceNote = data.source === "posted_hours_fallback"
      ? " (estimated from posted hours — live check unavailable)"
      : "";
    detail.textContent = `Last confirmed ${mins} min ago${sourceNote}`;
  } catch (err) {
    badge.className = "badge unknown";
    badge.textContent = "STATUS UNKNOWN";
    detail.textContent = "Couldn't reach status service — call ahead.";
  }
}

refresh();
setInterval(refresh, POLL_MS);
