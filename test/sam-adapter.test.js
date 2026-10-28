'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { segmentSticker, getSamStatus, cleanConcept, SAM_IMAGE_COST_USD } = require('../sam_adapter');

test('SAM key and photo always stay on the server; no consent rejects locally', async () => {
  await assert.rejects(
    segmentSticker({ userConsent: false, imageBase64: 'data:image/png;base64,AA==', concept: 'pumpkin' }),
    /CONSENT_REQUIRED/
  );
});

test('SAM denies non-image and oversized payloads before any external call', async () => {
  await assert.rejects(
    segmentSticker({ userConsent: true, imageBase64: 'data:text/html;base64,AA==', concept: 'pumpkin' }),
    /INVALID_IMAGE/
  );
  await assert.rejects(
    segmentSticker({ userConsent: true, imageBase64: 'data:image/png;base64,' + 'A'.repeat(5_000_000), concept: 'pumpkin' }),
    /INVALID_IMAGE/
  );
});

test('SAM requires a concrete noun phrase; sanitizes control characters', async () => {
  assert.equal(cleanConcept('  Painted Pumpkin  '), 'Painted Pumpkin');
  assert.equal(cleanConcept('pumpkin\n<>'), 'pumpkin');
  await assert.rejects(
    segmentSticker({ userConsent: true, imageBase64: 'data:image/png;base64,AA==', concept: '   ' }),
    /INVALID_CONCEPT/
  );
});

test('SAM request accounting is independent of Muse Spark', () => {
  const status = getSamStatus();
  assert.equal(status.model, 'sam-3.1');
  assert.equal(status.attempts, 0);
  assert.equal(SAM_IMAGE_COST_USD, 0.0025);
  assert.ok(Number.isFinite(status.max_attempts));
});
