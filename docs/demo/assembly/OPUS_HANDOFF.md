# Opus finishing handoff — Chaos Cut V2

## Use immediately

**PROOF_REEL.mp4** is the delivered 52.633-second, 1920×1080/30fps H.264/AAC
preview. It is a proof reel, not the final 180-second competition film. Six
unchanged existing recordings supply every gameplay frame; no recapture, new
model calls, fake scoring, transformations or masks. The only new picture
operations are cuts, replacement editorial provenance text, and the requested
six-second typographic end card over a held existing source frame.

| Reel TC (30 fps, end exclusive) | Content |
|---|---|
| 00:00:00:00–00:00:05:02 | WRECK launch/contact, FULL ghost aftermath and ticket |
| 00:00:05:02–00:00:12:15 | Cursed Diner assembly and payoff |
| 00:00:12:15–00:00:17:07 | Night Farm catches and victory |
| 00:00:17:07–00:00:24:10 | Alien Drive-Through assembly, catch/reaction |
| 00:00:24:10–00:00:29:26 | Volcano hazards and survival |
| 00:00:29:26–00:00:44:15 | Industrial Meltdown assembly, survival and result |
| 00:00:44:15–00:00:46:19 | Actual Chaos Report reveal |
| 00:00:46:19–00:00:52:19 | Title + https://thing-mania.pages.dev/ |

`highlight-selects.csv` gives exact source frames, reel frames, source SHA-256
and provenance. All cuts are normal speed. Source frame 80→159 of Haunted House
contains the full impact freeze/2.48-second ghost aftermath; it is preserved
inside the opening select 71→223. The fixture has the default illustration, NOT
an apple or SAM sprite. The in-game cabinet “LIVE” lamp denotes play, not live AI;
the large OFFLINE provenance badge makes source type explicit. Existing source
UI says MUSIC OFF; the approved soundtrack is added editorially, not captured game
audio. No real gameplay SFX or voice is present in these silent source recordings.

`final-film-edl.csv` is the V2 5400-frame/180-second EDIT PLAN, not a rendered
film. It reserves genuine apple/car processing slots. Use existing architecture
PNGs/SVGs in ../graphics, fixture-labelled excerpts, and original source clips
when building the final creative cut. Do not stretch short clips to occupy long
EDL slots. Intercut honest diagrams, real owner footage and readable holds.

## Soundtrack and sync

One approved DaemonV12 main-theme layer only, SHA-256 verified against
public/audio/manifest.json. No external music, generated ding or new sound asset.
`music-cues.csv` contains actual source/reel times. `audio-analysis.json` reports
20ms RMS candidates, not a claim of musical transcription. 106.0773 BPM and
2.2625s/bar come from the production bible; measured rising accents include
2.26, 4.52 and 6.78 seconds. The 17.0–17.5s source window is a useful quieter
breakdown opportunity. The current close reuses source 30.2–36.2s and fades;
**a genuinely resolved closing chord/ding is not available in this repository's
loop assets**. The separate 41-second demo mix mentioned in the bible is absent.
Request that approved original from the owner if a resolved ending is essential.

Mix: 0.5 linear gain (-6.02dB), short de-click fades at edits, final 1.2s fade,
safety limiter. Measured after AAC decode: **-22.5 LUFS integrated, -7.4 dBFS true
peak**, leaving headroom for Opus VO/SFX. This is a conservative underbed, not a
final loudness master. No loudness clipping detected. Do a listening pass on the
actual target device before submission.

Coarse 8kHz waveform correlation is 0.99149; measured encoded audio delay is
7ms. The source 2.26s accent lands approximately 0.307s into the reel, against
picture contact at 0.300s. Within a 30fps frame; **not sample-accurate**.
A/V duration difference is 0.000333s. See sync-qa.json, QA.json and audio-qa.txt.

## Missing owner material / no invented substitutes

Read LIVE_FOOTAGE_NEEDED.md. Original apple-hairbrush input, original oversized
car image, real Muse text, real SAM mask/portal and same-character gameplay/report
footage are ALL absent. Native share proof also remains an owner shot. The final
EDL's missing rows are explicit editorial placeholders, not replacement video.
Keep AI-generated INPUT images labelled as such, actual model footage PRIVATE
LIVE META MODEL API, and these captures OFFLINE DEMO. Do not composite an invented
mask or splice another specimen's result. Preserve the actual model label even
if it recognizes only one part of the apple creature. No public live endpoint.

## QA performed and limits

- One full preview render only; one unencoded one-frame graph preflight.
- Complete H.264/AAC decode; 1579 frames; six distinct verified world sources.
- No black-frame runs at >=98% pixels below 10% luma for >=0.03s.
- Exact source hashes checked; picture and audio end together within one frame.
- Visual checks of impact/ghosts, report, and end card. Title, world callouts,
  provenance and URL inspected at half-size phone-oriented preview. Inherited
  small cabinet text remains small; final Opus layout may reframe the genuine
  source, preserving hitboxes/UI, for phone readability.
- Public end-card URL returned HTTP 200 on 2026-11-02. No private backend URL or
  credential was introduced. Inputs are the prior reviewed offline captures;
  new text/filter files contain only the public game URL. Owner raw footage must
  receive a separate privacy review once supplied.
- No gameplay, source footage, soundtrack assets or deployment changes. No merge.
- This technical QA does not replace human listening, motion review and final
  device playback. Public offline status and live insert absence are explicit.

## Reproduction and resource discipline

`python3 docs/demo/assembly/assemble.py --plan-only` produces plans/filter graph
without encoding. `assemble.py` assembles from existing inputs with FFmpeg, no
browser/capture invocation. Requires existing ffmpeg/ffprobe and the recorded
DejaVuSans font; no new dependencies installed for this task. Output existence
and a render-start guard prevent accidental second full preview renders. Do not
remove those guards to make creative revisions; use an editor and target only
needed corrections. Do not invoke ../tools/capture.cjs.

Validation only (no render): `python3 docs/demo/assembly/qa.py` and
`python3 docs/demo/assembly/check-sync.py`. Read-only analyses write small QA
reports. The 6MB final MP4 is small enough for Git; no intermediate video/WAV
files are committed. Temporary inspection frames remain under /tmp.
