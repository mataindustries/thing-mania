/**
 * THING//MANIA — Local Backend Server & Meta Model Proxy (v1.3.0)
 * 
 * Standard library Node.js HTTP server. Zero third-party runtime dependencies.
 * 
 * Functions:
 * 1. Hosts the static arcade app (index.html, game.js, styles.css, etc.).
 * 2. Securely proxies requests to Meta Model API / Mock Director.
 * 3. Keeps MODEL_API_KEY server-side.
 * 4. Enforces explicit user consent before accepting any photo payload.
 * 5. Enforces application-level budget ceiling and session limits.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { interpretScene, getAdapterStatus, resetSession } = require('./meta_adapter');
const { createDefaultGamePlan } = require('./gameplan');
const { segmentSticker, getSamStatus } = require('./sam_adapter');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const FIXTURES_METADATA = [
  {
    id: 'toy_car',
    title: 'Vintage Die-Cast Hot Rod',
    role: 'V8 Supercharged Battering Ram',
    tuning: 'Heavy impact (impulse 3.2), high-speed UFO, fast falling magma',
    file: 'fixtures/toy_car.json'
  },
  {
    id: 'kitchen_object',
    title: 'Soggy Kitchen Sponge',
    role: 'Absorbent Moisture Commander',
    tuning: 'Bouncy swing, forgiving beam window (78px), popcorn rocks, 3 hearts',
    file: 'fixtures/kitchen_object.json'
  },
  {
    id: 'stuffed_animal',
    title: 'Professor Fluffington (Plush Bear)',
    role: 'Diplomatic Plush Ambassador',
    tuning: 'Floaty swing, slow UFO drift (0.82x), gentle pumice showers, 3 hearts',
    file: 'fixtures/stuffed_animal.json'
  }
];

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
}

function sendJson(res, statusCode, data) {
  setSecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

function readBody(req, limitBytes = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytesReceived = 0;
    req.on('data', chunk => {
      bytesReceived += chunk.length;
      if (bytesReceived > limitBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE: Request exceeds 12 MB limit.'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('MALFORMED_JSON: Invalid JSON in request body.'));
      }
    });
    req.on('error', reject);
  });
}

const PUBLIC_FILES = new Set(['index.html', 'styles.css', 'game.js', 'gameplan.js', 'favicon.ico']);

function serveStatic(req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  // Explicit allowlist: never serve .env, source-only files, tests, git internals, or credentials.
  if (!PUBLIC_FILES.has(relativePath)) {
    setSecurityHeaders(res);
    res.statusCode = 404;
    res.end('404 Not Found');
    return;
  }
  const filePath = path.join(__dirname, relativePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    setSecurityHeaders(res);
    res.setHeader('Content-Type', contentType);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

function createServer() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    // Same-origin browser client only. Do not expose permissive cross-origin access.

    if (method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      // 1. Adapter Status API
      if (method === 'GET' && pathname === '/api/status') {
        const status = getAdapterStatus();
        return sendJson(res, 200, {
          status: 'online',
          adapter: status,
          sam: getSamStatus()
        });
      }

      // 2. Fixtures List API
      if (method === 'GET' && pathname === '/api/fixtures') {
        return sendJson(res, 200, {
          fixtures: FIXTURES_METADATA
        });
      }

      // 3. Reset Session API (for test runs)
      if (method === 'POST' && pathname === '/api/reset-session') {
        if (process.env.MOCK_MODE === 'false') {
          return sendJson(res, 403, { success: false, error: 'Session reset disabled during live API mode.' });
        }
        resetSession();
        return sendJson(res, 200, { success: true, message: 'Mock session reset.' });
      }

      // 4. Optional SAM 3.1 cutout: requires a distinct affirmative click.
      // Same origin, server-held credentials, bounded to one paid image request.
      if (method === 'POST' && pathname === '/api/sticker/cutout') {
        let payload;
        try { payload = await readBody(req, 6 * 1024 * 1024); }
        catch (_) { return sendJson(res, 400, { success: false, error: 'INVALID_IMAGE_PAYLOAD' }); }
        if (payload.userConsent !== true) {
          return sendJson(res, 403, { success: false, error: 'CONSENT_REQUIRED' });
        }
        if (process.env.MOCK_MODE !== 'false') {
          return sendJson(res, 409, { success: false, error: 'SAM_REQUIRES_LIVE_MODE' });
        }
        try {
          const result = await segmentSticker(payload);
          return sendJson(res, 200, result);
        } catch (e) {
          // Do not echo upstream errors or private image details to the browser.
          const code = String(e.message || '');
          const allowed = new Set([
            'CONSENT_REQUIRED', 'INVALID_IMAGE', 'INVALID_CONCEPT',
            'NO_API_KEY', 'SAM_SESSION_LIMIT', 'SAM_INCOMPLETE',
            'SAM_NO_MATCH', 'SAM_INVALID_MASK'
          ]);
          const safe = allowed.has(code) ? code : 'SAM_API_ERROR';
          console.warn('[SAM] Cutout failed:', safe);
          return sendJson(res, code === 'SAM_SESSION_LIMIT' ? 429 : 422,
            { success: false, error: safe, sam: getSamStatus() });
        }
      }

      // 4. Meta Scene Interpretation API
      if (method === 'POST' && pathname === '/api/director/plan') {
        let payload;
        try {
          payload = await readBody(req);
        } catch (err) {
          return sendJson(res, 400, {
            success: false,
            error: err.message,
            fallback_plan: createDefaultGamePlan({ label: 'PARSER ERROR FALLBACK' })
          });
        }

        // Strict Consent Gate
        if (payload.userConsent !== true) {
          return sendJson(res, 400, {
            success: false,
            error: 'CONSENT_REQUIRED: Photo data is never processed or uploaded without explicit user confirmation.',
            fallback_plan: createDefaultGamePlan({ label: 'NO CONSENT (OFFLINE)' })
          });
        }

        try {
          const result = await interpretScene(payload);
          return sendJson(res, 200, result);
        } catch (adapterErr) {
          console.warn('[Server] Scene interpretation warning:', adapterErr.message);

          if (adapterErr.message.includes('SESSION_LIMIT_EXCEEDED') || adapterErr.message.includes('BUDGET_EXCEEDED')) {
            return sendJson(res, 429, {
              success: false,
              error: adapterErr.message,
              fallback_plan: createDefaultGamePlan({ label: 'BUDGET CEILING FALLBACK' })
            });
          }

          if (adapterErr.message.includes('GATEWAY_TIMEOUT')) {
            return sendJson(res, 504, {
              success: false,
              error: adapterErr.message,
              fallback_plan: createDefaultGamePlan({ label: 'TIMEOUT FALLBACK' })
            });
          }

          return sendJson(res, 500, {
            success: false,
            error: adapterErr.message,
            fallback_plan: createDefaultGamePlan({ label: 'RECOVERED FALLBACK' })
          });
        }
      }

      // 5. Static File Serving
      if (method === 'GET') {
        return serveStatic(req, res, pathname);
      }

      res.statusCode = 405;
      res.end('Method Not Allowed');
    } catch (unhandledErr) {
      console.error('[Server] Unhandled server error:', unhandledErr);
      sendJson(res, 500, {
        success: false,
        error: 'Internal server error',
        fallback_plan: createDefaultGamePlan({ label: 'SYSTEM ERROR FALLBACK' })
      });
    }
  });

  return server;
}

// Auto-start when executed directly
if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(` THING//MANIA Local Backend & Mock Meta Director`);
    console.log(` Running at http://localhost:${PORT}`);
    console.log(` MOCK_MODE: ${process.env.MOCK_MODE !== 'false' ? 'ACTIVE (zero billable API calls)' : 'LIVE'}`);
    console.log(` Status: http://localhost:${PORT}/api/status`);
    console.log(`====================================================`);
  });
}

module.exports = { createServer, PORT, HOST };
