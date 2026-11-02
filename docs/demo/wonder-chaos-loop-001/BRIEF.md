# THING//MANIA — WONDER CHAOS LOOP 001
**Owner-authorized creative test | Muse Wonder 1.0 | 2026-11-02**

## Mission

Prove a cost-effective, end-to-end *creative technologist* workflow by using **Muse Wonder 1.0** (one model as director, editor, coding agent and QA lead) to produce a polished, original, **seamlessly looping 15-second 9:16 YouTube Short** and a small derivative promo kit for THING//MANIA. Build the real deliverables. Do not stop at a treatment, storyboard or tool scaffolding. "S-tier" is a subjective owner goal, not an achieved rating.

The established game is at `thing-mania.pages.dev`; the repository contains actual offline fixture gameplay footage and captions in `docs/demo/`. Read `docs/demo/README.md`, `docs/demo/CHAOS_CUT_V2.md`, `docs/demo/DEMO_BIBLE.md`, `docs/demo/VALIDATION.md`, `docs/ost-integration.md`, `docs/RELEASE.md` and `public/audio/manifest.json` first. Source assets must be inspected before a creative choice.

This is a **social teaser**, distinct from the required hackathon submission demo. No altered game mechanics or public API exposure. Do not modify existing gameplay, hosting, main OST, release files, or private Meta connectors.

## Creative thesis

"YOUR STUFF. OUR TERRIBLE IDEAS." A chaotic paper-cutout arcade character arrives from an ordinary card, becomes the wrecking weight, an alien target and a frantic dodge survivor, then detonates into a Chaos Report whose framing geometrically and rhythmically reconnects to frame zero. Visual personality: tactile punchy flat animation, eccentric Halftone print, humorous props, controlled camera physics, editorial discipline—not generic AI imagery or dull screenshot slideshow.

Think of **one continuous stunt** across three environments rather than three unrelated landscape clips. The same *real source character* may be shown across all worlds only if the footage supports it. Use truthful editorial transition art, shadows, silhouettes and typography to bridge separate sources, not counterfeit gameplay or invented AI results.

Approved copy: "ONE THING. THREE BAD IDEAS." / "WRECK IT" / "BEAM IT" / "DODGE IT" / "THING//MANIA" / "YOUR STUFF. OUR TERRIBLE IDEAS." / "PLAY: thing-mania.pages.dev". The game currently has THREE minigames and SIX environments. Do not claim daily new games, public real-time AI, generated images, a leaderboard or live AI endpoints.

## Technical contract

- Hero: 1080 × 1920 pixels; 30 fps; exactly **450 video frames / 15.000 seconds**; H.264 MP4, yuv420p, AAC stereo, faststart. Master with source and reproducible render command; a smaller review proxy permitted but not instead of master.
- Music: prefer the *owner-approved Muse Wonder PUMP V1*, not PUMP V2, if the actual file is available in `/workspaces/daemonv12-wonder/renders/wonder-pump-v1/` or a provided verified location. DO NOT reconstruct or rename an unavailable audio file. If unavailable, use the repository's approved original THING//MANIA OST (and disclose it) or stop the music-dependent render with a clear blocker.
- At 128 BPM, exactly 8 4/4 bars is 15.000 s. Audition music phrase selection against the picture; create a sample-exact 15 s loop of PUMP V1 using a verified pre-roll/cycle approach, not a naive cutoff of ringing tails. No invented artist or copyright claims. Original-game sounds may be mixed in only from actual project sources.
- **Loop invariant:** the rendered artistic state at t=15s must match the state at t=0, with continuous pose/camera/scale/motion, not just similar opening and closing cards. Create a virtual end frame at frame 450 and compare it to frame 0. Evaluate frame 449 -> 0 velocity/position continuity, along with audio waveform seam and a *two-cycle* concatenated preview. If a perfect state loop isn't achievable, explicitly mark limitations rather than calling it seamless.
- Source-aware capture: Existing six 1920×1080 offline clips include a 390×844 portrait game within a landscape shell. Prefer a faithful portrait crop or newly deterministic browser capture of public static fixture, not stretching 1920×1080 to 9:16 or clipping game controls. Preserve full object/gameplay visibility. Use real game renders where practical. When compositing, editorial overlays must be distinguishable from actual game UI.
- Titles must survive normal phone viewing and Shorts safe areas (avoid extreme top/bottom and action-button side). Provide safe-area proof frame or montage and captions-readable-with-sound-off test.
- Do not call Meta image generation or SAM for the teaser without a separate explicitly authorized expense. Do not upload photos or personal media. Use actual repo audio/game art and original procedural motion graphics. Historical captured apple/hairbrush and jumbo car are NOT considered present unless actual source files are found and verified.
- Never falsely label offline fixture footage as `LIVE META AI`. Where provenance appears in the social video, small legible labels are permitted: `OFFLINE GAMEPLAY` for fixture; `PRIVATE LIVE META DEMO` only for real owner-recorded proof. Any high-stakes footage for the longer judge demo must show genuine Model API behavior.
- This is a promo experiment, not the hackathon submission video; no changes to the public production site and no automatic upload to YouTube or other platforms.

