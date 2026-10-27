/**
 * THING//MANIA — Meta Model Adapter & Budget Enforcement Tests
 */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  interpretScene,
  getAdapterStatus,
  resetSession,
  computeCacheKey,
  MAX_SESSION_CALLS,
  MAX_SESSION_BUDGET_USD
} = require('../meta_adapter');

describe('Meta Adapter, Consent, Caching & Budget Hard Stops', () => {
  beforeEach(() => {
    resetSession();
  });

  test('Mandatory user consent: Throws error when userConsent is not true', async () => {
    await assert.rejects(
      async () => {
        await interpretScene({ userConsent: false, fixtureId: 'toy_car' });
      },
      /CONSENT_REQUIRED/
    );

    await assert.rejects(
      async () => {
        await interpretScene({ userConsent: undefined, fixtureId: 'toy_car' });
      },
      /CONSENT_REQUIRED/
    );
  });

  test('Mock adapter returns valid plan for each fixture with realistic metadata', async () => {
    for (const fixId of ['toy_car', 'kitchen_object', 'stuffed_animal']) {
      const res = await interpretScene({ userConsent: true, fixtureId: fixId });
      assert.equal(res.success, true);
      assert.equal(res.cached, false);
      assert.ok(res.plan);
      assert.ok(res.plan.selected_object.label);
      assert.equal(res.meta.model, 'muse-spark-1.3-mock');
      assert.ok(res.meta.latency_ms > 0);
      assert.equal(res.meta.cost_usd, 0.01);
      assert.equal(res.meta.fallback_activated, false);
    }
    const status = getAdapterStatus();
    assert.equal(status.session_calls, 3);
    assert.equal(status.budget_used_usd, 0.03);
  });

  test('Content-hash caching prevents duplicate API calls and charges $0.00', async () => {
    // First call
    const call1 = await interpretScene({ userConsent: true, fixtureId: 'toy_car' });
    assert.equal(call1.cached, false);
    const status1 = getAdapterStatus();
    assert.equal(status1.session_calls, 1);
    assert.equal(status1.budget_used_usd, 0.01);

    // Second call with same fixture
    const call2 = await interpretScene({ userConsent: true, fixtureId: 'toy_car' });
    assert.equal(call2.cached, true);
    assert.equal(call2.meta.cost_usd, 0.00);
    assert.equal(call2.meta.tokens.total, 0);

    // Call count and budget MUST NOT increment on cache hit
    const status2 = getAdapterStatus();
    assert.equal(status2.session_calls, 1, 'Session calls must remain 1');
    assert.equal(status2.budget_used_usd, 0.01, 'Budget spend must remain $0.01');
    assert.equal(status2.cache_hits, 1);
  });

  test('Application-level hard stop halts execution when session call limit is reached', async () => {
    // Fill up to max calls with unique fixtures/seeds
    for (let i = 0; i < MAX_SESSION_CALLS; i++) {
      await interpretScene({ userConsent: true, fixtureId: 'toy_car', clientSeed: i + 100 });
    }

    const status = getAdapterStatus();
    assert.equal(status.session_calls, MAX_SESSION_CALLS);

    // Next call must be blocked by application hard stop
    await assert.rejects(
      async () => {
        await interpretScene({ userConsent: true, fixtureId: 'toy_car', clientSeed: 99999 });
      },
      /SESSION_LIMIT_EXCEEDED/
    );
  });

  test('Timeout simulation produces safe timeout error for upstream fallback', async () => {
    await assert.rejects(
      async () => {
        await interpretScene({ userConsent: true, simulateTimeout: true });
      },
      /GATEWAY_TIMEOUT/
    );
  });

  test('Malformed JSON simulation safely recovers with fallback plan', async () => {
    const res = await interpretScene({ userConsent: true, simulateMalformed: true });
    assert.equal(res.success, true);
    assert.equal(res.meta.fallback_activated, true);
    assert.ok(res.meta.validation_errors.length > 0);
    assert.equal(res.plan.selected_object.label, 'OFFLINE BACKUP');
  });

  test('Empty detected_objects simulation safely recovers with fallback plan', async () => {
    const res = await interpretScene({ userConsent: true, simulateEmpty: true });
    assert.equal(res.success, true);
    assert.equal(res.meta.fallback_activated, true);
    assert.ok(res.plan);
    assert.equal(res.plan.selected_object.label, 'OFFLINE BACKUP');
  });

  test('Security audit: Adapter status NEVER leaks API keys or secrets', () => {
    const status = getAdapterStatus();
    assert.equal(status.hasOwnProperty('MODEL_API_KEY'), false);
    assert.equal(status.hasOwnProperty('api_key'), false);
    assert.equal(typeof status.has_api_key, 'boolean');
    assert.equal(status.max_budget_usd, MAX_SESSION_BUDGET_USD);
  });
});
