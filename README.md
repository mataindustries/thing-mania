# THING//MANIA: POCKET MAYHEM (v0.2)

**One everyday object. Three different universes. Twenty-nine seconds of ridiculous arcade gameplay.**

Freshly authored on October 27, 2026 for the Meta Global AI Developer Hackathon. No DaemonV12, Shoot the Moon, or other existing personal project code or assets are reused. This version uses only HTML, CSS, the Canvas and Web Audio browser APIs, and a user's optional locally selected photo. No third-party packages, servers, API calls, user accounts, or paid services are needed.

## Play immediately

Open `index.html` on a modern browser. Or serve it using `python3 -m http.server 8000` and open `http://localhost:8000`.

On Android, the easiest path is to import the folder to a GitHub repository and deploy it as a static site with Cloudflare Pages or GitHub Pages. No bundler needed. For a quick local check, use a browser and the extracted `index.html` (some mobile file managers impose their own restrictions on local files).

1. Click **START THE NONSENSE**, then **I WAS BORN READY**.
2. **WRECK IT — Haunted House:** drag left on the canvas and release. The photographed object is the wrecking weight. Land a hit to break the house and release ghosts.
3. **BEAM IT — UFO Incident:** the same object moves past a UFO; **tap anywhere** while it crosses the center line to abduct it. Catch twice before time runs out.
4. **RUN FOR IT — Volcano Vacation:** move left/right by dragging or swiping horizontally to avoid hot falling rocks. Survive ten seconds; two hearts.
5. See the incident report. Pass the phone, play again, compare scores.

**Keyboard:** Enter/Space launches the ball or fires the UFO beam. Left/Right or A/D steers in the volcano round. Pointer, touch, and mouse input work with the same Canvas code. Audio unlocks after first interaction.

**Photo prop:** The optional uploaded photo is a square center crop inside an intentionally wonky sticker silhouette. This is **not** AI background removal. The photo stays in the browser; it is never transmitted. The game also runs with a cartoon placeholder.

## Personality and art direction

Dollar-store arcade aesthetics: cheap paper cutouts, crooked polaroid stickers, improbable sound effects, stars and halftone dots, fake hardware labels, exaggerated freeze-frame destruction, and jokey round results. Different genres instead of three haunted rounds:

| Round | World | Skill | Payoff |
| --- | --- | --- | --- |
| WRECK IT! | haunted house | drag/release pendulum | house breaks; ghosts escape |
| BEAM IT! | alien highway | timing / tap | abduct an object with a tractor beam |
| RUN FOR IT! | volcano road trip | swipe dodge | narrowly escape falling molten rocks |

The point is deliberately scrappy **presentation**, not unreliable input or unreadable UI. Each round has distinct scenery, control mechanics, and character of feedback.

## Build provenance and limitations

Everything in the starter was authored during the event. See `HACKATHON_CHANGELOG.md`. Gameplay is real; AI personalization is **not**. No Meta Muse Spark or SAM 3.1 calls have been implemented. No true segmentation, object understanding, new-photo generalization, or cloud-hosted game variants are claimed.

This build should be considered a game-feel proof, **not a submission-ready hackathon entry**. To meet the contest requirements, Meta tooling needs a meaningful working integration that materially affects the resulting gameplay.

## Next sprint: meaningful Meta integration, with a hard budget

1. Implement a small backend keeping the Meta API key server-side, never in this static app. Initially mocked, with fixture replay and usage accounting. Provider spend notifications are not hard caps.
2. Muse Spark processes a user's photo into a **schema-validated** `GamePlan` (object labels, chosen object, playful roles, short announce lines, 3 round variations within known bounds). Never execute AI-generated JavaScript or let the model invent arbitrary game rules.
3. SAM 3.1 segments the **chosen object** (user-confirmed point or box prompt if necessary), yielding a transparent sprite displayed in all three rounds. Preserve the input photo locally until the user explicitly opts into uploading it to Meta.
4. New-photo test: run on two genuinely different photographed scenes and confirm each produces a distinct, valid, playable object and roles. Capture error cases: unknown object, mask failure, API timeouts, invalid model responses.
5. Document real latency, token use, model identifiers, budget checks and credits spent. Default to cached fixture replay during gameplay QA; pay for inference only to check actual integration.
6. Public repo, README and three-minute demo must distinguish newly authored code and working Meta-model functionality from fixtures and planned features. Provide a no-key fallback demo without representing it as live AI.

The partner inference credits are optional; no code depends on getting them. Aim to spend a small fraction of the $150 Meta credits, leaving as much as possible for later DaemonV12 experimentation.

## Development and testing

- The standalone JavaScript passes `node --check game.js` (Node is only for developer checks; not required in the browser).
- Automated browser interaction was tested in headless Chromium at 390 px using Playwright. WRECK IT and BEAM IT were completed, and RUN FOR IT advanced to its result screen. No console page errors in the tested flow. See `QA_REPORT.md`.
- A new session picks a new random seed for hazard variations. Use `?seed=7821` for a reproducible test session. Gameplay itself remains client-side, no API calls.

## Licensing

Source code is newly authored for this contest. Choose an explicit public repository code license and verify all dependencies/assets before final hackathon submission. The code does not include audio/video or other assets from preexisting personal projects.
