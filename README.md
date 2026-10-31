# THING//MANIA — Pocket Mayhem v0.4

**Photograph a household object. Turn it into the star of three ridiculous microgames.**

Created as fresh code for the [Meta Global AI Developer Hackathon](https://dev.meta.ai/events/global-hackathon) Indie track. Mobile-first Canvas arcade with a server-side Meta Model API integration. Playable modes:

1. **WRECK IT** — launch your object at a haunted house.
2. **BEAM IT** — time a UFO abduction.
3. **DODGE IT** — dodge falling lava rocks.

## The AI-powered reveal

- **Muse Spark 1.3** interprets the submitted photo to produce a validated GamePlan: detected object, absurd character role, dialogue, themes, physics, and difficulty modifiers. The photo-analysis pipeline has been tested successfully with a painted pumpkin.
- **SAM 3.1** (previously verified live on a painted pumpkin) segments the identified object to create a true transparent sprite. This is a second *optional* action requiring explicit consent and a separate click. When it succeeds, the sprite is used in **all three games**; when it fails, the playable photo version remains.
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

The original soundtrack starts after your first interaction. The cabinet's
**MUSIC ON/OFF** button saves your music preference; game effects stay enabled.
Menus and tickets use the menu arrangement, and gameplay crossfades to the aligned
main theme. See [soundtrack integration and QA](docs/ost-integration.md) for asset
provenance, looping details, and mobile preview evidence.

### Private live test

Keep a real `.env` file outside Git, with the sole secret:

```dotenv
MODEL_API_KEY=YOUR_META_MODEL_API_KEY
```

If you previously exported an incorrect key, the `env -u` prefix below forces Node to use the private `.env` value:

```bash
env -u MODEL_API_KEY MOCK_MODE=false MAX_SESSION_CALLS=1 MAX_SAM_CALLS=1 MAX_RETRIES=0 MAX_SESSION_BUDGET_USD=0.05 PORT=3002 node --env-file=.env server.js
```

In the browser: **ENTER THE TEST CHAMBER → tick explicit Meta consent → SCAN THE SPECIMEN (Muse Spark 1.3) → optionally ACTIVATE DIMENSION PORTAL (SAM 3.1) → CHARACTER MATERIALIZED → UNLEASH THE CHAOS**. These are two distinct paid opt-ins; scanning never starts segmentation automatically.

A single SAM 3.1 image costs approximately **$0.0025** (Meta published rate, subject to billing terms). The API attempt is counted even if no usable mask is returned. Muse Spark token cost is estimated locally. These are per-process safeguards, **not durable spending guarantees**. The app makes no automatic SAM retries; avoid running a live server on a public URL without authentication, durable quota enforcement, and abuse controls.

## Architecture

- `game.js`, `styles.css`, `index.html` — mobile Canvas arcade and cutout compositor.
- `gameplan.js` — schema validation, bounds checks, and offline safe defaults.
- `meta_adapter.js` — Meta Muse Spark image interpretation, with limited calls, caching, and fallback.
- `sam_adapter.js` — explicit SAM 3.1 image segmentation via Meta's official `@meta-sam/parser` and OpenAI-compatible SDK.
- `stage_machine.js` — Chaos Stage Machine: deterministic, allowlisted StageRecipes (atmosphere / set / props / fx) for six worlds — Haunted House, Cursed Diner, Night Farm, Alien Drive-Through, Volcano and Industrial Meltdown — plus the copy guard that keeps model lines on-world. Remixing is visual-only and makes zero API calls.
- `server.js` — local-only HTTP server, photo-consent enforcement, static-file allowlist, and private credential proxy.
- `test/` — deterministic offline tests. **Live SAM integration must be verified separately.**

### Limitations and next priorities

- SAM returns the mask geometry and the browser composites it into a transparent sticker. Accuracy depends on the noun phrase and original image composition.
- Session accounting is in-memory and resets on backend restart; not safe for public deployment.
- Remaining: physical-phone audio, touch, performance and native-share QA; secured public demo; three-minute submission video. This sprint makes no live Meta requests.

**Do not commit `.env` or print the API key.**


## S-tier payoff sprint

The WRECK state machine is `playing → aftermath → result`. Contact awards the
impact bonus once, clears dragging, freezes simulation for 120 ms, then runs a
2.48-second aftermath. Damage finishes deforming the house after 650 ms, while
seven ghosts remain onstage until the result ticket enters. The countdown and
controls stay locked throughout; the win bonus commits once on the result edge.
BEAM locks its countdown on the final catch and adds a short victory flourish.
LAVA survival has a 1.05-second celebration before the ticket.

The **Chaos Report** presents the actual `state.photo` image as its hero, name,
generated role, total score, WRECK/BEAM/DODGE outcomes with the world each round
was played in, and threat class. Its local
720×1280 PNG preserves transparent sprites and ordinary photos, uses original
Canvas framing, and keeps native file sharing plus download fallback. No image
generation or new runtime dependencies are used.

Reduced-motion mode disables screen shake, full-screen washes and ticket motion;
it slows ambient motion and keeps the same readable payoff duration. Normal mode
uses a single capped impact wash rather than strobing. Audio starts only after a
player action. Model strings use textContent or Canvas text, never HTML injection.

### Sprint QA and demo evidence

`test/payoff.test.js` executes the real game in an offline VM DOM/Canvas host:
celebration timing, frozen timers, single scoring, repeated input, reset, final
beam capture at expiry, lava survival, sprite-source continuity through all games
and export, reduced-motion completion, and materialization. This validates logic
and draw calls, **not pixels, browser audio, native sharing or real-device FPS**.
No browser or stored pumpkin image is available in the sprint workspace, so no
mobile screenshots or new live-pumpkin verification are claimed.

Manual phone verification still required at approximately **390×844**:

- Reuse an already saved transparent pumpkin in an offline test session; verify
  all three games, hero portrait and exported PNG keep clean transparent edges.
- Drag/release WRECK; record contact, the full ghost aftermath and result entrance.
  Tap repeatedly during the aftermath; confirm one score and no skipped ticket.
- Test BEAM success at the deadline, rapid taps and missed beams; test LAVA touch
  swipes, near misses, damage and survival. Check ordinary-photo and no-photo play.
- Enable system reduced motion; check no shake or wash. Check first-tap audio,
  background/resume behavior, Android frame pacing, and the longest fixture role.
- Inspect the complete finale in the cabinet, scrolling if needed. Try native
  share, cancellation and PNG fallback. Verify 720×1280 dimensions and readable text.
- Check consent unchecked, backend unavailable, and failed cutout: photo fallback
  remains playable. Live API verification is separate and must be explicitly
  authorized; do not spend API calls for this sprint's QA.

Three-minute recording checklist: show the real object beside the phone; show
explicit consent and the two distinct actions using existing verified footage;
capture materialization; let the WRECK ghosts finish; show a BEAM catch and LAVA
near miss; linger on the character-led Chaos Report and its shared PNG. End with
Muse Spark's GamePlan role and SAM's actual transparent sprite clearly attributed.
