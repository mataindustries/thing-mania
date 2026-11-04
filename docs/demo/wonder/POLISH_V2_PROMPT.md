# THING//MANIA — Wonder Max final S-tier polish (submission lock)

You are Muse Wonder 1.0 in Max reasoning mode, running as an expert film finishing editor, audio mixer and QA engineer. You have a strong **approved V1**. Your mission is **one surgical polish pass** and a real, playable V2. Deadline: **Wednesday 2026-11-04 at 18:00 America/Los_Angeles**. The entry is NOT submitted yet. Do not spend time planning another trailer or doing unrelated benchmark/marketing work.

## Sources

- **Approved film / immutable fallback**: `docs/demo/android/final-cut/THING_MANIA_FINAL_CUT.mp4` (about 2:43.47, 1080p/30 fps). Preserve byte-for-byte.
- **Original music / immutable**: `docs/demo/android/PUMP-FINAL.mp3`. Preserve musical identity and existing successful sync.
- **Real user-recorded source captures**: inspect actual media within `docs/demo/android/` (identify which character is present by frames, never by guessing filename).
- Existing `docs/demo/wonder/` editorial project, scripts, and any prior render manifests, `docs/demo/assembly/` assets and architecture/caption graphics. Reuse them; first locate the existing V1 editing script rather than rebuild from scratch.
- Review actual V1 frames at 0–10s, 15–32s, WRECK, REMIX, BEAM, DODGE, closing 15s.

## Mandatory edits — no creative reimagining

1. **Make the three character transformations and game actions more legible**: selectively scale/crop portrait phone video in the 16:9 canvas when the sprite is too small, roughly 1.2–1.35× as fits. Never crop away the object, vital input UI, score, portal, or action. Be selective—preserve shots already framed well. Do not digitally insert the wrong character into a scene.
2. **Emphasize the REAL SAM reveal**: preserve readable Muse output and the genuine segmentation/materialization, then cut on a strong musical beat into the character's *actual* corresponding gameplay. Avoid falsified model calls, output or masks; don't invent a new portal.
3. **Three precise, tasteful effects accents** if original licensed game sounds already exist: portal emergence, haunted-house smash, and final title-card ding. Duck PUMP music slightly and briefly under each, avoid clipping; if no suitable safe sounds exist, leave music intact rather than waste time on synthesis.
4. Keep real footage of child's drawing, apple-brush, and jumbo car, each recognizable. Retain accurate provenance distinctions: PUBLIC OFFLINE arcade vs PRIVATE LIVE Meta API. No invented daily-game feature, backend public inference, or unsupported model capabilities.
5. Preserve existing strong scene order, overall tone, original PUMP groove, and final `https://thing-mania.pages.dev/` card. No new title sequence, unrelated effects, video generation, inference or gameplay modifications.
6. Protect private Codespaces URLs, credentials and identifying child's information.

## Delivery and tight budget

- **Do not overwrite V1.** Output `docs/demo/android/final-cut/THING_MANIA_FINAL_CUT_V2.mp4`. All big files / raw owner videos stay gitignored.
- Prefer an edit of the existing reproducible V1 timeline, not transcoding a new film from scratch unless required for selective edits.
- Inspect actual footage/EDL first; implement focused adjustments; **one complete V2 render**, followed only by targeted necessary corrections. Do not loop on subjective tweaks.
- Output 1920×1080, 30fps, H.264 + AAC stereo, max **180 seconds**.
- Validate with ffprobe; sample before/after frames and listen or check sections for audio clipping and sync. Check 1080p text legibility, safe margins, no unintended black gaps, closing title held long enough to read, and correct video source labels. State what was checked; don't claim listening if only numerical analysis is available.
- Write `docs/demo/wonder/POLISH_V2_QA.md` with changed scene timecodes, actual QA, output path and SHA256, and a one-line **V1 vs V2** tradeoff. Commit only editing code and small documents if safe; no commit is required to deliver the MP4.
- If you cannot safely change an existing scene or find a sound effect, **keep the V1 version of that scene**, and document the limitation. V1 remains the approved fallback.

**STOP when V2 has rendered, been verified and its exact file path reported. Do not proceed to DaemonV12, marketing loops, benchmark campaigns, or submission form. Submission is the owner's immediate next step.**
