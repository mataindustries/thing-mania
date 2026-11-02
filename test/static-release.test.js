const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
test('public artifact contains only offline assets and restrictive hosting configuration', () => {
  execFileSync(process.execPath, ['scripts/build-static.js']);
  const files = fs.readdirSync('dist', {recursive:true}).filter(f => fs.statSync(path.join('dist', f)).isFile());
  assert.equal(files.length, 16);
  for (const f of files) assert.doesNotMatch(f, /(?:\.env|server|adapter|node_modules|\.git|test)/);
  const html = fs.readFileSync('dist/index.html','utf8');
  assert.match(html, /release-config.js/);
  assert.match(html, /consent-row" hidden/);
  assert.match(html, /fixture-details" open/);
  assert.match(fs.readFileSync('dist/release-config.js','utf8'), /THING_STATIC_RELEASE = true/);
  assert.match(fs.readFileSync('dist/_headers','utf8'), /connect-src 'self'/);
  for (const id of ['toy_car','kitchen_object','stuffed_animal']) {
    assert.equal(require('../gameplan').validateGamePlan(JSON.parse(fs.readFileSync(`dist/fixtures/${id}.json`))).valid,true);
  }
  for (const item of require('../public/audio/manifest.json').files) {
    assert.deepEqual(fs.readFileSync(`dist/public/audio/${path.basename(item.file)}`),fs.readFileSync(`public/audio/${path.basename(item.file)}`));
  }
});
