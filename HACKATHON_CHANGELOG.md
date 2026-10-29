# Hackathon change log — clean provenance

**2026-10-29 · THING//MANIA — Chaos Stage Machine v2: six worlds (feat/stage-machine-v2)**

- **BEAM IT · ALIEN DRIVE-THROUGH** (new set, alongside the untouched **Night Farm**): a parked neon diorama instead of a scrolling panorama — a flying-saucer ZORP'S pylon with chaser bulbs and a DRIVE-THRU arrow, an upswept Googie diner with an atomic starburst, two regulars sharing one milkshake, and a cyclops fry cook in the pickup window who follows your thing, gasps at a good beam, facepalms at a miss and cheers with a takeout bag. Decoys become a walking soda and a chattering burger box. Modules: Neon Nebula (glazed-donut planet), Twin Moons, Floating Menus, Snack Ads (BILLIONS SERVED · 0 RETURNED, roof soda mascot, a FEED ME trash can), Neon Buzz, Fryer Steam; Night Breeze is shared by both sets.
- **DODGE IT · INDUSTRIAL MELTDOWN** (new set, alongside the untouched **Volcano**, now split into slots with identical art): a steel-blue blast furnace with a white-hot mouth and a DAYS WITHOUT A MELTDOWN: 0 plaque, an overhead gantry with a pouring ladle, pipes and jittering gauges, conveyor belts of doomed rubber ducks, and a molten-steel channel with drifting slag. Falling hazards are painted as molten cogs, hex nuts and snapped I-beams with a hot rim — chosen from each rock's own radius, so positions, sizes, speeds, lanes and hit tests are unchanged. The mint raft and the sticker character are untouched. Modules: Smog Dusk, Night Shift (the moon wears a hard hat), Pipe Works, Safety Theater (SAFETY IS OUR #2 PRIORITY), Spark Shower, Steam Vents; Ember Drift is shared.
- **Composition**: two new safe tags (`fiery`, `rural`); the director's cut follows the GamePlan (hot rod → drive-through + foundry, sponge → drive-through + volcano, plush/pumpkin/default → the originals). Every remix rebuilds each game's world on the same independent visual RNG.
- **On-world copy**: titles, ticket headings, hints, intros, results and canvas lines follow the set on stage. Model text is kept but rewritten word-by-word for the world ("VOLCANO DRAG STRIP … magma superhighway" → "FOUNDRY DRAG STRIP … slag superhighway"; "tractor beam" survives), and falls back to the set's own line if anything off-world remains.
- **Player experience**: REMIX THE CHAOS now works on every round ticket and ASSEMBLING MAYHEM rebuilds the world on that ticket (BEAM or DODGE), still 1.4 s (0.6 s under reduced motion) and zero API calls. Menu and Chaos Report badges name the worlds; the report and share card record the world each round was actually played in. Fixed `.badges[hidden]` so round tickets no longer show stale badges.
- QA: `test/stage_worlds.test.js` (12 tests) — valid recipes, exhaustive compatibility, determinism, remix rebuilds, zero API calls, identical beam/dodge traces (RNG, hitboxes, hearts, score, timers) across worlds, sticker in every composition, reduced motion, no off-world copy, report worlds. 82/82 passing. Comparison: `docs/stage-machine-v2.jpg`, `docs/stage-machine-v2-mobile-390x844.jpg`. Draw cost stays at 3–5 ms/frame under 4× CPU throttling.

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
