'use strict';
// Deliberate allowlist: never copy repository roots or server credentials.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const file of ['index.html', 'styles.css', 'game.js', 'gameplan.js', 'stage_machine.js', 'music.js',
  'fixtures/toy_car.json', 'fixtures/kitchen_object.json', 'fixtures/stuffed_animal.json',
  ...['main-theme', 'menu-mix'].flatMap(name => ['ogg', 'm4a'].map(ext => `public/audio/${name}-loop.${ext}`))]) {
  fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
fs.appendFileSync(path.join(out, 'styles.css'), '\n.consent-row[hidden]{display:none!important}\n');
let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
html = html.replace('<script src="gameplan.js">', '<script src="release-config.js"></script>\n  <script src="gameplan.js">')
  .replace('<details class="fixture-details">', '<details class="fixture-details" open>')
  .replace('DEVELOPER FIXTURES (OFFLINE)', 'PLAY OFFLINE · CHOOSE YOUR OBJECT')
  .replace('TRY DIVERSE META FIXTURES:', 'CHOOSE A FIXTURE:')
  .replace('<div class="consent-row">', '<div class="consent-row" hidden>')
  .replace('META GAME DIRECTOR · CHECKING BACKEND', 'META GAME DIRECTOR · OFFLINE DEMO')
  .replace('SESSION SPEND: $0.00 / $1.00 CEILING · CALLS: 0 / 10 · 100% OFFLINE CAPABLE', 'OFFLINE DEMO · ZERO MODEL CALLS · PHOTOS STAY ON THIS DEVICE')
  .replace('Meta Muse Spark 1.3 GamePlan director supports live API and offline mock mode. API keys are kept strictly on the local backend server and never in client JavaScript. No photo is sent without your explicit approval.', 'Public demo uses offline fixtures from the Meta Muse Spark GamePlan pipeline. Live Muse Spark analysis and optional SAM 3.1 segmentation are demonstrated separately. Photos stay on your device in this demo.');
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, 'release-config.js'), 'window.THING_STATIC_RELEASE = true;\n');
fs.writeFileSync(path.join(out, '404.html'), '<!doctype html><title>Not found</title><h1>Not found</h1><a href="/">Play THING//MANIA</a>');
fs.writeFileSync(path.join(out, '_headers'), `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'
  Cache-Control: public, max-age=0, must-revalidate
/public/audio/*.ogg
  Content-Type: audio/ogg
/public/audio/*.m4a
  Content-Type: audio/mp4
`);
console.log('Static offline release built in dist/ (no server or secrets).');
