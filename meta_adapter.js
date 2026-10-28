/**
 * THING//MANIA — Meta Model API Adapter (v2.0.0)
 *
 * Secure backend adapter for Meta Muse Spark 1.3 scene interpretation.
 *
 * Key Principles:
 * 1. MODEL_API_KEY lives ONLY in a server-side env var. Never logged, never sent
 *    to the client, never included in any status/error response.
 * 2. Explicit userConsent === true is required before any photo bytes move.
 * 3. Application-level hard budget ceiling ($1.00 USD default) and per-session
 *    call limit (10 calls default). These are hard stops, not soft alerts.
 * 4. SHA-256 content-hash caching deduplicates identical requests at zero cost.
 * 5. Robust fallbacks for timeouts, malformed responses, and empty detections.
 * 6. MOCK_MODE=true is the default – no live spend without explicit opt-in.
 * 7. Real API path: POST https://api.meta.ai/v1/chat/completions
 *    model: muse-spark-1.3, response_format: {type: "json_schema"}, up to 2 retries.
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const https  = require('https');
const { validateGamePlan, createDefaultGamePlan, SCHEMA_VERSION } = require('./gameplan');

// ── Configuration (environment variables only, never hard-coded secrets) ──────
const MODEL_API_KEY         = process.env.MODEL_API_KEY || '';
const MODEL_ENDPOINT        = process.env.MODEL_ENDPOINT
                              || 'https://api.meta.ai/v1/chat/completions';
const MODEL_NAME            = process.env.MODEL_NAME || 'muse-spark-1.3';
const MOCK_MODE             = process.env.MOCK_MODE !== 'false';  // default: true
const MAX_SESSION_CALLS     = parseInt(process.env.MAX_SESSION_CALLS   || '10',  10);
const MAX_SESSION_BUDGET_USD= parseFloat(process.env.MAX_SESSION_BUDGET_USD || '1.00');
const REQUEST_TIMEOUT_MS    = parseInt(process.env.REQUEST_TIMEOUT_MS  || '15000', 10);
const MAX_RETRIES           = parseInt(process.env.MAX_RETRIES         || '2',   10);
// Muse Spark 1.3 Standard mode: $1.25/M input, $4.25/M output.
// Estimates exclude image-token uncertainty and are NOT a durable/provider billing cap.
const COST_PER_1K_INPUT_USD = parseFloat(process.env.COST_PER_1K_INPUT_USD  || '0.00125');
const COST_PER_1K_OUTPUT_USD= parseFloat(process.env.COST_PER_1K_OUTPUT_USD || '0.00425');

// ── In-memory session state ───────────────────────────────────────────────────
const planCache = new Map();
let sessionState = {
  calls: 0,
  budgetUsedUsd: 0.0,
  cacheHits: 0,
  liveCalls: 0,
  totalPromptTokens: 0,
  totalCompletionTokens: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fixture loader – sanitises id to [a-zA-Z0-9_-] only */
function loadFixture(fixtureId) {
  const safeId = String(fixtureId).replace(/[^a-zA-Z0-9_-]/g, '');
  const fxPath = path.join(__dirname, 'fixtures', `${safeId}.json`);
  if (!fs.existsSync(fxPath)) return null;
  try { return JSON.parse(fs.readFileSync(fxPath, 'utf8')); }
  catch (e) {
    console.error(`[MetaAdapter] Fixture parse error (${safeId}):`, e.message);
    return null;
  }
}

/** SHA-256 content cache key – never contains the raw API key */
function computeCacheKey(payload) {
  const h = crypto.createHash('sha256');
  h.update(`schema:${SCHEMA_VERSION};`);
  h.update(`model:${MODEL_NAME};`);
  if (payload.fixtureId) {
    h.update(`fixture:${payload.fixtureId};`);
  }
  if (payload.imageBase64) {
    const s = String(payload.imageBase64);
    h.update(`img_len:${s.length};`);
    h.update(s); // hash the entire image; different photos must not share a cache key
  }
  if (payload.clientSeed != null) {
    h.update(`seed:${payload.clientSeed};`);
  }
  return h.digest('hex');
}

