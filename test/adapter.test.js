/**
 * THING//MANIA — Meta Model Adapter Tests (v2.0.0)
 *
 * Covers:
 *  - Consent gate
 *  - Mock/fixture paths
 *  - Content-hash caching ($0.00 on repeat)
 *  - Application-level budget & call-limit hard stops
 *  - Timeout / malformed / empty simulation
 *  - No-key and invalid-key branches
 *  - Token cost accounting
 *  - Security audit (key never in status)
 *  - JSON Schema export sanity
 */
'use strict';

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  interpretScene,
  getAdapterStatus,
  resetSession,
  computeCacheKey,
  estimateCost,
  buildResponseSchema,
  MAX_SESSION_CALLS,
  MAX_SESSION_BUDGET_USD,
  COST_PER_1K_INPUT_USD,
  COST_PER_1K_OUTPUT_USD,
} = require('../meta_adapter');

describe('Meta Adapter — core consent, caching & budget', () => {
  beforeEach(() => resetSession());

  test('Mandatory user consent: rejects when userConsent is false or undefined', async () => {
    await assert.rejects(
      () => interpretScene({ userConsent: false, fixtureId: 'toy_car' }),
      /CONSENT_REQUIRED/
    );
    await assert.rejects(
      () => interpretScene({ userConsent: undefined, fixtureId: 'toy_car' }),
      /CONSENT_REQUIRED/
    );
  });

  test('Mock adapter returns a valid plan for each fixture with expected metadata', async () => {
    for (const fixId of ['toy_car', 'kitchen_object', 'stuffed_animal']) {
      const res = await interpretScene({ userConsent: true, fixtureId: fixId });
      assert.equal(res.success, true);
      assert.equal(res.cached,  false);
      assert.ok(res.plan);
      assert.ok(res.plan.selected_object.label, 'selected_object.label must be non-empty');
      assert.equal(res.meta.source, 'mock');
      assert.ok(res.meta.latency_ms >= 0);
      assert.ok(res.meta.cost_usd >= 0);
      assert.equal(res.meta.fallback_activated, false);
    }
    const s = getAdapterStatus();
    assert.equal(s.session_calls,    3);
    assert.ok(s.budget_used_usd > 0, 'Budget must advance after mock calls');
  });

  test('Content-hash caching returns cached:true and charges $0.00 on repeat', async () => {
    const call1 = await interpretScene({ userConsent: true, fixtureId: 'toy_car' });
    assert.equal(call1.cached, false);
    const s1 = getAdapterStatus();
    const spendAfter1 = s1.budget_used_usd;

    const call2 = await interpretScene({ userConsent: true, fixtureId: 'toy_car' });
    assert.equal(call2.cached,        true);
    assert.equal(call2.meta.cost_usd, 0.00);
    assert.equal(call2.meta.tokens.total, 0);
    assert.equal(call2.meta.source, 'cache_hit');

    const s2 = getAdapterStatus();
    assert.equal(s2.session_calls,   1,           'Session calls must stay at 1');
    assert.equal(s2.budget_used_usd, spendAfter1, 'Budget must not grow on cache hit');
    assert.equal(s2.cache_hits,      1);
  });

  test('Application-level hard stop fires at MAX_SESSION_CALLS', async () => {
    for (let i = 0; i < MAX_SESSION_CALLS; i++) {
      await interpretScene({ userConsent: true, fixtureId: 'toy_car', clientSeed: i + 100 });
    }
    const s = getAdapterStatus();
    assert.equal(s.session_calls, MAX_SESSION_CALLS);

    await assert.rejects(
      () => interpretScene({ userConsent: true, fixtureId: 'toy_car', clientSeed: 99999 }),
      /SESSION_LIMIT_EXCEEDED/
    );
  });
});

describe('Meta Adapter — error & fallback recovery', () => {
  beforeEach(() => resetSession());

  test('Timeout simulation throws GATEWAY_TIMEOUT', async () => {
    await assert.rejects(
      () => interpretScene({ userConsent: true, simulateTimeout: true }),
      /GATEWAY_TIMEOUT/
    );
  });

  test('Malformed JSON simulation activates fallback plan', async () => {
    const res = await interpretScene({ userConsent: true, simulateMalformed: true });
    assert.equal(res.success, true);
    assert.equal(res.meta.fallback_activated, true);
    assert.ok(res.meta.validation_errors.length > 0);
    assert.equal(res.plan.selected_object.label, 'OFFLINE BACKUP');
  });

  test('Empty detected_objects simulation activates fallback plan', async () => {
    const res = await interpretScene({ userConsent: true, simulateEmpty: true });
    assert.equal(res.success, true);
    assert.equal(res.meta.fallback_activated, true);
    assert.ok(res.plan, 'Must still provide a playable fallback plan');
    assert.equal(res.plan.selected_object.label, 'OFFLINE BACKUP');
  });
});

