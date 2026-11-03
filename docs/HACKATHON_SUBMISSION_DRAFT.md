# THING//MANIA — Meta Global AI Developer Hackathon submission draft

**Status: DRAFT — NOT SUBMITTED.** Confirm exact organizer portal fields and official rules after signing in. Replace the video placeholder after upload.

**Track:** Indie developer
**Proposed theme:** Build for Your World
**Title:** THING//MANIA — Your Stuff. Our Terrible Ideas.
**Tagline:** One photo. Three ridiculous games. Six remixable worlds.

**Public playable demo:** https://thing-mania.pages.dev/
**Source repository (default branch):** https://github.com/mataindustries/thing-mania
**Demo video:** [ADD FINAL JUDGE-ACCESSIBLE URL — test logged out]

## Short pitch

What if a household object—or a drawing—could become the star of its own ridiculous arcade? THING//MANIA turns an ordinary image into a character, gives it an absurd identity, and drops it into three original playable microgames. WRECK IT demolishes a haunted building, BEAM IT stages a UFO abduction, and DODGE IT turns survival into slapstick. A deterministic Chaos Stage Machine remixes the atmosphere, set, props and effects into six compatible worlds without making another inference call. Every session ends with a shareable Chaos Report.

Meta Muse Spark 1.3 interprets an explicitly consented image into a schema-validated GamePlan covering the object, comedic role, dialogue and bounded gameplay tuning. Meta SAM 3.1 separately segments the target object into a transparent sprite for use across all three games. The browser's Canvas engine handles real-time physics, rendering, gameplay, audio and export. When inference or segmentation fails, the game remains playable using the original photo or offline fixtures.

## What was built during the event

- New mobile-first Canvas arcade with WRECK IT, BEAM IT and DODGE IT.
- Six illustrated environments and deterministic, allowlisted StageRecipe remixes.
- Server-side opt-in Muse/SAM integration, GamePlan validation, graceful fallbacks and local consent gates.
- Original Chaos Report compositor and PNG/share workflow.
- Original game soundtrack and synchronized music controller.
- Test coverage, real Android live-photo validation, secured static public release and documentary capture evidence.

Source history and scope: see README.md, HACKATHON_CHANGELOG.md, docs/RELEASE.md, docs/RELEASE_VALIDATION.md, docs/demo/.

**Important provenance:** The DaemonV12 tool existed before the hackathon; the game's composition and its audio integration were produced for THING//MANIA. Third-party SDKs are not claimed as original code.

## How to try it

Visit https://thing-mania.pages.dev/ on desktop or phone, choose a fixture (hot rod, sponge, plush bear), enter the arcade, play all three games, press REMIX THE CHAOS on a round ticket and export your final Chaos Report. Sound begins after the first user gesture; use MUSIC ON/OFF to control it.

**Public demo scope:** The Cloudflare Pages release is deliberately offline-fixture-only, so anyone can play without sign-in, leaked credentials or unbounded paid inference. The submission video distinguishes this from separately recorded **private live Meta Model API** footage demonstrating real Muse Spark and SAM 3.1 transformations. Do not imply the public site currently offers live inference.

## Technical highlights and validation

- Schema-validated model output cannot inject arbitrary level code; it can only influence bounded gameplay fields and allowlisted StageRecipe selection.
- Deterministic remixes run without additional model requests and without changing scoring/hitbox random sequences.
- Both Meta actions require explicit consent; SAM is a separate opt-in.
- Static hosting artifacts exclude server files, SDKs, credentials and backend endpoints.
- Production release validation documented **96 passing tests**, mobile headless smoke tests, audio asset hash matches and blocked private file routes.
- Real private Android photo tests were conducted separately by the developer. The final video must show only genuinely recorded model outputs and masks; do not fabricate or substitute them.

## Known limitation and roadmap

The unrestricted public demo does not enable paid Muse/SAM inference because the current private Node adapter lacks production-grade judge authentication and durable quotas. This is deliberate to avoid abuse and unexpected billing. Future ideas include a securely rate-limited live mode and a date-seeded **Daily Chaos** shared challenge. Neither is claimed as shipped.

## Final submission gate

- [ ] Select best actual Muse/SAM capture (drawing if cutout works; otherwise apple-brush/car).
- [ ] Finish real <=180-second MP4 with original music and honest provenance badges.
- [ ] Upload video and check playback in a logged-out/incognito session; add working link above.
- [ ] Recheck public demo on Android and fresh desktop browser.
- [ ] Verify main README, build instructions, video source links, and third-party attribution.
- [ ] Open the acceptance-linked Cerebral Valley submission portal; accept/view any official rules.
- [ ] Fill the required entry fields according to the **actual** form and click Submit.
- [ ] Confirm submission receipt or dashboard status; save evidence of successful entry.