## Suggested 15s beat map (creative guideline; change if better)

00:00–00:02 — One object/sticker appears with a distinctive 1-frame-on-beat character reveal. Immediate curiosity.
00:02–00:05 — Big WRECK impact and playful physical aftermath.
00:05–00:08 — BEAM abduction with unexpected stage transition.
00:08–00:11 — DODGE escape, synced footwork/hazards.
00:11–00:13.5 — Chaos Report character punchline and brand.
00:13.5–00:15 — Portal / card re-entry that causes the *same first image/pose* at t=15s, without visual or musical click.

Show a clear game truth within the first few seconds. Visual scenes should cut *on meaningful musical events*, not indiscriminate eighth-note flashes. At least one stretch of >1 second should be readable instead of continuous cuts.

## Derivative deliverables (only after primary hero works)

1. `CHAOS-LOOP-15S.mp4` at 1080x1920 / 30 fps / 15.000s.
2. `CHAOS-LOOP-6S.mp4`, a self-contained six-second teaser extracted/reframed from the same visual system (no new animated production).
3. `CHAOS-POSTER-9x16.png` 1080x1920 and `CHAOS-FEED-4x5.png` 1080x1350, native text and key artwork, with the actual public URL.
4. `CHAOS-THUMBNAIL.png` portrait, clean enough to be visible at phone size.
5. `publish-copy.md`: 3 sharply distinct YouTube titles (short), description + attribution, 2 social captions with real call-to-action and one-sentence game pitch. Do not promise unshipped features.
6. `edit-project/`: editable source with one-command local rebuild; `qa.md`, `provenance.json`, `cost-ledger.md`, file hashes. No credentials, personal clips or huge cache in Git.

Output location: `docs/demo/wonder-chaos-loop-001/output/` (ignored) or clearly documented equivalent. Keep source code separate. Existing music masters, user footage and approved captures untouched.

## Performance and quality gates

- Show all render and ffprobe commands, actual codec, dimensions, fps, sample counts, output frame count, video/audio length, peak and gap checks.
- Verify a clean two-cycle preview and inspect start/end and at least five keyframe screenshots (0, impact, beam, dodge, loop seam); if tools can inspect images, inspect them visually and report what was genuinely seen.
- Confirm copyright/provenance: only original user-owned/hackathon sources and created work; asset licenses tracked; no unexplained downloaded media or stock.
- Check mobile text sizes, contrast, approximate safe margins, flash/strobe and reduced-motion concerns, and that gameplay effects aren't drowned out by music.
- Don't say `watched` or `listened` if the agent's environment cannot do so.
- If final quality is limited by unavailable source footage, ship the **best honest version**, list exactly which shots are unavailable and what owner action is needed. Do not block after planning.

## Scope, speed and owner decisions

- ONE creative concept, one lower-res proof render, and at most ONE focused revision to the hero before full-res render. No deep engine rewrites, no platform migrations, no automatic Meta calls to generate extra images or sound, no touching `game.js`, `music.js`, `server.js` or production files.
- Work on this isolated experiment branch. Do not deploy or publish anything without owner approval.
- Tool/rendering compute costs are **separate** from model API cost.
- Stop after completing deliverables, report absolute local paths, actual media files (not promises) and the next owner review action.
