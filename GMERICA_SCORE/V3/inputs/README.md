# GMErica · chart voice (bounded musical experiment)

**Status: pending operator listening approval. Nothing here is wired into the ride, the cue times, the approved songs, DaemonV12, or V3.**

The GMErica coaster rides GME's daily closes (Jan 4 – Feb 19, 2021). This experiment turns the rail the rider actually rides into a
sparse melody: climbs ascend, drops descend, steep rail moves faster, main reversals get a gesture, and the cue sheet's anchors
(four wall impacts, HALT silence, relaunch, chart reveal) land on their own times.

## Listen and read

| | |
|---|---|
| Dry listening example | [`out/gmerica-chart-voice.dry.wav`](out/gmerica-chart-voice.dry.wav) (24-bit, 30.000 s) · [`.mp3`](out/gmerica-chart-voice.dry.mp3) for a phone |
| Event map (JSON) | [`out/gmerica-chart-voice.events.json`](out/gmerica-chart-voice.events.json): 51 notes, 14 phrases, every note with the rail value it came from |
| Event map (MIDI) | [`out/gmerica-chart-voice.mid`](out/gmerica-chart-voice.mid): 128 BPM, voice track plus markers for every anchor |
| Chart versus melody | [`out/chart-vs-melody.png`](out/chart-vs-melody.png) and the table below |
| Technical QA | [`QA.md`](QA.md): 29/29, with the fix-pass history |

Instrument: **Impossible Voice** from the DaemonV12 Signature Rack (owner-approved MUTATION 001 B), dry: no room, no other parts, no drums.
Engine `917f4439` (the revision the other private scores pin). 128 BPM, 16 bars, 30.000 s, D natural minor, D3–A5.

## Inputs (real, frozen, none edited)

From draft PR #29 (`chart-ride`, commit `0d8f5ff`), hashes in `inputs/SOURCES.json`:
`gmerica-ride.cues.json` (copied verbatim) and `ride-curve.json`, derived by `tools/extract-ride.mjs` from the scene's pace knots and the
`chart_track` maths: rail height under the rider every 1/30 s, the 33 real closes with the time the rider passes each, and the whole rail as the reveal draws it.
Nothing is invented. To re-extract: `node tools/extract-ride.mjs <chart-ride checkout>/projects/enm-sandbox`.

## The mapping

| Chart | Melody |
|---|---|
| Rail height (0 = lowest close, 1 = highest) | `height^0.7` → a degree of D minor, D3–A5. Monotone, so order and every turning point survive |
| Climb | Legato glide (blue in the figure) |
| Drop | Each note sighs downward (orange) |
| Steep rail (≥ 4 m/s vertical) | Shorter minimum note, narrower hysteresis: more, faster notes |
| Gentle rail | Long held notes, wide hysteresis: sparse |
| Wall $19.95 / $39.91 / $76.79 / $147.98 | Onset on the cue time (1.867 / 4.700 / 6.567 / 8.433 s). Pitch E3 → G3 → A♯3 → F4, velocity 0.67 → 0.76 → 0.87 → 0.98, cry grows with the story's power |
| Summit (Jan 27) | The highest note, A5, 13.125 s: cry up, long sigh down |
| Jan 28 valley | Inside the HALT, so silent. Its rebound is the relaunch |
| HALT 15.933 – 16.867 s | No notes. The render is digital silence (see QA #3) |
| Relaunch 16.867 s | A♯4, velocity 1.0, cry 3: the hardest hit |
| Jan 29 crest | G5, a lower peak than the summit: cry up, sigh down |
| Lift-off 24.367 s | Closed-mouth hum that opens, then a floating fifth |
| Chart line 26.067 s | The whole real chart sung as the line of light draws (Ramer–Douglas–Peucker over the closes, timed by the scene's draw curve) |
| Titles 27.587 s | Lands on the tonic D3, the pitch bar 1 starts on, so the loop closes |

Only **main** reversals get gestures (a zigzag of ≥ 8 % of the range over the real closes: Jan 27, Jan 28, Jan 29). The small Jan 6–21 wiggles are absorbed by
hysteresis, so there is no note spam. Phrases follow the cue sheet's section lines and are split every two bars.

## Chart versus melody, short

| Stretch | Rail (height) | Melody |
|---|---|---|
| 0 – 13.1 s, ride to the summit | +1.00 | +31 semitones, D3 up to A5 |
| 13.1 – 15.7 s, first drop | −0.39 | −9 semitones, A5 down to C5 |
| 16.9 – 18.8 s, after relaunch | +0.38 | +9 semitones, A♯4 up to G5 |
| 18.8 – 24.3 s, collapse | −0.84 | −22 semitones, G5 down to A3 |

Rank correlation between rail height and the sounding pitch over the ride: **ρ = 0.995**. Climbs and drops agree in direction on every leg.
Density follows steepness: 5–6 notes in the steepest bars (11–12), 1–2 in the flat opening, never more than 6 in a bar (51 notes, 1.7 per second).

**Where the melody differs from the chart, on purpose:**
- The quiet opening (bars 1–4, rail height 0 – 0.15) lives on D3–F3: the rail itself is nearly flat there.
- Minor wiggles are not voiced; the Jan 28 valley is silent (HALT).
- The last real close (Feb 19, about F3) resolves one step down to the tonic D3 so the loop closes.
- At 26.9 – 27.4 s the line of light draws summit → Jan 28 → Jan 29 → Feb 2 in about half a second, so those four notes are a sixteenth-note flourish. It is the most exposed moment of the demo.

## Reproduce

```bash
cd projects/enm-sandbox/experiments/gmerica-chart-voice
node tools/map-chart-voice.mjs                                   # event map, MIDI, rack score (deterministic)
node tools/render-voice.mjs /path/to/daemonv12                   # dry WAV; needs Node 22+ and FFmpeg
node tools/qa.mjs --map-twice --engine /path/to/daemonv12        # 29 checks
node tools/comparison.mjs && node tools/qa-md.mjs                # figure and QA.md
```

Mapping knobs (gamma, key, steepness threshold, hysteresis, zigzag threshold, score lead) are `PARAMS` at the top of `tools/map-chart-voice.mjs` and are copied into the event map.

## Next, after listening

Approve, or send notes. Likely adjustments: the A5 summit register, the chart-line flourish, vowel colours. No V3 integration until approved.
