# THING//MANIA — Three-minute hackathon demo production bible (v1)

**Status:** preproduction / shot list; not a rendered video. **Runtime:** 180.0 seconds max. **Master:** 1920×1080, 30 fps (16:9); preserve mobile gameplay at native aspect and frame it in the arcade cabinet with readable adjacent callouts. An optional 9:16 social teaser can be cut after submission.

## Thesis

**YOUR STUFF. OUR TERRIBLE IDEAS.**

Photograph an everyday object. Meta Muse Spark 1.3 interprets it as a ridiculous playable character (validated GamePlan); Meta SAM 3.1 provides a segmentation mask for a transparent sticker; an original Canvas arcade puts that character into three playable games and six procedural environments. A deterministic Stage Machine remixes worlds without further model calls. The local Chaos Report shares the result.

The film must clearly distinguish **private live Muse/SAM footage** from the **public offline Pages demo** (https://thing-mania.pages.dev/). No fabricated inference, fake UI, fake interactions, or claims of a public live AI endpoint.

## Shot-by-shot edit map

| Timeline | Purpose | Picture | On-screen callout / VO idea | Proof |
|---|---|---|---|---|
| 00:00–00:08 | Cold open / hook | 1 sec ordinary object, hard-cut to wrecking-ball impact, flying roof, ghosts, a split-second alien fry cook | “WHAT IF YOUR STUFF COULD PLAY?” / “Your stuff. Our terrible ideas.” | Real captured gameplay |
| 00:08–00:20 | Problem and invitation | Phone camera / local gallery → select real test photo; show object and phone together, no fake generative imagery | “One photo. Three games. Infinite bad decisions.” | Real phone recording |
| 00:20–00:36 | AI reveal | Explicit consent; SCAN THE SPECIMEN response with real object label and absurd role; ACTIVATE DIMENSION PORTAL SAM mask materializes | Small badge: “PRIVATE LIVE META MODEL API” and “Muse Spark 1.3 → GamePlan / SAM 3.1 → cutout.” | Private live capture, do not expose key |
| 00:36–01:02 | WRECK payoff | 3 sec anticipation, drag-and-release, impact freeze, roof/debris, full 2.48-sec ghost aftermath, result ticket. Allow funniest ghost to read. | “WRECK IT!” | Real win / test capture |
| 01:02–01:21 | One of the key innovations | REMIX THE CHAOS → paper-cutout assembly → Haunted House becomes Cursed Diner, soup can/burnt toast readable | “SAME CHARACTER. NEW WORLD. ZERO NEW API CALLS.” | Real recipe transition |
| 01:21–01:43 | Second playable mode | BEAM IT on night farm, then alien drive-through, UFO catch and fry-cook reaction; avoid too much menu footage | “BEAM IT!” | Captured live gameplay |
| 01:43–02:04 | Third playable mode | DODGE IT volcano and industrial meltdown; molten cogs and duck conveyor; near miss → survival / result | “DODGE IT!” | Captured live gameplay |
| 02:04–02:25 | Technical thesis / credibility | Fast clean architecture motion graphic built from actual labeled boxes, intercut GamePlan response and StageRecipe snippets | “Meta directs the character. Stage Machine assembles the chaos. Canvas makes it playable.” | Honest technical explanation |
| 02:25–02:41 | Outcome and social loop | Chaos Report: photo sticker, rank, worlds, scores, share action; show successful native share or fallback | “TURN EVERY OBJECT INTO A CHAOS REPORT.” | Real export |
| 02:41–02:47 | Roadmap stinger (optional) | A silhouette of rotating stage cards, calendar flip. It must be labelled *CONCEPT / COMING NEXT*. | “NEXT: DAILY CHAOS DROPS.” | Concept, not a working feature |
| 02:47–03:00 | Finish and action | Best 2-sec moments cut to original music's ending; title, URL, GitHub link; final 2 sec static readable frame | “THING//MANIA · PLAY NOW · thing-mania.pages.dev” and small “Public: offline arcade · Private: live Meta AI demo.” | Actual public URL |

**Edit priority:** The main proof is photo → Muse → SAM → transformed sprite playing. The climax is *the world reassembling without another model call*. Do not hide these behind a generic feature montage.

## Daily Chaos idea — very deliberately scoped

**Recommended now: 6-second concept teaser only.** The current release has **three** actual minigames, **six** environment sets and seeded remixes. It does **not** deliver a new minigame daily. Never say it does.

Future feasible small mechanic: “DAILY CHAOS,” a date-seeded *shared stage recipe + objective* rotating among the current games and worlds. All clients derive the same UTC date seed; no new inference needed. Add a shareable daily result and optional local streak later. That is a daily **challenge variant**, not a genuinely new minigame each day. Future new minigames are occasional releases. No backend leaderboard claims without implementation.

**Decision gate:** If recording and release tasks are incomplete by Nov 3, remove the teaser entirely. Working proof always beats roadmap.

## Capture manifests / footage naming

- `captures/01-cold-open-impact.mp4` – actual 2.48 s ghost aftermath, full visibility
- `captures/02-private-live-muse-sam.mp4` – genuine screen recording with consent and real result, redact private URLs/key/status
- `captures/03-haunted-to-diner.mp4` – full Stage Machine assembly, not edited into nonexistent effect
- `captures/04-beam-night-and-drive-through.mp4` – successful catch and fry-cook
- `captures/05-dodge-volcano-and-foundry.mp4` – readable hazard/near miss
- `captures/06-report-share.mp4` – real report and exported PNG
- `captures/07-offline-public-fresh-launch.mp4` – fresh mobile visit to production Pages URL
- `captures/08-explainer-assets/...` – statically rendered diagrams / overlays, truthful source labels
- `audio/` – originals from the approved DaemonV12 OST, not copyrighted reference soundtrack

Capture at native phone resolution, ideally 1080×2400 or available; screen recording 30/60 fps. Use cropped 16:9 editing layouts **without cropping gameplay hitboxes or critical UI**. Leave at least 2 sec for any action/result observers must read.

## Sound design and mix

Use ONLY the original DaemonV12 soundtrack: menu and main 36.2-s loops for underbed, and the 41-s demo mix for a segment with a real ending if it aligns in edit. Use approved project encodes/WAV, no third-party copyrighted music. Cut on 106.0773 BPM bar lines when possible (one bar = 2.2625 s). Add original in-game hit/portal/duck sounds at payoff; duck music during all spoken explanation and big effects. VO optional: a confident, lightly irreverent 45–65 seconds of actual exposition, not constant narration. No false claims of spatial audio, model performance, “zero latency,” or generated art not present in footage.

## Deliverables and gates

1. **Codex / technical producer:** Capture scripts, deterministic offline fixture route, reproducible 390×844 browser recordings, source-safe MP4 extraction or frames and no-source-change asset manifest. Collect actual private live footage manually; no automatic paid calls. Do NOT modify gameplay or deployment branch. No screenshots of .env, keys, personal Codespaces URLs, request headers or accounts.
2. **Opus / director and editor:** Build a cut-ready EDL/timeline from the actual clips, VO in voice or captions, title cards and original score. Edit an honest rough cut 180 sec max. No invented game scenes; can use typographic overlays over actual footage. Story beats: opening hook, real AI transformation, playable proof, modular world remixes, report, URL.
3. **Quality gates:** Legibility on phone at 50% size, demo file plays without audio gaps, no unlicensed samples, no misleading live endpoint assertion, captions readable, exact URL, transcript accurate, export 1080p MP4 with reasonable bitrate. Human preview before submission.
4. **Public site remains static offline** until secure durable auth/quotas for live API exist. Shipping video needn't imply paid public inference.

**Hard deadline:** Wednesday November 4, 2026 at 6:00 PM Pacific, per current competition timing. Aim for shareable rough cut Nov 2, final Nov 3; Nov 4 reserved for upload and any submission form corrections.

## Model/work allocation

- Codex first, narrow task: assets and timing. Stop after a documented capture pack. Reserve at least one reset for emergency fixes.
- Claude Opus first, creative task: soundtrack-aware edit and script from real clips. Reserve remaining use for one quality correction pass.
- Human: pick real photo clip, record Android gameplay and upload the final video yourself if tools cannot access the recording platform. Do not claim recording or upload until verified.

## Evidence requirements

The GitHub release notes validate the public offline Pages build, and the user has independently performed live Meta + SAM Android playtests. The video should show *actual* private live footage as evidence (not replay a synthetic fixture as “live”). Cite the correct Meta models in closing credits. Every source clip and render should be traceable to its capture/provenance, not just a narrative statement.
