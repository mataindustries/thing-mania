# Final original soundtrack integration

The four files in `public/audio/` are unchanged copies of the approved
`experiments/thingmania-ost/final/web/` main/menu Ogg and M4A encodes. Their sizes
and SHA-256 hashes were checked against the original soundtrack manifest before
and after copying. `public/audio/manifest.json` retains the four original entries,
original manifest hash, loop metadata and rights statement. The Node server serves
only the four encodes, not the provenance manifest.

Both arrangements are 1,596,420 frames at 44,100 Hz: exactly 36.2 seconds. The
approved 41-second demo mix has an ending and is intended for video, so it is not
used as a gameplay loop. No renderer, synthesis engine, stems or source project
dependencies were imported.

## Playback

`music.js` creates its own Web Audio context on the first trusted pointer, key or
click interaction. It calls `resume()` synchronously inside that interaction and
plays a silent one-frame unlock buffer before asynchronous loading. Nothing is
downloaded before interaction, or while the saved preference is OFF. Ogg is
preferred where advertised; fetch or decode failures try the verified M4A copy.
Requests have a 12-second timeout, and automatic retries have a ten-second cooldown.
Toggling OFF and ON retries immediately. Failure never blocks the arcade.

Two decoded buffers start at the same audio-clock time and offset. Each native
buffer source loops from 0 to **36.2 seconds**, explicitly excluding encoder or
decoder padding. Both sources remain synchronized through menus, results,
replays, remixes and mute/unmute. A 350 ms complementary linear crossfade changes
arrangements without seeking or restarting either source. Audio-clock scheduling
handles the seam independently of animation frames and JavaScript timers.

The soundtrack level is 0.48. Portal materialization, smash aftermaths and victory
effects duck it to 25% of that level, with a 25 ms attack and 300 ms release.
Overlapping effects extend the hold. Existing synthesized effects have a separate
context and are unaffected by the music preference or ducking.

The accessible cabinet button saves `thingmania.music.enabled` as `on` or `off` in
local storage, tolerating blocked storage. It has a 44 px minimum touch target,
`aria-pressed`, focus styling and visible loading, unavailable, paused and resume
status. The default preference is ON, awaiting interaction. The controller skips
the toggle's initial pointer event so a first tap that turns music OFF does not
start a download.

Visibility and page lifecycle events mute and suspend the music context. Returning
resumes its frozen timeline; a rejected resume waits for the next interaction.
Pending loads cannot start hidden or muted playback. A closed context can be
recreated on a later gesture. Mute cancels any scheduled duck restoration.

API references: [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay/),
[Web Audio loopEnd](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loopEnd),
and [context interruption states](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state).

## Verification — 2026-10-31

- Node 22.22.0: `npm test` — **95 tests passed**, including every existing
  mechanics, Stage Machine, remix, sprite, Muse/SAM and consent test.
- `npm run check` and `git diff --check` passed.
- Targeted tests cover trusted activation, no pre-interaction downloads, saved
  mute, unmute gain restoration, repeated crossfades, AAC loop trimming,
  background/foreground and page lifecycle races, rejected resume, interruptions,
  overlapping ducks, failed/truncated audio, blocked storage, and late decoding.
- Actual game logic tests verify menu/game/result/summary/reset mix selection and
  smash/BEAM/DODGE victory ducking. HTTP tests verify all four served hashes,
  lengths, MIME types, `nosniff`, and rejection of private/unknown/traversal paths.
- Chrome for Testing **156.0.8078.80**, touch-enabled **390×844**, autoplay policy
  requiring user gesture: first-tap unlock, touch-to-smash, main/menu crossfade,
  result ticket, portal duck, lifecycle suspension/resume without source restart,
  mute/unmute and saved OFF after reload passed. No page errors or horizontal
  overflow; button height 44 px. Portal response was intercepted locally; no paid
  requests were sent.
- Forcing Ogg requests to fail successfully selected the M4A fallback. Forcing
  both formats to fail displayed the unavailable status while gameplay remained
  playable, with no page errors.
- Chrome native decoders and OfflineAudioContext rendered two cycles of each
  mix in both formats: all four decoded to 36.2 seconds at 44,100 Hz, with **zero
  maximum sample difference between repeats**. RMS around the seam was
  0.147–0.200, confirming signal across the boundary rather than a silent gap.
- Chromium 141 also passed interaction and lifecycle checks. Its Ogg decoder
  returned differing trailing padding for the mixes; the explicit loop end
  excludes it. That build lacks AAC decoding; the four-format native decoder
  check above used official Chrome.

Mobile screenshots were visually inspected:
[menu](ost-mobile-390x844.jpg) · [gameplay](ost-gameplay-mobile-390x844.jpg).
Browser tools and runtimes stayed under `/tmp`; no package dependency was added.

Physical Android Chrome and iOS Safari were not available. Phone-speaker and
headphone listening, plus real phone-call/headset interruption behavior, remain
device QA; browser rendering and mocks do not certify those conditions.