/** Estimate USD cost from token counts */
function estimateCost(promptTokens, completionTokens) {
  return (
    (promptTokens   / 1000) * COST_PER_1K_INPUT_USD  +
    (completionTokens / 1000) * COST_PER_1K_OUTPUT_USD
  );
}

/** Reset session counters – used by tests and the /api/reset-session route */
function resetSession() {
  sessionState = {
    calls: 0,
    budgetUsedUsd: 0.0,
    cacheHits: 0,
    liveCalls: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
  };
  planCache.clear();
}

/** Public status – must NEVER expose MODEL_API_KEY or any partial secret */
function getAdapterStatus() {
  return {
    mock_mode:              MOCK_MODE,
    has_api_key:            Boolean(MODEL_API_KEY && MODEL_API_KEY !== 'mock_key_for_testing'),
    model:                  MODEL_NAME,
    endpoint:               MODEL_ENDPOINT,
    schema_version:         SCHEMA_VERSION,
    session_calls:          sessionState.calls,
    max_session_calls:      MAX_SESSION_CALLS,
    budget_used_usd:        Number(sessionState.budgetUsedUsd.toFixed(4)),
    max_budget_usd:         MAX_SESSION_BUDGET_USD,
    live_calls:             sessionState.liveCalls,
    cache_entries:          planCache.size,
    cache_hits:             sessionState.cacheHits,
    total_prompt_tokens:    sessionState.totalPromptTokens,
    total_completion_tokens:sessionState.totalCompletionTokens,
  };
}

// ── JSON Schema for response_format ──────────────────────────────────────────
/**
 * Returns the JSON Schema object we pass as response_format.json_schema to the
 * API.  Keeping it tight reduces hallucinations and token usage.
 */
