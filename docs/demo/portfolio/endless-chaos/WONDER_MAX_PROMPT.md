# Muse Wonder Max — ENDLESS CHAOS / Seamless Loop Challenge

**Portfolio project #2.** Make **one genuinely seamless audiovisual loop** built from the three authentic THING//MANIA character captures. The previous **Character Roulette V1 is approved/LOCKED** and must not be edited or overwritten. Work only on `feat/portfolio-endless-chaos`; do not change the public game, submitted hackathon video, or deployment.

**Top concept:** **“THE END IS THE NEXT IMPACT.”** The impossible chain: a real gameplay smash leads into an editorial shockwave that reveals another genuinely recorded character, then another, then folds back into the **identical opening impact**. Each change must be an editorial match cut from recorded source gameplay—never invent an in-game mechanic, synthetic SAM cutout, AI output, or character interaction that did not occur.

## Inspect first
- Read `docs/demo/portfolio/CHARACTER_ROULETTE_V1_LOCK.md`, `docs/demo/portfolio/CHARACTER_ROULETTE_PROMPT.md`, `docs/demo/CHAOS_CUT_V2.md`, source manifests and the past Wonder edit scripts.
- Enumerate (do not assume filenames) `docs/demo/android/` real phone recordings, `docs/demo/android/portfolio/` approved V1, and the original **PUMP-FINAL.mp3** (or whichever verified PUMP master was used in Character Roulette).
- Use actual frame/contact sheets to identify the **child's drawing, apple-hairbrush and jumbo car** and select authentic action/impact footage. If a drawing never successfully segmented, do not claim or fabricate a SAM result. Protect identifying details.
- ffprobe all media. No expensive inference or video generation, no new gameplay or model calls.

## Artistic target
- **6–8 seconds preferred** (at most 10s if real musical phrase structure demands it), **1080×1920 portrait, 30fps**, H.264 yuv420p + AAC.
- Choose final duration as a **whole musical phrase / integer beat grid**, based on analysis of *the supplied original PUMP track*, not an arbitrary video end. Beat grid and exact number of video frames/audio samples must be documented. If a 4-bar phrase falls inside 6–8 s, use it.
- Three distinguishable character beats within the cycle: e.g., drawing impact → apple creature scramble → enormous car destruction → final smash or ripple resets back to the same opening contact. Character recognition and action are more important than maximizing cuts. Do not cram all six worlds into this loop.
- **The loop boundary should be invisible and unheard.** The final image/motion should transition intentionally into the opening without a title card or fade to black. Make impact-flash, match-motion, or real-source whip pan conceal the cut, using editorial effects only. No random bell, abrupt fade or silence.
- Keep game readable at native phone scale. Hide phone navigation, private Codespaces URLs, live API keys, names/school details, and unrelated overlays. No claim the public release supports live paid photo inference.
- Original PUMP is the only soundtrack. Preserve its identity; avoid MP3 encoder-padding by decoding to PCM, picking a beat-aligned segment, and generating the loop master from sample-aligned PCM. Add only genuinely licensed, existing game SFX if they demonstrably improve the loop and do not click across the boundary.
- No big outro/CTA; a **small, persistent** `THING//MANIA` corner mark is acceptable but optional. This is an ambient/replayable vertical loop, not an advert with a beginning and end.

## Technical gate — PROVE THE LOOP

1. Produce a concise timeline and a small `SEAM_DESIGN.md` describing precisely how the last event returns into the first, including audio bar/beat position.
2. Render **one low-res 540×960 3× playback** before the final master to inspect two loop boundaries and confirm rhythm continuity; short diagnostic only, not three full production renders.
3. Use real frame comparisons/contact sheets across the seam at -5,-2,-1,0,+1,+2,+5 frames (relative to boundary). Quantify first/last image differences/optical discontinuity where meaningful and inspect visually; don't declare 'seamless' just because the image is similar.
4. Decode rendered audio and check last/first sample discontinuity, 10ms/50ms RMS, beat timing and click audibility; use sample-domain overlap only where necessary. Test headphone/phone mono and no clipping. 30fps fixed exact frame count.
5. If it isn't genuinely convincing, **make one focused seam correction** before exporting the 1080×1920 master. If still not seamless, label as a **loop candidate** with specific known defect; don't misrepresent QA.
6. Save:
   - `docs/demo/android/portfolio/ENDLESS_CHAOS_V1.mp4` (loop master, gitignored)
   - `docs/demo/android/portfolio/ENDLESS_CHAOS_3X_REVIEW.mp4` (small review showing 3 repeats)
   - `docs/demo/portfolio/endless-chaos/SEAM_DESIGN.md`, `EDIT_DECISIONS.csv`, `QA.md`, and reproducible render script.
   - A SHA256, actual final duration, resolution, audio and number of video frames.
7. Commit **only** small source scripts and documents to `feat/portfolio-endless-chaos`; do not commit personal recordings, MP3 or MP4 masters. Stay inside the assigned branch.
8. **Stop after delivering V1** for owner approval. Do not make the case study, more marketing clips, DaemonV12 benchmarks, or any new full-song experiments in this run.

**Budget discipline:** One low-res diagnostic and at most **one full-resolution master**, with a single narrowly justified repair if QA detects a reproducible defect. Spend reasoning on the *creative cycle/loop seam* and careful sound design rather than broad exploration.

**Success test:** A viewer watches three back-to-back repeats without perceiving where the loop begins or ends. The three characters are recognizable, original gameplay stays genuine, and the PUMP track keeps moving.
