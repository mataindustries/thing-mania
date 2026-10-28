# THING//MANIA — Pocket Mayhem v0.4

**Photograph a household object. Turn it into the star of three ridiculous microgames.**

Created as fresh code for the [Meta Global AI Developer Hackathon](https://dev.meta.ai/events/global-hackathon) Indie track. Mobile-first Canvas arcade with a server-side Meta Model API integration. Playable modes:

1. **WRECK IT** — launch your object at a haunted house.
2. **BEAM IT** — time a UFO abduction.
3. **RUN FOR IT** — dodge falling lava rocks.

## The AI-powered reveal

- **Muse Spark 1.3** interprets the submitted photo to produce a validated GamePlan: detected object, absurd character role, dialogue, themes, physics, and difficulty modifiers. The photo-analysis pipeline has been tested successfully with a painted pumpkin.
- **SAM 3.1 (new in v0.4, live verification pending)** segments the identified object to create a true transparent sprite. This is a second *optional* action requiring explicit consent and a separate click. When it succeeds, the sprite is used in **all three games**; when it fails, the playable photo version remains.
- Offline mock fixtures for hot rod, sponge, and plush bear are available behind a developer disclosure.

## Local development

Node.js 22.9+ recommended.

```bash
npm install
npm test
npm run check
MOCK_MODE=true PORT=3002 npm start
```

Open Cloud Shell's web preview at port 3002. In mock mode you can exercise the three fixtures at zero API cost; SAM is not available in mock mode.

### Private live test

Keep a real `.env` file outside Git, with the sole secret:

```dotenv
MODEL_API_KEY=YOUR_META_MODEL_API_KEY
```

If you previously exported an incorrect key, the `env -u` prefix below forces Node to use the private `.env` value:

```bash
env -u MODEL_API_KEY MOCK_MODE=false MAX_SESSION_CALLS=1 MAX_SAM_CALLS=1 MAX_RETRIES=0 MAX_SESSION_BUDGET_USD=0.05 PORT=3002 node --env-file=.env server.js
```

In the browser: **choose photo → tick explicit consent → analyze with Muse Spark → optionally cut out with SAM → play all three games**.

A single SAM 3.1 image costs approximately **$0.0025** (Meta published rate, subject to billing terms). The API attempt is counted even if no usable mask is returned. Muse Spark token cost is estimated locally. These are per-process safeguards, **not durable spending guarantees**. The app makes no automatic SAM retries; avoid running a live server on a public URL without authentication, durable quota enforcement, and abuse controls.

## Architecture

- `game.js`, `styles.css`, `index.html` — mobile Canvas arcade and cutout compositor.
- `gameplan.js` — schema validation, bounds checks, and offline safe defaults.
- `meta_adapter.js` — Meta Muse Spark image interpretation, with limited calls, caching, and fallback.
- `sam_adapter.js` — explicit SAM 3.1 image segmentation via Meta's official `@meta-sam/parser` and OpenAI-compatible SDK.
- `server.js` — local-only HTTP server, photo-consent enforcement, static-file allowlist, and private credential proxy.
- `test/` — deterministic offline tests. **Live SAM integration must be verified separately.**

### Limitations and next priorities

- SAM returns the mask geometry and the browser composites it into a transparent sticker. Accuracy depends on the noun phrase and original image composition.
- Session accounting is in-memory and resets on backend restart; not safe for public deployment.
- Next: end-to-end SAM test on pumpkin and second object, object-specific spectacle, mobile audio/accessibility QA, shareable finale, secured public demo, and a three-minute submission video.

**Do not commit `.env` or print the API key.**
