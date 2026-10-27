# THING//MANIA QA Report (v0.3 — Meta GamePlan Director Sprint)

**Date:** October 27, 2026  
**Environment:** Linux / Node.js v24.22.1 / Chromium Headless Responsive Check  
**Sprint Branch:** `feat/meta-gameplan`

---

## 1. Automated Test Suite Summary

Executed via `npm test` (`node --test test/*.test.js`):
- **Total Tests:** 35 passed, 0 failed, 0 skipped
- **Total Test Suites:** 5
- **Execution Duration:** ~540 ms
- **Syntax Check (`npm run check`):** Passed (`node --check` across all JavaScript sources)

### Suite Breakdown:

| Test Suite | Tests | Result | Focus Areas |
|---|---|---|---|
| `test/gameplan.test.js` | 7 | PASS | Bounded schema, numeric clamping, anti-hallucination, empty list rejection, rogue mechanic rejection |
| `test/adapter.test.js` | 8 | PASS | User consent enforcement, mock adapter, SHA-256 caching ($0.00 repeat spend), session limit & budget hard stops, timeout/malformed recovery |
| `test/gameplay_parameters.test.js` | 7 | PASS | Parameter variations across 3 fixtures, pendulum impact physics simulation, beam alignment cycle simulation, rock dodge simulation |
| `test/server.test.js` | 8 | PASS | HTTP routes (`/api/status`, `/api/fixtures`, `/api/director/plan`), security headers (`nosniff`, `DENY`), status code contract (200, 400, 429, 504), static assets |
| `test/dom_contract.test.js` | 5 | PASS | Complete contract between `game.js` and `index.html`, ARIA live regions, mobile viewport meta, script tag sequencing, CSS media queries |

---

## 2. Security & Budget Control Verification

- **API Secret Isolation:** Verified that `MODEL_API_KEY` is loaded strictly from environment variables and is never transmitted in `GET /api/status`, error payloads, or client bundles. `.gitignore` explicitly excludes `.env*`, `*.log`, and `.cache/`.
- **Mandatory Consent Check:** Verified that any request with `userConsent !== true` is immediately rejected with HTTP 400 (`CONSENT_REQUIRED`), preventing unauthorized photo transmission.
- **Application-Level Hard Stop:** Tested that after 10 session calls or reaching the $1.00 USD spending ceiling, un-cached API calls are rejected with HTTP 429 (`SESSION_LIMIT_EXCEEDED` / `BUDGET_EXCEEDED`).
- **Content-Hash Caching:** Verified that submitting an identical fixture or image generates an identical SHA-256 cache key, returning a `cached: true` response with $0.00 spend and 0 session calls deducted.

---

## 3. Fixture Differentiation & Playability Matrix

All three test fixtures were validated against the physics engine to ensure visible narrative changes and mechanically sound gameplay:

| Fixture | Object Label | Whimsical Role | Wreck Impulse | UFO Speed / Beam | Lava Speed / Hearts | Playable? |
|---|---|---|---|---|---|---|
| `toy_car` | Vintage Die-Cast Hot Rod | V8 Supercharged Battering Ram | 3.2 (Heavy) | 1.25x / 62px | 260-345 px/s / 2 ♥ | YES (Impact in 0.5s) |
| `kitchen_object` | Soggy Kitchen Sponge | Absorbent Moisture Commander | 2.1 (Bouncy) | 0.90x / 78px | 200-280 px/s / 3 ♥ | YES (Impact in 0.8s) |
| `stuffed_animal` | Professor Fluffington (Bear) | Diplomatic Plush Ambassador | 2.4 (Floaty) | 0.82x / 72px | 210-290 px/s / 3 ♥ | YES (Impact in 0.7s) |
| *Baseline Fallback* | Mystery Thing | Chaotic Arcade Prop | 2.6 (Standard) | 1.00x / 68px | 245-315 px/s / 2 ♥ | YES (Impact in 0.6s) |

---

## 4. Mobile Layout & Responsive UI Check

- **Viewports Checked:**
  - 320 x 568 px (Small mobile): No horizontal overflow; ticket modal and buttons scale via `clamp()`.
  - 390 x 844 px (Standard modern mobile): Aspect-ratio preserved (420:640); canvas fills container cleanly; touch buttons accessible.
  - 768 x 1024 px (Tablet): Arcade shell centered with retro shadow; legible monospace hardware readouts.
- **Accessibility:**
  - `aria-live="polite"` active on `#status`, `#photoNote`, `#roleBadge`, and `#modal`.
  - Canvas maintains `tabindex="0"` for keyboard controls (Enter/Space and Arrow keys).
  - High-contrast button styles with visible `:focus-visible` outlines.

---

## 5. Offline & Error Recovery Path

- **Backend Offline:** If the backend proxy is stopped or unreachable, the client catches the fetch failure and immediately engages the local offline fallback plan (`createDefaultGamePlan`). Gameplay is uninterrupted.
- **Simulated Timeout:** Tested that requests timing out after 5000ms return a safe fallback plan with HTTP 504.
- **Simulated Malformed JSON / Empty Detections:** Tested that invalid model payloads trigger schema sanitization fallback without page errors.

---

## 6. Remaining Work (Future Sprints)

- **SAM 3.1 Segmentation:** Real transparent sprite extraction using prompt boxes/points. (Currently sticker cutout mode).
- **Live Meta Muse Spark API Call:** Wire actual account endpoint and Bearer key once provider access is confirmed.
