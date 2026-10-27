/**
 * THING//MANIA — Meta Model API Adapter (v1.3.0)
 * 
 * Secure backend adapter for Meta Muse Spark 1.3 scene interpretation.
 * 
 * Key Principles:
 * 1. MODEL_API_KEY remains strictly server-side (environment variable), NEVER sent to client.
 * 2. Explicit user consent required before processing any photo data.
 * 3. Application-level hard budget ceiling ($1.00 USD) and session call limit (10 calls).
 *    (Provider billing alerts are not hard caps; application-level enforcement is).
 * 4. Content-hash caching prevents duplicate API calls for identical photos/fixtures.
 * 5. Robust fallbacks for timeouts, malformed responses, and empty detections.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { validateGamePlan, createDefaultGamePlan, SCHEMA_VERSION } = require('./gameplan');

// Environment & Configuration
const MODEL_API_KEY = process.env.MODEL_API_KEY || '';
const MODEL_ENDPOINT = process.env.MODEL_ENDPOINT || 'https://api.meta.example/v1/models/muse-spark-1.3';
const MOCK_MODE = process.env.MOCK_MODE !== 'false'; // Defaults to true for zero-cost hackathon dev
const MAX_SESSION_CALLS = parseInt(process.env.MAX_SESSION_CALLS || '10', 10);
const MAX_SESSION_BUDGET_USD = parseFloat(process.env.MAX_SESSION_BUDGET_USD || '1.00');
const ESTIMATED_COST_PER_CALL_USD = 0.01; // Muse Spark estimated inference cost
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '5000', 10);

// In-Memory Cache and Session State
const planCache = new Map();
let sessionState = {
  calls: 0,
  budgetUsedUsd: 0.0,
  cacheHits: 0
};

// Fixture loader helper
function loadFixture(fixtureId) {
  const safeId = String(fixtureId).replace(/[^a-zA-Z0-9_-]/g, '');
  const fixturePath = path.join(__dirname, 'fixtures', `${safeId}.json`);
  if (fs.existsSync(fixturePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
      return data;
    } catch (err) {
      console.error(`[MetaAdapter] Error reading fixture ${safeId}:`, err.message);
    }
  }
  return null;
}

/**
 * Computes cache key from payload
 */
function computeCacheKey(payload) {
  const hash = crypto.createHash('sha256');
  hash.update(`v:${SCHEMA_VERSION};`);
  if (payload.fixtureId) {
    hash.update(`fixture:${payload.fixtureId};`);
  }
  if (payload.imageBase64) {
    // Hash first 64KB + length to keep hash fast while unique
    const imgData = String(payload.imageBase64);
    hash.update(`img_len:${imgData.length};head:${imgData.slice(0, 65536)};`);
  }
  if (payload.clientSeed) {
    hash.update(`seed:${payload.clientSeed};`);
  }
  return hash.digest('hex');
}

/**
 * Reset session counters (useful for testing or session restart)
 */
function resetSession() {
  sessionState = {
    calls: 0,
    budgetUsedUsd: 0.0,
    cacheHits: 0
  };
  planCache.clear();
}

/**
 * Get current session status (SAFE for public inspection, no keys exposed)
 */
function getAdapterStatus() {
  return {
    mock_mode: MOCK_MODE,
    has_api_key: Boolean(MODEL_API_KEY && MODEL_API_KEY !== 'mock_key_for_testing'),
    schema_version: SCHEMA_VERSION,
    session_calls: sessionState.calls,
    max_session_calls: MAX_SESSION_CALLS,
    budget_used_usd: Number(sessionState.budgetUsedUsd.toFixed(4)),
    max_budget_usd: MAX_SESSION_BUDGET_USD,
    cache_entries: planCache.size,
    cache_hits: sessionState.cacheHits
  };
}

/**
 * Main Scene Interpretation Pipeline
 * 
 * @param {Object} options
 * @param {string} [options.imageBase64] - Base64 encoded user image
 * @param {boolean} options.userConsent - Explicit user approval to send image
 * @param {string} [options.fixtureId] - One of 'toy_car', 'kitchen_object', 'stuffed_animal'
 * @param {number} [options.clientSeed] - Random seed from arcade client
 * @param {boolean} [options.simulateTimeout] - Testing flag
 * @param {boolean} [options.simulateMalformed] - Testing flag
 * @param {boolean} [options.simulateEmpty] - Testing flag
 * @returns {Promise<Object>} Result object with plan, meta, cached status
 */