function buildResponseSchema() {
  return {
    name: 'GamePlan',
    strict: true,
    schema: {
      type: 'object',
      required: [
        'schema_version', 'source', 'detected_objects',
        'selected_object', 'whimsical_role', 'announcer_lines', 'round_modifiers'
      ],
      additionalProperties: false,
      properties: {
        schema_version:   { type: 'string', enum: ['1.3.0'] },
        source:           { type: 'string' },
        detected_objects: {
          type: 'array', minItems: 1,
          items: {
            type: 'object',
            required: ['id', 'label', 'confidence', 'bounding_box'],
            additionalProperties: false,
            properties: {
              id:           { type: 'string' },
              label:        { type: 'string' },
              confidence:   { type: 'number', minimum: 0, maximum: 1 },
              bounding_box: { type: 'array', items: { type: 'number' }, minItems: 4, maxItems: 4 }
            }
          }
        },
        selected_object: {
          type: 'object',
          required: ['id', 'label', 'role', 'description'],
          additionalProperties: false,
          properties: {
            id:          { type: 'string' },
            label:       { type: 'string' },
            role:        { type: 'string' },
            description: { type: 'string' }
          }
        },
        whimsical_role:  { type: 'string' },
        announcer_lines: {
          type: 'object',
          required: ['intro', 'round1', 'round2', 'round3', 'summary'],
          additionalProperties: false,
          properties: {
            intro:   { type: 'string' },
            round1:  { type: 'object', required: ['intro','win','lose'], additionalProperties: false,
                       properties: { intro: {type:'string'}, win: {type:'string'}, lose: {type:'string'} } },
            round2:  { type: 'object', required: ['intro','win','lose'], additionalProperties: false,
                       properties: { intro: {type:'string'}, win: {type:'string'}, lose: {type:'string'} } },
            round3:  { type: 'object', required: ['intro','win','lose'], additionalProperties: false,
                       properties: { intro: {type:'string'}, win: {type:'string'}, lose: {type:'string'} } },
            summary: { type: 'string' }
          }
        },
        round_modifiers: {
          type: 'object',
          required: ['round1_wreck', 'round2_beam', 'round3_lava'],
          additionalProperties: false,
          properties: {
            round1_wreck: {
              type: 'object',
              required: ['launch_impulse','time_limit','wreck_scale','theme_title','theme_accent'],
              additionalProperties: false,
              properties: {
                launch_impulse: { type: 'number', minimum: 1.8, maximum: 3.4 },
                time_limit:     { type: 'number', minimum: 7.0, maximum: 12.0 },
                wreck_scale:    { type: 'number', minimum: 0.75, maximum: 1.30 },
                theme_title:    { type: 'string', maxLength: 32 },
                theme_accent:   { type: 'string', pattern: '^#[0-9a-fA-F]{6}$' }
              }
            },
            round2_beam: {
              type: 'object',
              required: ['ufo_speed_mult','beam_window_px','target_catches','time_limit','theme_title','theme_accent','decoys'],
              additionalProperties: false,
              properties: {
                ufo_speed_mult:  { type: 'number', minimum: 0.75, maximum: 1.40 },
                beam_window_px:  { type: 'integer', minimum: 50,  maximum: 85   },
                target_catches:  { type: 'integer', minimum: 2,   maximum: 3    },
                time_limit:      { type: 'number',  minimum: 8.0, maximum: 13.0 },
                theme_title:     { type: 'string',  maxLength: 32 },
                theme_accent:    { type: 'string',  pattern: '^#[0-9a-fA-F]{6}$' },
                decoys:          { type: 'array', items: {type:'string', maxLength:16}, minItems:2, maxItems:2 }
              }
            },
            round3_lava: {
              type: 'object',
              required: ['rock_speed_min','rock_speed_max','spawn_interval','hearts','time_limit','theme_title','theme_accent'],
              additionalProperties: false,
              properties: {
                rock_speed_min:  { type: 'integer', minimum: 180, maximum: 260 },
                rock_speed_max:  { type: 'integer', minimum: 270, maximum: 360 },
                spawn_interval:  { type: 'number',  minimum: 0.55, maximum: 0.95 },
                hearts:          { type: 'integer', minimum: 2,   maximum: 3    },
                time_limit:      { type: 'number',  minimum: 8.0, maximum: 13.0 },
                theme_title:     { type: 'string',  maxLength: 32 },
                theme_accent:    { type: 'string',  pattern: '^#[0-9a-fA-F]{6}$' }
              }
            }
          }
        }
      }
    }
  };
}

// ── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the THING//MANIA Game Director for Meta Muse Spark 1.3.

Given a photo of everyday household objects, produce a single JSON GamePlan object that drives a chaotic three-round arcade game. The JSON must conform exactly to the provided schema.

