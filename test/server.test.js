/**
 * THING//MANIA — Local Server & API Route Integration Tests
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createServer } = require('../server');
const { resetSession } = require('../meta_adapter');

describe('Local Backend Server & Security Headers', () => {
  let server;
  let baseUrl;

  before((_, done) => {
    resetSession();
    server = createServer();
    // Port 0 tells OS to assign an available ephemeral port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      done();
    });
  });

  after((_, done) => {
    server.close(done);
  });

  function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const u = new URL(path, baseUrl);
      const req = http.request(
        u,
        {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {}
        },
        res => {
          let data = '';
          res.on('data', c => (data += c));
          res.on('end', () => {
            let parsed = null;
            try {
              parsed = JSON.parse(data);
            } catch (_) {}
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsed || data
            });
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
      req.end();
    });
  }

  test('GET /api/status returns online status and safe adapter metadata', async () => {
    const res = await request('GET', '/api/status');
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.body.status, 'online');
    assert.equal(res.body.adapter.mock_mode, true);
    assert.equal(typeof res.body.adapter.session_calls, 'number');
    assert.equal(typeof res.body.adapter.budget_used_usd, 'number');
    // Ensure no secrets leaked
    assert.equal(res.body.adapter.hasOwnProperty('MODEL_API_KEY'), false);
  });

  test('GET /api/fixtures returns available test fixtures', async () => {
    const res = await request('GET', '/api/fixtures');
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.body.fixtures));
    assert.equal(res.body.fixtures.length, 3);
    const ids = res.body.fixtures.map(f => f.id);
    assert.ok(ids.includes('toy_car'));
    assert.ok(ids.includes('kitchen_object'));
    assert.ok(ids.includes('stuffed_animal'));
  });

  test('POST /api/director/plan blocks requests without user consent (400)', async () => {
    const res = await request('POST', '/api/director/plan', {
      userConsent: false,
      fixtureId: 'toy_car'
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('CONSENT_REQUIRED'));
    assert.ok(res.body.fallback_plan, 'Must include fallback plan to keep arcade playable');
  });

  test('POST /api/director/plan succeeds with consent and returns validated plan', async () => {
    const res = await request('POST', '/api/director/plan', {
      userConsent: true,
      fixtureId: 'toy_car'
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.cached, false);
    assert.equal(res.body.plan.selected_object.label, 'Vintage Die-Cast Hot Rod');
    assert.ok(res.body.plan.round_modifiers.round1_wreck.launch_impulse > 2.6);
  });

  test('POST /api/director/plan returns cached: true for repeat fixture call', async () => {
    const res = await request('POST', '/api/director/plan', {
      userConsent: true,
      fixtureId: 'toy_car'
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.cached, true);
    assert.equal(res.body.meta.cost_usd, 0.00);
  });

  test('POST /api/director/plan returns 504 and safe fallback plan on simulated timeout', async () => {
    const res = await request('POST', '/api/director/plan', {
      userConsent: true,
      simulateTimeout: true
    });
    assert.equal(res.statusCode, 504);
    assert.equal(res.body.success, false);
    assert.ok(res.body.fallback_plan);
    assert.equal(res.body.fallback_plan.selected_object.label, 'TIMEOUT FALLBACK');
  });

  test('POST /api/director/plan rejects malformed JSON with 400 and fallback plan', async () => {
    const res = await request('POST', '/api/director/plan', '{ not valid json');
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.fallback_plan);
  });

  test('Serves static assets with security headers and correct MIME types', async () => {
    const htmlRes = await request('GET', '/index.html');
    assert.equal(htmlRes.statusCode, 200);
    assert.ok(htmlRes.headers['content-type'].includes('text/html'));
    assert.ok(htmlRes.body.includes('THING//MANIA'));

    const jsRes = await request('GET', '/gameplan.js');
    assert.equal(jsRes.statusCode, 200);
    assert.ok(jsRes.headers['content-type'].includes('application/javascript'));
    assert.ok(jsRes.body.includes('GamePlan'));

    const cssRes = await request('GET', '/styles.css');
    assert.equal(cssRes.statusCode, 200);
    assert.ok(cssRes.headers['content-type'].includes('text/css'));
  });
});