describe('Meta Adapter — API key validation (no live calls)', () => {
  beforeEach(() => resetSession());

  test('No-key flag throws NO_API_KEY immediately', async () => {
    await assert.rejects(
      () => interpretScene({ userConsent: true, simulateNoKey: true }),
      /NO_API_KEY/
    );
    // Budget and call count must remain untouched
    const s = getAdapterStatus();
    assert.equal(s.session_calls,    0);
    assert.equal(s.budget_used_usd,  0);
  });

  test('Invalid-key flag throws INVALID_API_KEY immediately', async () => {
    await assert.rejects(
      () => interpretScene({ userConsent: true, simulateBadKey: true }),
      /INVALID_API_KEY/
    );
    const s = getAdapterStatus();
    assert.equal(s.session_calls,   0);
    assert.equal(s.budget_used_usd, 0);
  });

  test('Missing key falls back to mock mode rather than crashing', async () => {
    // When MODEL_API_KEY is absent (env not set), useMock branches to fixture
    const res = await interpretScene({ userConsent: true, fixtureId: 'toy_car' });
    assert.equal(res.success, true);
    assert.equal(res.meta.source, 'mock');
  });
});

describe('Meta Adapter — token cost accounting', () => {
  test('estimateCost returns 0 for zero tokens', () => {
    assert.equal(estimateCost(0, 0), 0);
  });

  test('estimateCost scales correctly with per-1k rates', () => {
    const cost = estimateCost(1000, 1000);
    const expected = COST_PER_1K_INPUT_USD + COST_PER_1K_OUTPUT_USD;
    assert.ok(
      Math.abs(cost - expected) < 1e-9,
      `Expected ${expected}, got ${cost}`
    );
  });

  test('estimateCost for typical Muse Spark call (350 prompt + 200 completion)', () => {
    const cost = estimateCost(350, 200);
    const expected = (350 / 1000) * COST_PER_1K_INPUT_USD + (200 / 1000) * COST_PER_1K_OUTPUT_USD;
    assert.ok(Math.abs(cost - expected) < 1e-9);
    // Sanity: must be well under $0.01 for a single small call
    assert.ok(cost < 0.01, `Single call cost ${cost} must be < $0.01`);
  });

  test('Budget accumulates correctly across multiple mock calls', async () => {
    resetSession();
    await interpretScene({ userConsent: true, fixtureId: 'toy_car',         clientSeed: 1 });
    await interpretScene({ userConsent: true, fixtureId: 'kitchen_object',  clientSeed: 2 });
    await interpretScene({ userConsent: true, fixtureId: 'stuffed_animal',  clientSeed: 3 });

    const s = getAdapterStatus();
    assert.equal(s.session_calls, 3);
    // Each mock call estimates 340 prompt + 210 completion tokens.
    // The session accumulates full-precision costs; status rounds USD to 4dp.
    const perCall = estimateCost(340, 210);
    assert.equal(s.budget_used_usd, Number((perCall * 3).toFixed(4)));
  });
});

describe('Meta Adapter — security audit & schema export', () => {
  test('getAdapterStatus never exposes MODEL_API_KEY or any secret', () => {
    const s = getAdapterStatus();
    const json = JSON.stringify(s);
    assert.equal(s.hasOwnProperty('MODEL_API_KEY'),    false);
    assert.equal(s.hasOwnProperty('api_key'),          false);
    assert.equal(s.hasOwnProperty('Authorization'),    false);
    assert.equal(typeof s.has_api_key, 'boolean');
    assert.equal(s.max_budget_usd,   MAX_SESSION_BUDGET_USD);
    // Key must not leak as a substring in the serialised status
    // (In test env MODEL_API_KEY is empty or 'mock_key_for_testing', so this
    //  checks the structure rather than a real secret.)
    assert.ok(!json.includes('sk-'), 'Real key prefix must not appear in status JSON');
  });

  test('buildResponseSchema returns well-formed json_schema object', () => {
    const schema = buildResponseSchema();
    assert.equal(schema.name, 'GamePlan');
    assert.equal(schema.strict, true);
    assert.ok(schema.schema, 'Must have schema property');
    assert.equal(schema.schema.type, 'object');

    // Required top-level keys present
    const required = schema.schema.required;
    for (const key of ['schema_version','detected_objects','selected_object',
                        'whimsical_role','announcer_lines','round_modifiers']) {
      assert.ok(required.includes(key), `Schema must require "${key}"`);
    }

    // Numeric bounds embedded correctly
    const r1 = schema.schema.properties.round_modifiers.properties.round1_wreck;
    assert.equal(r1.properties.launch_impulse.minimum, 1.8);
    assert.equal(r1.properties.launch_impulse.maximum, 3.4);

    const r2 = schema.schema.properties.round_modifiers.properties.round2_beam;
    assert.equal(r2.properties.beam_window_px.minimum, 50);
    assert.equal(r2.properties.beam_window_px.maximum, 85);

    const r3 = schema.schema.properties.round_modifiers.properties.round3_lava;
    assert.equal(r3.properties.rock_speed_min.minimum, 180);
    assert.equal(r3.properties.rock_speed_max.maximum, 360);
  });
});
