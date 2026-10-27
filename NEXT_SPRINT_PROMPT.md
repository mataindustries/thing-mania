# Next sprint — Meta integration, without wasting credits

This is a follow-up task, **not** an implementation that exists in v0.2.

```text
Project: THING//MANIA, Meta Global AI Developer Hackathon — Indie track.
Read README.md, HACKATHON_CHANGELOG.md and QA_REPORT.md. This is new hackathon code only.

SCOPE: Add a secure, real Meta Muse Spark scene interpretation bridge to the current working 3-round game, while keeping gameplay deterministic and fully playable if the model is unavailable. DO NOT rewrite the arcade, import existing personal codebases or use AI-generated executable JavaScript.

STEP 1 (no billable API calls):
- Define a small JSON GamePlan schema for a photo: detected object choices, one chosen object, whimsical object role/description, 3 context-aware announcer lines, difficulty/pace within numeric bounds and safely selected variations for the current haunted-house, UFO and volcano mechanics.
- Add offline fixtures, validity checks, reject hallucinated object references and unsafe/unbounded content, and unit tests including malformed responses, timeout and empty object lists.
- Add a backend request proxy; keep the Meta key strictly server-side and outside git. No photo is uploaded without explicit user action and notice.
- Add strict per-session call limits and spend accounting (application-level hard stop); cache by content hash and plan version to avoid reusing credits for repeat gameplay. Never claim billing notifications are spend caps.
- Explain the schema and data flow in docs. Stop here for review.

STEP 2 (only after provider access confirmed and review):
- Wire the documented Muse Spark Model API model/endpoint actually available on this account, and validate real returned JSON against GamePlan. Log real model identifier, token counts, latency, cost and output validity. Budget first tests to at most $1 total; request explicit go-ahead before larger testing.
- Have different photos produce different announcer lines and bounded game parameters while retaining the three playable modes.
- Do not claim SAM background removal until separately implemented and demonstrated with a transparent mask and failure fallback.

DELIVER: focused commits, exact run/build commands, passing tests, local fallback still working, and screenshots of one real model-personalized session with sensitive metadata hidden.
```

First priority is to keep v0.2 mechanically fun and demonstrate a real model-dependent difference on two user-owned photos. Segmentation is a later, separately validated milestone.
