# THING//MANIA — MUSE WONDER MAX FINAL EDIT

You are the creative director, trailer editor, sound designer, and finishing engineer for the Meta Global AI Hackathon submission. Use the configured Muse Wonder model at Max reasoning. **Produce a real, watchable film, not another plan.**

Repository: mataindustries/thing-mania
Branch: feat/wonder-chaos-cut
Deadline: November 4, 2026, 6:00 PM Pacific. Prioritize a complete video over optional extras.

## Inspect the actual assets before editing

- Read docs/demo/CHAOS_CUT_V2.md and docs/demo/assembly/OPUS_HANDOFF.md; inspect existing capture manifests and proof reel.
- Owner recordings reside in docs/demo/android/ as three MP4s with date-stamped names (e.g. 2026_11_03_*.mp4). DO NOT assume which character is in which file: identify each by contact sheets/visual inspection. These are authentic private live Muse/SAM captures.
- Approved new soundtrack: **docs/demo/android/PUMP-FINAL.mp3**. Prefer this over WONDER-LATEST or AC-01. Probe its exact length/accents and edit it to fit rather than blindly repeating a 30-second MP3.
- Also inspect the existing docs/demo/assembly/PROOF_REEL.mp4 and six captured offline-fixture gameplay clips. Use them only with correct provenance.
- If needed, use repo's game/Stage Machine code solely to verify the shown architecture. No gameplay modifications or inference calls.

## Film concept

**YOUR STUFF. OUR TERRIBLE IDEAS.**
Three real tested characters — a child's drawing, bizarre apple-hairbrush hybrid, and oversized car — take turns inside an increasingly chaotic arcade. Favor whichever capture has the clearest genuine model-to-SAM-to-game transformation as the first hero. Use rhythmic roulette cuts between all three for comedy, and continuity shots when possible.

Within the first 20–30 seconds show an actual Meta interpretation, real SAM segmentation/portal reveal, then real gameplay. Do not fabricate results. The arc:
1. 0–8 s: strongest genuine gameplay payoff as cold open; a funny character surprise.
2. 8–32 s: one real source image → Muse-generated identity → SAM materialization, readable and sourced.
3. WRECK IT: impactful smash, flying pieces, ghosts' FULL aftermath.
4. REMIX THE CHAOS: show an entire Stage Machine assembly to a second world and state no additional model call.
5. Rapidly intercut three *actual* characters across gameplay where recorded. Use character-specific wipe, match-cut, and freeze-frame gag — never digitally insert a character into an unrecorded scene as if real.
6. BEAM IT: alien saucer catch, fry-cook reaction; DODGE IT: volcano and Industrial Meltdown.
7. Clear 10–18 s technical proof: Meta Muse Spark 1.3 → schema-validated GamePlan; Meta SAM 3.1 → transparent sprite; deterministic Stage Machine → six compatible worlds; Canvas gameplay. Distinguish private live model testing from the public fixture-based arcade.
8. Actual Chaos Report and export, then musical-end title: THING//MANIA · https://thing-mania.pages.dev/ .

## Sound and layout

- Master: 1920×1080, 30 fps, H.264/AAC, max 180 seconds. Aim 150–175 if the story is stronger shorter.
- Original **PUMP-FINAL.mp3** is the musical backbone. Detect its beat accents and breakdown, arrange transitions musically (phrase-aligned cuts, looping/crossfades where needed). Make portal/smash effects audible, and provide a deliberate closing musical cadence. No third-party music.
- Portrait gameplay should be LARGE, legible, and art-directed within landscape layouts; safe title margins, concise high-contrast captions, readable on phone.
- Remove browser URLs, notifications and identifying information from the child drawing. Protect private Codespaces location and credentials.
- The public Cloudflare site is OFFLINE FIXTURES; it does not offer public live inference. Label private live Meta API clips clearly. Do not show a mock interaction as live Meta footage.
- No invented Daily Chaos mechanic. Do not change the public site.

## Workflow and resources

1. Inventory media with ffprobe, sample key frames/contact sheets, and verify owner clips actually contain the scenes you plan to show.
2. Write a concise timecoded EDL + source provenance map and caption/VO script.
3. Make a short technical diagnostic to test portrait framing, fonts, audio; then ONE complete edit render. Avoid expensive rerender loops.
4. Inspect the complete output via sampled frames and audio QC. Apply only necessary targeted repairs.
5. Verify MP4 codec/duration, no blank frames or abrupt audio, readable contact sheets, soundtrack sync, private data masking, and final URL.
6. Output final MP4 and any large intermediate media only in **docs/demo/android/final-cut/** (gitignored). Commit source scripts and small editorial documents under **docs/demo/wonder/**, not personal footage or video masters.
7. Finish with exact MP4 path, duration, QA findings, checksum, and minimal upload/submission instructions. Do not just give a report without rendering. If an essential clip is missing, clearly identify it and make the strongest honest cut possible.

**Absolute priority:** deliver a finished, judge-ready movie in this session. No new game features, no paid Meta/SAM gameplay calls, no separate benchmark tests or marketing assets until after this video is submitted.
