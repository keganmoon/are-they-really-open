/*
 * Embeddable "Is Pasong's Open?" badge.
 * Drop this on any page (their Facebook bio link, Linktree, Google Business
 * profile custom link, etc):
 *
 *   <div data-pasongs-badge></div>
 *   <script src="https://ispasongsopen.com/widget.js" defer></script>
 *
 * Fetches /api/status once per load + refresh interval; tiny footprint,
 * no iframe, no cookies, no tracking.
 */
(function () {
  const API = "https://ispasongsopen.com/api/status";
  const REFRESH_MS = 120_000;

  function render(el, data) {
    const open = !!data.open;
    el.innerHTML = "";
    const badge = document.createElement("a");
    badge.href = "https://ispasongsopen.com";
    badge.target = "_blank";
    badge.rel = "noopener";
    badge.textContent = open ? "🟢 Pasong's is OPEN" : "🔴 Pasong's is CLOSED";
    badge.style.cssText = [
      "display:inline-block",
      "font-family:system-ui,sans-serif",
      "font-size:14px",
      "font-weight:600",
      "padding:6px 12px",
      "border-radius:999px",
      "text-decoration:none",
      "color:#fff",
      `background:${open ? "#1f9d55" : "#c0392b"}`,
    ].join(";");
    el.appendChild(badge);
  }

  function fetchAndRender() {
    const targets = document.querySelectorAll("[data-pasongs-badge]");
    if (!targets.length) return;
    fetch(API, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => targets.forEach((el) => render(el, data)))
      .catch(() => {
        targets.forEach((el) => {
          el.textContent = "Pasong's status unavailable";
        });
      });
  }

  fetchAndRender();
  setInterval(fetchAndRender, REFRESH_MS);
})();
