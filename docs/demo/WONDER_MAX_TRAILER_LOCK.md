# Muse Wonder MAX — final trailer rebuild (2026-11-03)

**Objective:** produce one genuinely compelling 100–150 second submission trailer, maximum 180 seconds, by Nov 4 6 PM Pacific. No feature expansion. Build from real game/source assets and original owner media.

## Current factual footage inventory

- The owner has a **58.33s vertical 720x1612 H.264 screen recording** with custom character/gameplay, but it reportedly **misses the portal activation/reveal**. This file is not yet verified inside this GitHub branch; owner must import into `docs/demo/android/`. Do not assume it is present.
- A **15s 1080x1920 H.264/AAC stylized looping video** was previously made with Wonder High. It may provide a visual motif, but it is not sufficient proof of the game/Meta integration. Do not use its graphics as fake gameplay.
- Six 1920×1080/30 offline gameplay captures, genuine fixture-based, exist in `docs/demo/captures/`; proof reel in `docs/demo/assembly/PROOF_REEL.mp4`. Preserve offline labels and do not pretend they contain the custom SAM sprite.
- The user prefers a newer original **PUMP** soundtrack, *not* the earlier AC-01 OST. The audio filename is not assumed. The editor MUST discover the actual uploaded file in `docs/demo/android/` and verify it with ffprobe; do not substitute `WONDER-LATEST.mp3` or DaemonV12 automatically if newer PUMP supplied. No soundtrack replacement in the deployed public game before submission.
- Owner may make one brief additional **real private Meta/SAM portal recording** with local backend. If this exists, use it, label PRIVATE LIVE, and redact private URLs/credentials.

## Required story and edit

1. **0:00–0:10 | Unmistakable hook.** Actual child drawing/custom character (with no identifying info) launches into WRECK or an equally absurd game payoff. Typography “YOUR STUFF. OUR TERRIBLE IDEAS.” One bold original PUMP accent.
2. **0:10–0:30 | It really works.** Actual private live footage of image selection, explicit consent, real Muse Spark 1.3 label/role, optional real SAM click and portal (only if recorded), actual extracted sprite. Cut waiting time transparently; never synthesize an inference screen, mask or success.
3. **0:30–1:03 | Playable, surprising chaos.** Real WRECK impact and entire ghost escape, then a truthful REMIX visual transition to Cursed Diner. Emphasize “SAME THING. NEW WORLD. ZERO NEW MODEL CALLS.”
4. **1:03–1:34 | Three games / six worlds.** Night Farm & Alien Drive-Through BEAM catch, Volcano & Industrial Meltdown DODGE near miss, 0.5s visual punch-ins on six actual environment variants. Keep portrait game readable within 16:9 editorial framing.
5. **1:34–1:55 | Show the engineering without losing energy.** 5–8 sec factual Muse GamePlan → SAM mask → Canvas/Stage Machine diagram; demonstrate existing StageRecipes as combinations of safe presets. Shareable Chaos Report (real exported result).
6. **1:55–2:15 | Payoff / title.** A final quick escalation with oversized-car live capture only if available, original PUMP ending or musical edit, final title and https://thing-mania.pages.dev/ for >=3 sec. Text must explain public demo uses offline fixtures; private live footage shows Meta integration.

**Runtime flexibility:** 120–150 seconds is preferred if it keeps momentum; never pad to exactly 180. Prefer 16:9 1920x1080 30fps H.264/AAC for judge submission. Portrait clips maintain correct proportions, surrounded by character art and terse functional captions. Avoid tiny illegible portrait captures in a vast frame; punch-in/editorial zoom selectively while respecting source UI and provenance. Strong transitions should be motivated by in-game actions, not generic neon fly-throughs.

## Technical and compliance gates

- Review source clips and ffprobe durations first. **No full export if actual input recording or soundtrack is missing**; return a specific missing-files report with local destination names.
- One test **first 15–20 seconds** at final quality, inspect rendered frames and audible mix; if owner approves, encode one full master. No endless render loops.
- Put final output under `docs/demo/wonder/`, but keep large MP4 and private source clips Git-ignored. Commit only source scripts, EDL, QA and small illustrative artifacts after checking no personal information.
- Retain source provenance: PUBLIC OFFLINE GAME versus PRIVATE LIVE META MODEL API, clearly labeled. Do not imply public AI uploads available or that a daily mechanic is shipped.
- Original music only. Music sync should follow real measured beats, not invented BPM. Normalize/duck to keep VO, impact and portal intelligible. Preserve first-person evidence where source has sound.
- Verify 30fps CFR, duration <=180, 1080p output, audio/no clipping, no black frames, correct URL, readable on Android, manual review.
- If portal footage remains absent after one planned targeted session, don't fake it. Explain separate SAM step with a factual title and show the genuine resulting sticker; move forward with working proof.
- Stop once a real MP4 passes QA, and submit before the deadline. Output video link and precise submission handoff.
