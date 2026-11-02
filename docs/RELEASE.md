# Hackathon release

The public release is the static arcade: three microgames, six environments,
original DaemonV12 soundtrack, local photo play, deterministic stage remixes and
Chaos Report PNG export. Choose HOT ROD, SPONGE or PLUSH BEAR, then UNLEASH THE
CHAOS. Live photo analysis is a separate private demonstration.

## Architecture and audit

Browser: index.html → GamePlan validation → Stage Machine → Canvas game and
local report export. music.js fetches only the four approved audio encodes after
a player gesture. Static fixtures load directly from JSON. Remixing calls no model.
The public build disables upload actions, hides consent controls and makes no
backend requests. A photo chosen locally remains in browser memory; only the
music preference is saved in localStorage. No analytics or third-party scripts.
“Offline” means no model/backend dependency after assets load; there is no service
worker and a first visit still needs an Internet connection.

Build: Node 22.9+ standard library only; `npm run build` copies an explicit list
to dist/. Never deploy the repository root. No server, adapters, .env, dependencies,
tests or source soundtrack metadata are copied. A real 404 page prevents missing
API routes returning the app shell. Headers restrict scripts and network access
to the site, allow local blob/data images, deny framing and disable camera/mic.
Photos are selected with the system file picker, not camera APIs.

Private Node server: built-in HTTP, fs, path, crypto, https; Muse uses the HTTPS
adapter; SAM lazily imports openai and @meta-sam/parser. The lockfile records
resolved versions. Dependency audit at release preparation found zero advisories.
Node hosting requires a long-running Node process and outbound HTTPS to Meta;
it is not a Pages static runtime. A Worker port would require separate validation
of Node HTTPS and streaming/parser compatibility. No such port is claimed here.

## Live API release blockers — CLOSED TO THE PUBLIC

The existing backend is localhost-only by default. Do not change HOST or forward
its Codespaces port publicly. It has consent and request bounds, but NO user
authentication, durable global/per-user quotas, or ingress abuse controls.
Its in-memory spending/call caps reset on restart and do not coordinate replicas.
SAM has a possible concurrent-request limit race around lazy imports. Muse error
messages may include upstream content in logs/responses. These are public-live
blockers; CORS and a hidden button do not secure endpoints.

Before any public live service: deploy independently behind verified judge
identity (e.g. Access with server-verified JWT); atomically reserve durable global
and per-identity Muse/SAM attempt quotas before each upstream attempt, including
retries, across replicas/restarts; fail closed on storage/auth failure. Use an
atomic database transaction or strongly consistent coordinator, not eventual KV.
Set provider spending limits too. Authenticate before reading a photo body;
reject oversized streamed/chunked bodies with 413; enforce JSON content type,
base64 syntax, decoded byte limits and actual JPEG/PNG/WebP dimensions/pixel
limits. Current director accepts up to 12 MiB JSON, while a 12 MiB browser photo
expands beyond that in base64; SAM accepts 6 MiB JSON and 5M data-URL characters.
The local browser resizes SAM images to 1024px, but Muse sends the original.
Use bounded downsampling for both, deadlines, concurrency limits, edge rate
limiting and bot protection. Consent must precede each upload and be reset for
new photos. Remove raw upstream error content, request/body logging, trace
capture and photo persistence; retain only safe reason codes and quota counters.
Test unauthenticated denial, quota races/restarts, payload/image bombs, consent
rejection, upstream timeout, and fallback before enabling live inference.

For this release use existing verified Android Muse Spark + SAM footage, or an
operator-controlled localhost session following the private commands in README.
No paid inference was used during release validation. Public failures must keep
the default/local fixture playable; segmentation failure keeps the photo sprite.

## Deployment

Cloudflare Pages: production branch `feat/hackathon-release`, framework None,
root repository directory, build `node scripts/build-static.js`, output `dist`.
Set `NODE_VERSION=22` and `SKIP_DEPENDENCY_INSTALL=1` in preview and production.
No model secrets or Functions bindings. Disable automatic preview deployment for
other branches. Build is dependency-free. Official build variable reference:
https://developers.cloudflare.com/pages/configuration/build-image/

Alternatively build locally and upload only dist/ using Pages Direct Upload.
Check the returned HTTPS URL before announcing it: fresh mobile visit, all four
audio URLs and MIME, fixtures, three rounds, remixes, report/export, no /api calls,
404 for /.env and /server.js. Roll back to a previously validated deployment if
any gate fails. Do not merge until the remaining physical-device gates pass.

## Attribution and provenance

Meta Muse Spark 1.3 interprets a consented photo into a validated GamePlan:
object, role, dialogue, world and bounded tuning. Meta SAM 3.1 is a separate,
explicit segmentation action that returns a mask for browser compositing.
The offline public demo does not claim live inference or live segmentation.
Android live photo tests passed in the previous sprint (user-provided evidence).

Game code, Canvas artwork, six-world Stage Machine and report compositor were
created for this hackathon, as recorded in HACKATHON_CHANGELOG.md and Git history.
Original DaemonV12 soundtrack is integrated as approved encodes; hashes and rights
statement are retained in public/audio/manifest.json. See docs/ost-integration.md.
Third-party SDK/parser code remains under its own licenses, not claimed as new work.
Release work changes hosting/reliability only; mechanics and audiovisual identity
are preserved.

## Recording checklist (three minutes)

1. Open the public URL fresh on a phone; show fixture selection and start play.
2. Show WRECK impact/ghost aftermath, BEAM timing, DODGE survival and stage remix.
3. Show the character-led Chaos Report, score/worlds and PNG/native share.
4. Cut to clearly labelled private live footage: consent → Muse identification →
   separate SAM click → transparent sprite in play. Attribute both models.
5. Credit DaemonV12 OST and original hackathon game work; end on public play URL.

## Limitations and release gates

Browser emulation cannot establish audible phone quality, native share behavior,
OS interruption recovery or physical-device frame pacing. Before final submission
check Android and iOS first-tap audio, lock/background/resume, touch navigation,
reduced motion, ordinary/transparent photos, native share cancellation/download,
and readable report at 390×844. Existing deterministic tests validate logic and
render calls, not pixels. Retain physical Android live-test evidence separately.
