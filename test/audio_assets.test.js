const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createServer } = require('../server');
const manifest = require('../public/audio/manifest.json');

test('all four production encodes match approved soundtrack manifest sizes and SHA-256 hashes', () => {
  assert.equal(manifest.loop.frames / manifest.loop.sampleRate, 36.2);
  assert.equal(manifest.files.length, 4);
  for (const file of manifest.files) {
    const data = fs.readFileSync(path.join(__dirname, '../public/audio', path.basename(file.file)));
    assert.equal(data.length, file.bytes);
    assert.equal(createHash('sha256').update(data).digest('hex'), file.sha256, file.file);
    assert.equal(file.alignmentLagFrames, 0);
  }
});

test('server serves only approved audio assets with exact bytes, correct MIME and nosniff', async t => {
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const file of manifest.files) {
    const response = await fetch(`${base}/public/audio/${path.basename(file.file)}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), file.file.endsWith('.ogg') ? 'audio/ogg' : 'audio/mp4');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(Number(response.headers.get('content-length')), file.bytes);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
  }
  assert.equal((await fetch(`${base}/music.js`)).status, 200);
  // Metadata/source files remain private; adding audio must not broaden access.
  for (const name of ['.env', 'server.js', 'meta_adapter.js', '.git/config', 'test/music.test.js',
    'public/audio/manifest.json', 'public/audio/demo-mix.ogg', 'public/audio/unknown.m4a',
    'public/audio/%2e%2e/%2e%2e/.env', 'public/audio/main-theme-loop.ogg/extra']) {
    const response = await fetch(`${base}/${name}`);
    assert.equal(response.status, 404, name);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
});