async function interpretScene(options = {}) {
  const startTime = Date.now();

  // 1. Mandatory User Consent Check
  if (options.userConsent !== true) {
    throw new Error('CONSENT_REQUIRED: User consent is mandatory before processing or transmitting photo data.');
  }

  // 2. Caching Layer Check
  const cacheKey = computeCacheKey(options);
  if (planCache.has(cacheKey)) {
    sessionState.cacheHits++;
    const cachedEntry = planCache.get(cacheKey);
    return {
      success: true,
      cached: true,
      plan: cachedEntry.plan,
      meta: {
        model: cachedEntry.meta.model,
        latency_ms: Date.now() - startTime,
        tokens: { prompt: 0, completion: 0, total: 0 },
        cost_usd: 0.00,
        source: 'cache_hit'
      }
    };
  }

  // 3. Application-Level Budget & Call Limit Hard Stop
  if (sessionState.calls >= MAX_SESSION_CALLS) {
    throw new Error(`SESSION_LIMIT_EXCEEDED: Maximum session API calls (${MAX_SESSION_CALLS}) reached. Application hard stop enforced to protect budget.`);
  }

  if (sessionState.budgetUsedUsd + ESTIMATED_COST_PER_CALL_USD > MAX_SESSION_BUDGET_USD) {
    throw new Error(`BUDGET_EXCEEDED: Session spending budget ($${MAX_SESSION_BUDGET_USD.toFixed(2)}) reached. Application hard stop enforced.`);
  }

  // 4. Test Simulations
  if (options.simulateTimeout) {
    await new Promise(r => setTimeout(r, 60));
    throw new Error('GATEWAY_TIMEOUT: Meta Model API request timed out after 5000ms.');
  }

  let rawResponseData = null;
  let modelIdentifier = 'muse-spark-1.3-mock';
  let tokenStats = { prompt: 340, completion: 210, total: 550 };
  let simulatedLatency = 80;

  // 5. Execution: Mock Adapter vs Future Live API Call
  if (MOCK_MODE || !MODEL_API_KEY || options.fixtureId) {
    // MOCK ADAPTER PATH (Zero spend, predictable, safe)
    if (options.simulateMalformed) {
      rawResponseData = { broken_syntax: true, note: 'corrupt payload simulation' };
    } else if (options.simulateEmpty) {
      rawResponseData = {
        schema_version: SCHEMA_VERSION,
        detected_objects: [],
        selected_object: { id: 'ghost' }
      };
    } else if (options.fixtureId) {
      const fixtureData = loadFixture(options.fixtureId);
      if (fixtureData) {
        rawResponseData = fixtureData;
      } else {
        throw new Error(`FIXTURE_NOT_FOUND: Unknown fixture "${options.fixtureId}".`);
      }
    } else if (options.imageBase64) {
      // Procedurally synthesize a unique, deterministic GamePlan based on image hash
      const imgHash = crypto.createHash('md5').update(options.imageBase64).digest('hex');
      const hashInt = parseInt(imgHash.slice(0, 6), 16);
      const isSpeedy = hashInt % 3 === 0;
      const isSpongy = hashInt % 3 === 1;

      if (isSpeedy) {
        rawResponseData = loadFixture('toy_car') || createDefaultGamePlan({ label: 'SPEEDY PROP' });
      } else if (isSpongy) {
        rawResponseData = loadFixture('kitchen_object') || createDefaultGamePlan({ label: 'KITCHEN HERO' });
      } else {
        rawResponseData = loadFixture('stuffed_animal') || createDefaultGamePlan({ label: 'PLUSH CADET' });
      }
    } else {
      // Default fallback plan
      rawResponseData = createDefaultGamePlan({ label: 'MYSTERY OBJECT' });
    }
  } else {
    // LIVE META MODEL API PATH (Reserved for when API credentials and live endpoint are activated)
    // Kept strictly structured to call MODEL_ENDPOINT with Bearer MODEL_API_KEY
    // Not executed in this sprint (MOCK_MODE=true).
    throw new Error('LIVE_API_INACTIVE: Live calls disabled in feat/meta-gameplan sprint. Use MOCK_MODE.');
  }

  // 6. Schema Validation & Sanitization Guard
  const validation = validateGamePlan(rawResponseData);
  let finalPlan = null;
  let isFallback = false;

  if (validation.valid) {
    finalPlan = validation.sanitized;
  } else {
    // Fallback activated if model generated invalid JSON, empty detections or hallucinated references
    console.warn('[MetaAdapter] Validation failed, engaging safe fallback plan:', validation.errors);
    finalPlan = createDefaultGamePlan({ label: 'OFFLINE BACKUP' });
    isFallback = true;
  }

  // 7. Update Session Accounting
  sessionState.calls++;
  sessionState.budgetUsedUsd += ESTIMATED_COST_PER_CALL_USD;

  const resultMeta = {
    model: modelIdentifier,
    latency_ms: Math.max(simulatedLatency, Date.now() - startTime),
    tokens: tokenStats,
    cost_usd: ESTIMATED_COST_PER_CALL_USD,
    fallback_activated: isFallback,
    validation_errors: validation.valid ? [] : validation.errors
  };

  // 8. Cache Valid Plans (Do not cache broken fallbacks)
  if (!isFallback) {
    planCache.set(cacheKey, { plan: finalPlan, meta: resultMeta });
  }

  return {
    success: true,
    cached: false,
    plan: finalPlan,
    meta: resultMeta
  };
}

module.exports = {
  interpretScene,
  getAdapterStatus,
  resetSession,
  computeCacheKey,
  MAX_SESSION_CALLS,
  MAX_SESSION_BUDGET_USD,
  ESTIMATED_COST_PER_CALL_USD
};