Rules:
- detected_objects: list every clearly visible object with a stable short id (e.g. "obj_1"), short label, confidence 0-1, and bounding_box [x_min,y_min,x_max,y_max] as fractions 0-1.
- selected_object.id MUST match one of the ids in detected_objects. Never invent objects.
- whimsical_role: a punchy, funny 5-10 word character description of the selected object.
- announcer_lines: short, funny arcade-announcer-style sentences. Max 180 characters each.
- round_modifiers: tune gameplay within the allowed numeric ranges. Heavier/faster objects → higher launch_impulse, faster rocks. Soft/lightweight objects → lower values, extra heart. Adjust theme_title (max 32 chars) and theme_accent (valid #RRGGBB hex) to match the object's character.
- schema_version must be exactly "1.3.0".
- source must be "meta_muse_spark_1.3".
- Output ONLY the JSON object, no commentary.`;

// ── Low-level HTTPS request (no external dependencies) ────────────────────────
/**
 * Sends one HTTPS POST to url with JSON body, returns parsed response body.
 * Rejects on non-2xx, network error, or timeout.
 * The API key is read from the closure-captured constant; it never appears in
 * logs or thrown error messages.
 */
function httpsPost(url, headers, bodyObj, timeoutMs) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(bodyObj);
    const parsed  = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port || 443,
      path:     parsed.pathname + parsed.search,
      method:   'POST',
      headers: {
        ...headers,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
          catch (e) { reject(new Error(`API_JSON_PARSE_ERROR: ${e.message}`)); }
        } else {
          // Upstream error bodies may contain sensitive content: never echo them to clients/logs.
          reject(new Error(`API_HTTP_${res.statusCode}`));
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`GATEWAY_TIMEOUT: Meta Model API request timed out after ${timeoutMs}ms.`));
    });

    req.on('error', (e) => {
      reject(new Error(`API_NETWORK_ERROR: ${e.message}`));
    });

    req.write(bodyStr);
    req.end();
  });
}

// ── Live API call with retry logic ────────────────────────────────────────────
/**
 * Calls the real Meta Muse Spark 1.3 API with up to MAX_RETRIES retries on
 * transient failures (network errors, 5xx, timeout).
 * Returns { rawData, modelId, usage } or throws a classified error.
 *
 * IMPORTANT: MODEL_API_KEY is used only here, in the Authorization header.
 * It is never interpolated into log strings or error messages.
 */
async function callLiveAPI(imageDataUrl) {
  if (!MODEL_API_KEY) {
    throw new Error('NO_API_KEY: MODEL_API_KEY environment variable is not set. Cannot make live requests.');
  }
  // Reject obviously wrong key shapes (no partial key in error msg)
  if (MODEL_API_KEY.length < 16) {
    throw new Error('INVALID_API_KEY: MODEL_API_KEY appears malformed. Check your .env file.');
  }

  // Build the messages array
  const userContent = imageDataUrl
    ? [
        { type: 'text',      text: 'Analyse the objects in this photo and produce the GamePlan JSON.' },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]
    : [
        { type: 'text', text: 'No photo provided. Produce a generic GamePlan JSON for a mystery object.' },
      ];

  const requestBody = {
    model: MODEL_NAME,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userContent  },
    ],
    response_format: {
      type:        'json_schema',
      json_schema: buildResponseSchema(),
    },
    max_tokens:   1800,
    temperature:  0.7,
  };

  // Auth header built here; key never touches a string we might log
  const authHeaders = { Authorization: `Bearer ${MODEL_API_KEY}` };

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential back-off: 1 s, 2 s
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
    try {
      const response = await httpsPost(MODEL_ENDPOINT, authHeaders, requestBody, REQUEST_TIMEOUT_MS);
      const body     = response.body;

      // Validate expected OpenAI-compatible chat completions shape
      if (!body.choices || !body.choices[0] || !body.choices[0].message) {
        throw new Error('API_BAD_SHAPE: Response missing choices[0].message');
      }

      const rawContent  = body.choices[0].message.content;
      const modelId     = body.model || MODEL_NAME;
      const usage       = body.usage || {};
      const promptTok   = usage.prompt_tokens     || 0;
      const completeTok = usage.completion_tokens || 0;

      // Parse the content string as JSON
      let parsed;
      try {
        parsed = JSON.parse(rawContent);
      } catch (e) {
        throw new Error(`API_CONTENT_NOT_JSON: Model returned non-JSON content – ${e.message}`);
      }

      return {
        rawData:    parsed,
        modelId,
        usage: {
          prompt_tokens:     promptTok,
          completion_tokens: completeTok,
          total_tokens:      promptTok + completeTok,
        },
      };
    } catch (err) {
      lastError = err;
      const isRetryable = (
        err.message.startsWith('API_NETWORK_ERROR') ||
        err.message.startsWith('GATEWAY_TIMEOUT')   ||
        err.message.startsWith('API_HTTP_5')        // 5xx
      );
      if (!isRetryable || attempt === MAX_RETRIES) break;
      console.warn(`[MetaAdapter] Attempt ${attempt + 1} failed, retrying: ${err.message.slice(0, 80)}`);
    }
  }
  throw lastError;
}

// ── Resize image for API submission ──────────────────────────────────────────
/**
 * Validates and normalises the base64 data URL received from the browser.
 * Currently returns it unchanged – resizing would require canvas or sharp.
 * The max image size is enforced via the 12 MB body limit in server.js.
 * Returns null if the value is falsy or clearly not a data URL.
 */
function normaliseImageDataUrl(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== 'string') return null;
  // Accept existing data URLs or bare base64; normalise to data URL
  if (imageBase64.startsWith('data:image/')) return imageBase64;
  // Bare base64 – assume JPEG
  return `data:image/jpeg;base64,${imageBase64}`;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────
/**
 * Main Scene Interpretation Pipeline
 *
 * @param {Object}  options
 * @param {string}  [options.imageBase64]   – data URL from browser (FileReader result)
 * @param {boolean}  options.userConsent    – MUST be true; gate for photo transmission
 * @param {string}  [options.fixtureId]     – 'toy_car' | 'kitchen_object' | 'stuffed_animal'
 * @param {number}  [options.clientSeed]    – reproducible RNG seed from arcade client
 * @param {boolean} [options.simulateTimeout]  – test flag
 * @param {boolean} [options.simulateMalformed]– test flag
 * @param {boolean} [options.simulateEmpty]    – test flag
 * @param {boolean} [options.simulateNoKey]    – test flag: force no-key branch
 * @param {boolean} [options.simulateBadKey]   – test flag: force bad-key branch
 * @returns {Promise<Object>} { success, cached, plan, meta }
 */
async function interpretScene(options = {}) {
  const startTime = Date.now();

  // ── 1. Consent gate ────────────────────────────────────────────────────────
  if (options.userConsent !== true) {
    throw new Error('CONSENT_REQUIRED: User consent is mandatory before processing or transmitting photo data.');
  }

  // ── 2. Cache check ─────────────────────────────────────────────────────────
  const cacheKey = computeCacheKey(options);
  if (planCache.has(cacheKey)) {
    sessionState.cacheHits++;
    const hit = planCache.get(cacheKey);
    return {
      success: true,
      cached: true,
      plan: hit.plan,
      meta: {
        model:   hit.meta.model,
        latency_ms: Date.now() - startTime,
        tokens:  { prompt: 0, completion: 0, total: 0 },
        cost_usd: 0.00,
        source:  'cache_hit',
        fallback_activated: false,
        validation_errors:  [],
      },
    };
  }

  // ── 3. Budget & call limit hard stop ───────────────────────────────────────
  if (sessionState.calls >= MAX_SESSION_CALLS) {
    throw new Error(
      `SESSION_LIMIT_EXCEEDED: Maximum session API calls (${MAX_SESSION_CALLS}) reached. ` +
      'Application hard stop enforced to protect budget.'
    );
  }
  if (sessionState.budgetUsedUsd >= MAX_SESSION_BUDGET_USD) {
    throw new Error(
      `BUDGET_EXCEEDED: Session spending budget ($${MAX_SESSION_BUDGET_USD.toFixed(2)}) ` +
      'reached. Application hard stop enforced.'
    );
  }

  // ── 4. Test simulation flags ───────────────────────────────────────────────
  if (options.simulateTimeout) {
    await new Promise(r => setTimeout(r, 60));
    throw new Error(`GATEWAY_TIMEOUT: Meta Model API request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
  }
  if (options.simulateNoKey) {
    throw new Error('NO_API_KEY: MODEL_API_KEY environment variable is not set. Cannot make live requests.');
  }
  if (options.simulateBadKey) {
    throw new Error('INVALID_API_KEY: MODEL_API_KEY appears malformed. Check your .env file.');
  }

  // ── 5. Execution branch ────────────────────────────────────────────────────
  let rawResponseData = null;
  let modelIdentifier = 'muse-spark-1.3-mock';
  let tokenStats      = { prompt: 340, completion: 210, total: 550 };
  let callCostUsd     = estimateCost(tokenStats.prompt, tokenStats.completion);

  const useMock = MOCK_MODE || options.fixtureId || (!MODEL_API_KEY);

  if (useMock) {
    // ── Mock / fixture path ────────────────────────────────────────────────
    if (options.simulateMalformed) {
      rawResponseData = { broken_syntax: true, note: 'corrupt payload simulation' };
    } else if (options.simulateEmpty) {
      rawResponseData = {
        schema_version:   SCHEMA_VERSION,
        detected_objects: [],
        selected_object:  { id: 'ghost' },
      };
    } else if (options.fixtureId) {
      const fx = loadFixture(options.fixtureId);
      if (fx) { rawResponseData = fx; }
      else { throw new Error(`FIXTURE_NOT_FOUND: Unknown fixture "${options.fixtureId}".`); }
    } else if (options.imageBase64) {
      // Deterministic fixture selection by image hash (no spend)
      const h   = crypto.createHash('md5').update(options.imageBase64).digest('hex');
      const idx = parseInt(h.slice(0, 6), 16) % 3;
      const fxIds = ['toy_car', 'kitchen_object', 'stuffed_animal'];
      rawResponseData = loadFixture(fxIds[idx]) || createDefaultGamePlan({ label: 'MOCK PHOTO THING' });
    } else {
      rawResponseData = createDefaultGamePlan({ label: 'MYSTERY OBJECT' });
    }

    // Mock tokens / cost are simulated but still deducted for test accounting
    callCostUsd = estimateCost(tokenStats.prompt, tokenStats.completion);

  } else {
    // ── Live Meta Muse Spark path ──────────────────────────────────────────
    const imageDataUrl = normaliseImageDataUrl(options.imageBase64);
    const liveResult   = await callLiveAPI(imageDataUrl);

    rawResponseData  = liveResult.rawData;
    modelIdentifier  = liveResult.modelId;
    tokenStats       = liveResult.usage;
    callCostUsd      = estimateCost(tokenStats.prompt_tokens, tokenStats.completion_tokens);

    // Update live-call counters
    sessionState.liveCalls++;
    sessionState.totalPromptTokens     += tokenStats.prompt_tokens     || 0;
    sessionState.totalCompletionTokens += tokenStats.completion_tokens || 0;
  }

  // ── 6. Validate & sanitise ─────────────────────────────────────────────────
  const validation = validateGamePlan(rawResponseData);
  let finalPlan   = null;
  let isFallback  = false;

  if (validation.valid) {
    finalPlan = validation.sanitized;
  } else {
    console.warn('[MetaAdapter] Validation failed, engaging safe fallback plan:', validation.errors);
    finalPlan  = createDefaultGamePlan({ label: 'OFFLINE BACKUP' });
    isFallback = true;
  }

  // ── 7. Session accounting ──────────────────────────────────────────────────
  sessionState.calls++;
  sessionState.budgetUsedUsd += callCostUsd;

  const resultMeta = {
    model:              modelIdentifier,
    latency_ms:         Date.now() - startTime,
    tokens: {
      prompt:     tokenStats.prompt_tokens     || tokenStats.prompt     || 0,
      completion: tokenStats.completion_tokens || tokenStats.completion || 0,
      total:      tokenStats.total_tokens      || tokenStats.total      || 0,
    },
    cost_usd:           Number(callCostUsd.toFixed(6)),
    source:             useMock ? 'mock' : 'live_api',
    fallback_activated: isFallback,
    validation_errors:  isFallback ? validation.errors : [],
  };

  // ── 8. Cache valid plans only ──────────────────────────────────────────────
  if (!isFallback) {
    planCache.set(cacheKey, { plan: finalPlan, meta: resultMeta });
  }

  return {
    success: true,
    cached:  false,
    plan:    finalPlan,
    meta:    resultMeta,
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
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
};
