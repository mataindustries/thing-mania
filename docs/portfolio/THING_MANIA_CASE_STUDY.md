# THING//MANIA
### One photo. Three ridiculous games. Six worlds.

**Interactive AI arcade · Original soundtrack · Procedural art · Mobile web**

[**Play the game**](https://thing-mania.pages.dev/) · [**View source**](https://github.com/mataindustries/thing-mania) · [**See validation evidence**](https://github.com/mataindustries/thing-mania/blob/main/docs/RELEASE_VALIDATION.md)

---

## The brief

What would happen if an everyday object—or a child's drawing—could become the star of its own absurd arcade game?

THING//MANIA began as an experiment in an end-to-end creative system, not an image-generation demo. The challenge was to take an unpredictable picture, turn it into a recognizable playable character, give it a comic identity, and let the player take it through complete games with distinctive environments and a shareable result.

The result was built and submitted to the **2026 Meta Global AI Developer Hackathon (Indie / Build for Your World)**.

## The experience

1. **Enter the Test Chamber.** Choose a photo, consent to analysis, and let **Meta Muse Spark 1.3** interpret the object into a schema-validated `GamePlan` containing its identity, role, dialogue, and bounded game parameters.
2. **Activate the Dimension Portal.** In the private live build, **Meta SAM 3.1** segments the chosen subject; browser compositing turns its mask into a transparent, sticker-like playable sprite. If segmentation fails, the original image remains usable.
3. **Unleash the chaos.** Play three original microgames: **WRECK IT** (demolish a haunted structure), **BEAM IT** (time a UFO abduction), and **DODGE IT** (survive an erupting landscape).
4. **Remix the world.** An original **Chaos Stage Machine** assembles atmosphere, setting, props and effects from compatible, deterministic recipes. It supports six illustrated environments: Haunted House, Cursed Diner, Night Farm, Alien Drive-Through, Volcano Vacation and Industrial Meltdown. Remixes require **zero additional inference calls**.
5. **Share the evidence.** The browser creates a character-led **Chaos Report**, with played worlds, results and an exportable image.

A custom PUMP-led arcade soundtrack and deliberate scene transitions make the game feel like one identity rather than disconnected AI outputs.

## The hard problems solved

**Making generative direction safe for gameplay.** Model text is not executable game code. The app validates the GamePlan, bounds its tuning values, and maps theme words only to allowlisted StageRecipes. That preserves gameplay rules, physics and reproducible world combinations.

**Bringing an unpredictable photo into real-time animation.** SAM's segmentation mask is handled separately from image interpretation and composited client-side. The same character source is carried into all three minigames and the Chaos Report. The flow falls back when a mask doesn't work rather than making the game unusable.

**Making AI personalization economical.** The expensive interpretation step is separate from subsequent gameplay and remixing. The Stage Machine changes backgrounds, sets, props, FX and copy without another model call and without affecting seeded gameplay behavior.

**Coordinating design, music, engineering and release.** Agent-assisted code, original Canvas illustration, deterministic test fixtures, an original music pipeline through DaemonV12, and short-form video editing were directed into a cohesive product. Muse Wonder assisted editorial work on actual recorded game footage; this is distinct from the Muse Spark and SAM runtime integrations.

## Technical architecture

```text
Private live demonstration:
Photo + explicit consent
   │
   ├── Meta Muse Spark 1.3 → validated GamePlan
   └── Meta SAM 3.1        → segmentation mask
                                   │
                             transparent sprite
                                   │
               ↓
Browser Canvas arcade ← deterministic StageRecipe catalog
               │
      WRECK / BEAM / DODGE
               │
          Chaos Report
```

**Stack:** Vanilla JavaScript, Canvas rendering, Node.js private API adapters, Cloudflare Pages static distribution, original DaemonV12 music, FFmpeg media finishing, and GitHub-based tests/source history.

**Important product boundary:** [The public arcade](https://thing-mania.pages.dev/) is **fully playable with bundled offline fixtures** (hot rod, sponge and plush bear), including all three games, six-world remixing, original audio, and report export. The **live Muse Spark / SAM photo transformation is demonstrated privately in genuine recorded Android sessions**, not offered as an unrestricted public API. The live Node backend requires authentication and durable quotas before public access.

## Evidence and results

- **Shipped:** publicly hosted, playable Cloudflare Pages release.
- **Six environments, three game modes**, with deterministic remixing and zero new model calls per remix.
- **96 automated tests passed** at release validation; a headless mobile flow covered fixture selection, rounds, remixes, music and Chaos Report with zero API requests or uncaught errors. See [release evidence](https://github.com/mataindustries/thing-mania/blob/main/docs/RELEASE_VALIDATION.md).
- **Real Android API trials:** owner-recorded Muse Spark and SAM processing with unusual test images, including an illustrated character, apple-hairbrush hybrid and oversized car; actual model outputs and results were used in the submission film.
- **Original audio and media:** bespoke in-game soundtrack and a **2:43** hackathon film edited from genuine footage; a separate **15-second Character Roulette** vertical promotional reel was approved for portfolio use.
- **Hackathon submission:** owner confirmed the entry was submitted on November 4, 2026. **No prize or judging outcome is claimed.**

These are development and shipping results, not claims about audience growth, revenue, or awards.

## Why it matters beyond the game

THING//MANIA demonstrates a repeatable way to turn AI capabilities into a polished interactive product: constrained model outputs, resilient media handling, deterministic systems, mobile-first design, unique visuals, original sound, and a finished public experience.

The underlying method translates to branded interactive campaigns, personalized product experiences, interactive marketing, and internal creative tools where **the AI makes a high-value decision once and inexpensive software makes that decision useful repeatedly**.

---

**Built and directed by ENM Ventures LLC.**

**Live project:** https://thing-mania.pages.dev/  
**Code:** https://github.com/mataindustries/thing-mania  
**Validation:** https://github.com/mataindustries/thing-mania/blob/main/docs/RELEASE_VALIDATION.md

*Portfolio publication checklist: embed the final public demo video when its verified, judge-accessible URL is available; add a gallery of actual public screenshots; crop/redact any private Codespaces URLs or personal details from source recordings. Do not embed raw owner recordings by default.*
