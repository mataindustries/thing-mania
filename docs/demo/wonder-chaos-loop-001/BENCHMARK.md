# THING//MANIA Wonder creative-production benchmark

## Purpose
Compare **Muse Wonder 1.0 High** with the user's earlier **Claude Opus** production workflow on identical outcome categories, **not** on cross-task or cross-brief headline numbers. Record actual time, model costs, compute costs, revisions and owner preference.

## Cost model (published Meta Model API standard mode, verify on billing)
- Muse Wonder 1.0: input $4.00 per 1M tokens, cached input $0.20 per 1M tokens, output (including reasoning, if metered as output) $20.00 per 1M tokens.
- Estimated billed model cost = (noncached_input_tokens × 4 + cached_input_tokens × 0.2 + output_tokens × 20)/1,000,000 USD. Confirm response and dashboard accounting; **do not** double count cached input.
- Spending ceiling for this creative pilot: **$10 of Meta credits** (planning threshold, not a hard provider limit). If token counters unavailable, record opening/closing dashboard balance and acknowledge other simultaneous activity. Do not assume credits are the same as cash expense.
- Record Codex CLI version, model ID, reasoning effort, API provider, start/end timestamp, tools installed, render CPU wall time, any GitHub Codespaces compute/storage impact. Don't record API keys, cookies, credentials, raw request headers, or user photos in logs.
- Opening paid balance ______ / closing paid balance ______; observed delta ______, confidence ______
- Input tokens ______; cached input tokens ______; output tokens ______; source ______
- Estimated API cost ______; source and margin for error ______
- Codespaces compute/storage ______; human work minutes ______; failed attempts ______

## Scope to evaluate
1. Concept quality and originality (0–10)
2. Visual/camera/motion art direction (0–10)
3. Hook in first 2 seconds (0–10)
4. Motion-to-music sync (0–10)
5. Seamless two-cycle loop (technical pass/fail + owner preference)
6. Mobile readability and conversion (0–10)
7. Real-game authenticity and asset provenance (pass/fail)
8. Production QA and actual editable exports (pass/fail)
9. Cost per *approved* deliverable, number of owner correction cycles, model generations, elapsed active time.
10. Producer preference: Wonder output vs prior Opus output, compared on similar constraints when possible.

**The user is the creative judge.** Never manufacture numeric scores or claim an S-tier result without listening/viewing. Preserve initial reviewer notes and approved/rejected status.

## Short report (fill with data after the run)
| Measure | Muse Wonder |
|---|---|
| Final hero MP4 verified? | |
| 6s cut verified? | |
| Poster/feed/thumbnail verified? | |
| Source/video reproduction command | |
| Model token and credit source | |
| API model cost | |
| Codespace wall/CPU time | |
| Revisions and attempts | |
| Owner rating and feedback | |
| Opus reference comparator and limitations | |

## Task completion
Deliver one polished short and a usable derivative promo kit first. If the output can't be rendered in the actual Codespace, identify precise missing executable/media and return the best working editable artifacts. No claims of completed files without checking their bytes.
