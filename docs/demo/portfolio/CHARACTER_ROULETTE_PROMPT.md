# CHARACTER ROULETTE — Muse Wonder Max portfolio short

**Mission:** Produce a genuine, attention-grabbing **15-second 9:16 social video** using the existing THING//MANIA gameplay recordings and original PUMP music. This is a **separate portfolio asset**, not an update to the submitted hackathon film.

## Context and inputs
- Repository `mataindustries/thing-mania`, branch `feat/portfolio-character-roulette`.
- Existing real recordings (private, untracked) and the music are inside `docs/demo/android/`. **Inventory actual filenames** with find and ffprobe; don't assume previous filenames. The soundtrack may be called `PUMP-FINAL.mp3` or a renamed pump file.
- Read `docs/demo/CHAOS_CUT_V2.md`, `docs/demo/assembly/OPUS_HANDOFF.md`, and available Wonder edit scripts for existing layout, provenance and captions. The submission film is a reference only; use original source recordings where possible.
- Subjects: child's original drawing, bizarre apple-hairbrush hybrid, oversized maroon car. Visually identify each source from contact sheets. Use only actual recorded gameplay/Meta outputs, not invented frames, masks or character swaps.

## Creative brief
Theme: **THREE CHARACTERS. ZERO GOOD DECISIONS.**
Style: hyper-snappy, premium, funny, crisp, mobile-first *not* a reduced 16:9 trailer. The first 1.0 seconds must hook a scroller. Make each character recognizable and use game-action match cuts. Preserve punchlines long enough to register.

Indicative 15-second sequence, optimize after reviewing the actual footage:
- 0.0–1.5: immediate strongest real action/smash + text `WHAT EVEN IS THIS?`
- 1.5–4.5: drawing → its genuine materialized character → one real gameplay payoff
- 4.5–7.5: apple-hairbrush → actual cutout/gameplay with an amusing rhythmic swap
- 7.5–10.5: jumbo car → absurd WRECK/BEAM payoff
- 10.5–13.0: three-character roulette, quick true gameplay glimpses and a REAL stage remix
- 13.0–15.0: satisfying ending/CTA: `THING//MANIA` and `thing-mania.pages.dev`
Use original identity text only if readable and honestly from that specimen. Avoid implying public live API access.

## Audio and visual rules
- **Use only the original user-supplied PUMP music**, analyze beats/transients. Respect its existing groove, use intentional music cuts/crossfades, and incorporate only already licensed/in-game SFX, with ducking so the mix stays clean. Do not add a random bell.
- 1080×1920 portrait, 30 fps, H.264 yuv420p + AAC. Exact target 15.0s; no more than 15.5s. Vertical source footage should fill the frame (crop out browser bars, private URLs and personal details while preserving characters and gameplay). Avoid unreadable tiny composites.
- Prioritize polished timing and clear character recognition over excessive particles or overlays. No fake model results, fabricated gameplay, or new copyrighted music.
- Keep source audio/video originals, V1/V2 hackathon MP4 and public Cloudflare deploy untouched. Never trigger additional Muse/SAM image inference or change game code.
- If the child's drawing contains identifying school/name details, crop/redact them; do not include child's name or face in marketing.
- Clearly represent the public site as an **offline fixture arcade**; do not claim visitors can upload images and invoke live models on the public site.

## Production and budget gates
1. Inspect source clips with ffprobe and sparse contact sheets; locate best 2–4 second selects for each actual character.
2. Write a small EDL with source file/timecode for every shot, including audio cues and provenance.
3. Make a LOW-COST 540×960 timing proxy before the master, and check its first frame, all three characters and closing card. Only **one full 1080×1920 export**, plus a narrowly justified targeted repair if needed.
4. Listen to audio if possible; otherwise give numerical QC without claiming to have heard it. Verify no loudness/clipping/black-frame issues, exact duration, final readable URL and no private testing URL.
5. Save **`docs/demo/android/portfolio/CHARACTER_ROULETTE_V1.mp4`** (ignored local output, not committed). Save proxy, source inventory and run log alongside it.
6. Commit only scripts, EDL and brief notes under `docs/demo/portfolio/character-roulette/`. Do NOT commit private recordings or large rendered videos.
7. Finish with exact output path, ffprobe summary, SHA256, any limitations and concise Android retrieval instructions.

**Stop after the first validated preview** so the owner can judge it. Do NOT make Endless Chaos or the case study in this run; do not spend time on future benchmarks.
