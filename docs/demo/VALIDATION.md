# Delivery validation

Six clips delivered, 1878 total frames / 62.6 seconds of actual source footage:

| World | Game | Frames | Duration at 30 fps |
|---|---|---:|---:|
| Haunted House | WRECK | 223 | 7.433333 s |
| Cursed Diner | WRECK | 223 | 7.433333 s |
| Alien Drive-Through | BEAM | 213 | 7.100000 s |
| Night Farm | BEAM | 213 | 7.100000 s |
| Volcano | DODGE | 503 | 16.766667 s |
| Industrial Meltdown | DODGE | 503 | 16.766667 s |

`tools/validate.py` passed: six distinct worlds, six input-driven wins, output
hashes, exact frame counts, constant 30 fps, 1920×1080 H.264, silent single video
stream, complete ffmpeg decode, and 5400-frame / 180-second editorial map.
Scene transitions and source timecodes are in manifests/source-clips.csv. The
source clips are shorter than the final edit: owner footage, diagrams, stills,
intercuts and readable holds fill the planned timeline; no finished film claimed.

Visual inspection: Haunted House impact/ghost aftermath, Industrial Meltdown
Chaos Report with three won rounds and score, and both rasterized architecture
diagrams. The editorial header charset artifact has a supplied opaque-strip
replacement overlay; use it in the edit. No expensive full recapture was made.

Gameplay JavaScript hashes match the actual public arcade. Public CSS matches
the repository plus the release builder's consent-hidden rule. Capture framing
and instrumentation are local and documented. Syntax checks pass for both Node
tools; Python tools compile. No gameplay/deployment files modified. No paid API
calls, credentials, fake inference responses or fabricated SAM masks.

Owner inputs still pending: genuine object/phone recording, private live Muse +
SAM demonstration, native Android sharing proof, actual audio/voice edit and final
human review/export. These pending slots are explicit in the timecoded edit map.
