# Release validation — 2026-11-02

Public demo: https://thing-mania.pages.dev/

Cloudflare Pages deployment c7243dc4-bc2c-4686-9403-1c25dfaa8937 built release
commit 8693ddd on feat/hackathon-release. Actual public URL checked over HTTPS.
No Node server, Functions, live inference endpoints or model secrets deployed.

- Full automated suite: 96 passed, 0 failed. Syntax and whitespace checks passed.
- npm production dependency audit: 0 advisories. Resolved dependencies locked.
- Explicit 16-file static artifact check passes; server/adapters/env excluded.
  No tracked .env/private-key files and no common credential patterns in dist.
  This is a bounded source/artifact scan, not a historical secret audit.
- Actual public URL: HTML 200, restrictive CSP/nosniff/framing headers present.
- Four deployed Ogg/M4A files: 200, expected MIME and exact approved SHA-256.
- /.env, /server.js, /meta_adapter.js, /.git/config, /api/status: 404.
- Headless Chromium mobile emulation at 390×844 against the public URL:
  fresh fixture selection → start → round tickets → remix → all three rounds →
  Chaos Report → share action → music off/on. Audio buffers decode and controller
  reports playing. Zero API requests and zero uncaught page errors. The smoke
  test lets round timers expire; it checks completion, not skilled wins.
- Screenshots captured from the actual public URL, without synthetic overlays:
  [menu](screenshots/mobile-menu.png), [WRECK](screenshots/game-1.png),
  [BEAM](screenshots/game-2.png), [DODGE](screenshots/game-3.png),
  [Chaos Report](screenshots/chaos-report.png).

Reproduce after building: install Playwright and Chromium with system dependencies;
set PLAYWRIGHT_MODULE to the installed playwright module if not locally resolvable,
then `RELEASE_URL=https://thing-mania.pages.dev node scripts/mobile-smoke.cjs`.
Without RELEASE_URL the script serves dist on a private ephemeral loopback port.
The browser runner is validation tooling, not a public runtime dependency.

Remaining manual gates: physical Android/iOS audible playback and background/resume,
native sharing/cancel behavior, touch performance and final recording. User reports
prior Android live Muse/SAM success; this sprint made no paid requests. No new
physical-device result or audible quality claim is made. Do not merge until these
remaining release gates pass. Public live API remains intentionally unavailable.
