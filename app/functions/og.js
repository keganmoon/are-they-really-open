// Cloudflare Pages Function: GET /og.png
// Renders the link-preview card image so iMessage/Slack/Discord/etc. show
// OPEN or CLOSED right in the unfurl, before anyone taps the link.
// Uses @cloudflare/pages-plugin-vercel-og (or `satori` + `resvg` directly)
// to render an SVG-like JSX template to PNG at the edge. Sketch below —
// swap in your renderer of choice; the shape of the output is what matters.

import { ImageResponse } from "workers-og"; // or `satori`+`@resvg/resvg-wasm`

export async function onRequestGet(context) {
  let status;
  try {
    const raw = await context.env.STATUS_KV.get("status");
    status = raw ? JSON.parse(raw) : null;
  } catch {
    status = null;
  }

  const open = !!status?.open;
  const asOf = status?.as_of ? new Date(status.as_of) : null;
  const minsAgo = asOf ? Math.max(0, Math.round((Date.now() - asOf.getTime()) / 60000)) : null;

  const bg = open ? "#1f9d55" : "#c0392b";
  const label = open ? "OPEN NOW" : "CLOSED";
  const sub = minsAgo === null
    ? "Status unavailable — call ahead"
    : `Confirmed ${minsAgo} min ago`;

  return new ImageResponse(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: bg,
          color: "#fff",
          fontFamily: "sans-serif",
        },
        children: [
          { type: "div", props: { style: { fontSize: 96, fontWeight: 800 }, children: label } },
          { type: "div", props: { style: { fontSize: 40, marginTop: 24 }, children: "Pasong's Café" } },
          { type: "div", props: { style: { fontSize: 28, marginTop: 12, opacity: 0.85 }, children: sub } },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}
