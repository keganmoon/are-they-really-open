# "Are They Open?" — Viability Research for Pasong's Café

## 1. Target restaurant
**Pasong's Café**, 114 N Michigan Ave, Saginaw, MI 48602 — (989) 791-5008.
Family-owned Asian fusion spot, irregular/limited hours (closed Mon, short lunch/dinner
windows Tue–Fri), no reliable "open now" signal online. Multiple directory listings
(Yelp, Facebook, zmenu, restaurantji) show conflicting hours — exactly the kind of
place where a live "open right now" indicator is genuinely useful, not a gimmick.

## 2. POS system — what we could confirm
I could not positively identify Pasong's POS vendor from public sources (no public
website with an ordering widget, no exposed Square/Toast/Clover online-ordering page,
site scraping blocked by anti-bot on Yelp/restaurant directory sites). Their primary
domain (`pasongs.com`) is parked/for sale — they don't currently have a real website.

**This means step one of the real project is simply asking the owner what they use.**
Realistically it's one of these, in order of likelihood for an independent single-location
restaurant this size:

- **Square** (most common for independents this size — free tier, iPad register)
- **Clover** (common via bank/merchant-services bundles, e.g. Fiserv)
- **Toast** (more common for full-service/larger restaurants, pricier)

The good news: **all three of the plausible candidates expose exactly the kind of
low-permission, read-only signal this project needs.**

## 3. API capability per platform (read-only, minimal scope)

### Square (most likely candidate, and easiest)
- **Orders API** / **Payments API** — read-only scope (`ORDERS_READ` or `PAYMENTS_READ`).
  Poll for the most recent completed payment/order timestamp. If a payment happened in
  the last N minutes (e.g. 20), treat as "open." This needs *zero* register/device access
  — just transaction history.
- **Labor API (Shifts)** — read-only scope (`EMPLOYEES_READ`/`TIMECARDS_READ`). If a staff
  member is currently clocked in, that's a strong "open" signal, closer to true register
  state than payment recency.
- **Locations API** — read-only, gives official business hours as a fallback/sanity check.
- Auth: Square OAuth app, restricted to a **single read-only scope**, connected once by
  the owner from their Square Dashboard (2-minute consent flow, no code on their end).
- This is the lowest-friction option: Square's dev sandbox is free, docs are good, and
  a single scope keeps their risk essentially at zero (no refund/payment/write access ever).

### Clover
- **Webhooks API** — can subscribe to order/payment created events for near-real-time
  updates, or **Orders REST API** for polling, similarly read-only.
- Slightly more setup overhead than Square (app review process even for personal apps
  in some cases) but functionally equivalent capability.

### Toast
- Has a **Restaurants API** (hours/schedule) and **Orders/Labor APIs**, but Toast's
  developer access is typically gated behind partner review and is oriented at larger
  accounts — likely overkill/friction for a single independent café. Would treat as
  fallback only if Square/Clover aren't in use.

## 4. Recommended approach
1. **Confirm the POS vendor directly with the owner** (can't be determined remotely).
2. If Square (most likely): request a single **read-only Orders or Labor scope** via
   Square's OAuth flow — owner clicks "Allow" once from their own dashboard, nothing
   installed on their hardware, nothing that touches payments/refunds/menu/pricing.
3. Poll the relevant read-only endpoint every 1–5 minutes from a small serverless
   function (or lightweight cron). Derive `OPEN` / `CLOSED` from:
   - Recent payment activity within a rolling window, AND/OR
   - An employee currently clocked in (Labor API), AND
   - Fallback to posted hours during any polling errors.
4. Static webpage reads the last computed status (cheap read from a tiny JSON endpoint
   or Firebase/Supabase doc) and displays a big OPEN/CLOSED badge.

## 5. Risk/permission summary for the pitch to the owner
- No access to payments, refunds, card data, menu editing, pricing, or reports.
- No software installed on their register/iPad.
- One OAuth consent click, revocable by them anytime from their own POS dashboard.
- Worst case if it breaks: page falls back to posted hours, nothing customer-facing
  on their end ever changes.

## 6. Open questions for the owner (become outreach follow-ups)
- What POS do you use — Square, Clover, Toast, or something else?
- Comfortable granting a single read-only integration for this?
- Any preference on how "open" should be defined (till first sale of the day vs.
  staff clocked in vs. something else)?
