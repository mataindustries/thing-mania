# Hackathon change log — clean provenance

**2026-10-29 · THING//MANIA — Chaos Stage Machine v1 (feat/chaos-stage-machine)**

- **Deterministic StageRecipe system (`stage_machine.js`)**: four slots — ATMOSPHERE, SET, PROPS, FX — filled from a per-game allowlist. Recipes are frozen plain data (no code, URLs or images), validated, and derived from the validated GamePlan (label, role, theme titles → safe tags such as `spooky`, `kitchen`, `roadside`) plus a remix count, on a dedicated visual RNG. Remix 0 is the director's cut (best tag match; the original art wins ties); every remix after that is a seeded weighted draw that must leave the current world behind.
- **WRECK IT has two worlds**: the original **Haunted House** (untouched; still the default) and the new **Cursed Diner** — crooked railcar diner with a possessed EAT pylon and flickering neon, a giant metal-rimmed soup can and a burnt-toast spectator who react to the swing, condiments/parking-lot props, chef-hatted kitchen spirits on the same ghost schedule, and its own roof-pop, rubble and CLOSED sign. Extra modules: Toxic Moon, Pumpkin Patch, Greasy Sunset, Fried-Egg Moon, Will-o'-wisps, Grease Steam, Neon Moths.
- **REMIX THE CHAOS**: one tap on the menu, WRECK IT ticket or report re-rolls the stage with a 1.4 s "ASSEMBLING MAYHEM" snap-in (0.6 s fade under reduced motion). Zero API calls; GamePlan, photo and SAM sticker untouched; unavailable mid-round. `?remix=N` reproduces any composition.
- **BEAM IT / DODGE IT** consume the same interface (Aurora Night, Eclipse Glow alternates).
- Collision, swing physics, timers, scoring and gameplay RNG never read the recipe; `test/stage_machine.test.js` proves identical traces, scores and rock lanes across worlds. Visual comparison: `docs/stage-machine-v1.jpg`.

**2026-10-27 · THING//MANIA v0.3 — Meta GamePlan Director (feat/meta-gameplan)**

Sprint achievements authored during the Hackathon:

- **Bounded JSON GamePlan Schema (`gameplan.js` v1.3.0)**:
  - Specifically structured for Meta Muse Spark 1.3 scene interpretation.
  - Validates detected objects list, selected playable prop, whimsical role narrative, context-aware announcer lines, and round modifiers.
  - Strict anti-hallucination check: rejects plans where `selected_object.id` is not present in `detected_objects`.
  - Enforces safe numeric ranges for all three microgame modes (launch impulse, time limit, wreck scale, UFO speed, beam window, rock speeds, spawn interval, hearts).
  - Universal module definition (UMD) running natively in both Node.js and browser environments.

- **Secure Local Backend Proxy (`server.js`, `meta_adapter.js`)**:
  - Zero external runtime npm dependencies; uses Node.js standard libraries (`http`, `fs`, `path`, `crypto`).
  - Keeps `MODEL_API_KEY` strictly on the server (read from environment); never exposed to client JavaScript or git.
  - Strict user consent enforcement: rejects image submissions without explicit user confirmation (`userConsent: true`).
  - Security headers added (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`).

- **Three Diverse Meta Fixtures (`fixtures/`)**:
  - `toy_car.json` ("Vintage Die-Cast Hot Rod"): V8 supercharged battering ram, heavy impulse (3.2), high-speed UFO (1.25x), high-speed magma boulders (260-345 px/s).
  - `kitchen_object.json` ("Soggy Kitchen Sponge"): Absorbent moisture commander, bouncy impulse (2.1), culinary decoys ("BURNT TOAST", "SOUP CAN"), erratic popcorn rocks, 3 hearts.
  - `stuffed_animal.json` ("Professor Fluffington - Plush Bear"): Diplomatic plush ambassador, floaty swing (2.4), slow UFO drift (0.82x), soft pumice showers, 3 hearts.

- **Budget & Session Accounting**:
  - Application-level hard stop at 10 session calls and $1.00 USD spending ceiling. (Provider notifications are asynchronous; this local enforcement prevents runaway spend).
  - Content-hash caching using SHA-256: repeat photo or fixture calls return cached GamePlan with $0.00 spend and 0 API calls charged.

- **Resilient Fallback & Offline Path**:
  - Graceful recovery from API timeouts, malformed JSON, and empty detections by falling back to verified, safe baseline plans.
  - Full offline capability: works via static server or direct browser launch with bundled offline generator.

- **Automated QA & Test Suite (`test/`)**:
  - 35 automated tests covering schema bounds, anti-hallucination, mock adapter, consent gates, caching, session budgets, timeout recovery, multi-round simulation, and DOM contract verification.

**2026-10-27 · THING//MANIA v0.2 — Pocket Mayhem**

New implementation created during the Hackathon:

- Standalone mobile-first HTML/CSS/Canvas/Web Audio application with no external dependencies.
- Original scene drawings and object-sticker renderer.
- Reusable 3-stage timer / score / win-loss / overlay / pointer state machine.
- WRECK IT: pull-release swinging wrecking ball, impact destruction and released ghosts.
- BEAM IT: tractor beam timing game, moving targets and decoys, success/miss feedback.
- RUN FOR IT: falling-rock hazards, horizontal steering, two-hit survival.
- Procedural particles, UI transitions, tiny Web Audio feedback, optional local photo sticker, keyboard controls.
- Self-contained run instructions, test notes, and explicit limitations.

No pre-event project source code, media, game engine, DaemonV12 implementation or Shoot the Moon source/assets included.

**Next Milestone:** SAM 3.1 true background segmentation with point/box prompting and transparent sprite cutout. (Not yet implemented; current build uses sticker cropping).
