# THING//MANIA: POCKET MAYHEM (v0.3)

**One everyday object. Three different universes. Twenty-nine seconds of ridiculous arcade gameplay.**

Freshly authored for the **Meta Global AI Developer Hackathon (Indie Track)**. Built from scratch with zero runtime dependencies using HTML, CSS, Canvas, Web Audio, and a lightweight Node.js standard-library backend proxy.

---

## What's New in v0.3: Meta GamePlan Director

The arcade now features the first working phase of a real Meta-powered Game Director, designed for **Meta Muse Spark 1.3**, running safely under a **zero-cost mock adapter with offline fixtures**:

1. **Bounded JSON GamePlan Schema (`gameplan.js` v1.3.0)**:
   - Formatted specifically for Muse Spark 1.3 scene interpretation.
   - Outputs: detected household objects, selected playable prop, whimsical narrative role, context-aware announcer lines (intro, win, loss, summary), and mode-specific parameters.
   - **Strict Safe Bounds**: Only predefined arcade mechanics and bounded numeric ranges are permitted.
   - **Anti-Hallucination Guard**: Validates that `selected_object.id` strictly matches an entry in `detected_objects`.

2. **Secure Local Backend Adapter (`server.js`, `meta_adapter.js`)**:
   - Pure Node.js standard library (`http`, `fs`, `path`, `crypto`). Zero external npm packages required.
   - Keeps `MODEL_API_KEY` strictly server-side (read from environment); never exposed to client JavaScript or tracked in git.
   - **Mandatory User Consent**: Photos are never transmitted or analyzed without explicit opt-in confirmation (`userConsent: true`).

3. **Three Diverse Fixtures (`fixtures/`)**:
   - 🚗 **Hot Rod** (`toy_car.json`): Heavy zinc-alloy battering ram (impulse 3.2), high-speed UFO drift (1.25x), fast falling magma (260-345 px/s).
   - 🧽 **Sponge** (`kitchen_object.json`): Absorbent moisture commander, bouncy wreck (impulse 2.1), culinary decoys (`BURNT TOAST`, `SOUP CAN`), popcorn rocks, 3 hearts.
   - 🧸 **Plush Bear** (`stuffed_animal.json`): Diplomatic plush ambassador, floaty swing (2.4), slow UFO drift (0.82x), gentle pumice showers, 3 hearts.

4. **Hard Budget & Session Spending Controls**:
   - Application-level hard stop at **10 calls per session** and **$1.00 USD spending ceiling**. *(Provider spend notifications are asynchronous; this local application-level enforcement ensures hard caps are respected).*
   - **Content-Hash (SHA-256) Caching**: Repeated analysis of the same photo or fixture returns cached plans with $0.00 spend and 0 session calls deducted.

5. **Resilient Fallback & 100% Offline Path**:
   - Gracefully recovers from network drops, server timeouts (5000ms), malformed JSON, and empty detections by engaging a safe, verified baseline plan.
   - The game runs completely offline if launched statically without a backend.

---

## Play Immediately

### Option A: Local Backend Server (Recommended)

1. Start the local server:
   ```bash
   npm start
   # or: node server.js
   ```
2. Open **`http://localhost:3000`** in any modern desktop or mobile browser.
3. Click any of the **TEST FIXTURE** buttons (`🚗 HOT ROD`, `🧽 SPONGE`, `🧸 PLUSH BEAR`) to see dynamic roles, context-aware announcer text, and altered physics parameters!
4. Or select your own photo sticker, check the consent box, and click **ANALYZE WITH META AI**.

### Option B: Standalone Static / Offline

Open `index.html` directly in a browser or serve via `python3 -m http.server 3000`. The client-side fallback generator ensures all 3 microgames remain 100% playable without any network calls.

---

## The Three Microgames

| Round | World | Skill | Payoff |
|---|---|---|---|
| **01 WRECK IT!** | Haunted Mansion | Drag left, release pendulum | Demolish the mansion; evict the ghosts |
| **02 BEAM IT!** | Alien Highway | Timing / tap alignment | Abduct the moving prop twice before time runs out |
| **03 RUN FOR IT!** | Active Volcano | Horizontal swipe / arrow keys | Dodge falling molten boulders; survive the timer |

**Controls:**
- **Pointer / Touch / Mouse:** Drag backwards on WRECK IT; tap anywhere on BEAM IT; swipe or drag left/right on RUN FOR IT.
- **Keyboard:** `Enter` or `Space` launches the wrecking ball or activates the UFO beam. `A`/`D` or `Left`/`Right` steers the raft in the volcano round.
- **Audio:** Web Audio unlocks after first tap/click.

---

## Personality & Art Direction

Intentionally cheap, chaotic, paper-cutout dollar-store arcade presentation:
- Hand-drawn jagged borders and crooked stickers.
- Wonky halftone dots, retro stars, and flashing CRT screen lines.
- Exaggerated freeze-frame destruction, screen shake, and flying debris particles.
- Contextual, jokey incident reports written by the Meta Game Director.

---

## Automated QA & Test Suite

Run the full test suite:
```bash
npm test
```

Run JavaScript syntax verification:
```bash
npm run check
```

35 unit and integration tests verify:
- Bounded GamePlan schema validation, numeric clamping, and anti-hallucination guards.
- Mock adapter functionality, consent validation, and server-side secret isolation.
- SHA-256 caching and hard budget spending stops.
- Mechanical playability and multi-round simulations for all 3 diverse fixtures.
- DOM contract and mobile viewport compatibility (320px, 390px, 768px).

See `QA_REPORT.md` for full test logs and execution metrics.

---

## Instructions for Later Live Muse Spark 1.3 Integration

When live API access and credits are confirmed:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set your actual Meta credentials in `.env` (never commit this file to git):
   ```env
   MODEL_API_KEY=your_actual_meta_model_api_key_here
   MODEL_ENDPOINT=https://api.meta.example/v1/models/muse-spark-1.3
   MOCK_MODE=false
   MAX_SESSION_CALLS=10
   MAX_SESSION_BUDGET_USD=1.00
   PORT=3000
   ```
3. In `meta_adapter.js`, activate the live `fetch(MODEL_ENDPOINT, ...)` block:
   - Provide system prompt with the JSON schema from `gameplan.js`.
   - Transmit image bytes only when `userConsent === true`.
   - Pipe response through `validateGamePlan()`.
   - Real token counts, latency, and estimated cost will automatically populate `meta` readouts and update the on-screen hardware budget status.

---

## Build Provenance & Scope Boundaries

- Authored newly during the Hackathon event. See `HACKATHON_CHANGELOG.md`.
- No pre-event personal codebases, assets, or engines used.
- **Current sprint boundary**: Meta Model API adapter and bounded GamePlan director implemented and verified via fixtures and local mocks.
- **Next sprint milestone**: SAM 3.1 true background segmentation with point/box prompt for transparent sprite cutouts. (Current build uses sticker cropping).
- No paid API calls were made during this sprint.
