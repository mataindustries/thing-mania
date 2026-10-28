/**
 * THING//MANIA — SAM 3.1 sticker extraction.
 * Opt-in single image segmentation, distinct from Muse Spark GamePlan.
 * No request is sent without explicit user consent. Never logs photo or secret.
 */
'use strict';

const crypto = require('node:crypto');
const SAM_IMAGE_COST_USD = 0.0025; // Published USD price per image, estimate.
const MAX_SAM_CALLS = Math.max(0, Number(process.env.MAX_SAM_CALLS ?? 1));
const samCache = new Map();
let attempts = 0;

function getSamStatus() {
  return {
    model: 'sam-3.1',
    attempts,
    max_attempts: MAX_SAM_CALLS,
    estimated_spend_usd: Number((attempts * SAM_IMAGE_COST_USD).toFixed(4)),
    cached_cutouts: samCache.size
  };
}

function cleanConcept(label) {
  if (typeof label !== 'string') return '';
  // A single concrete noun phrase works best for SAM; no control characters.
  return label.replace(/[\x00-\x1F\x7F<>]/g, '').trim().slice(0, 60);
}

async function segmentSticker({ imageBase64, concept, userConsent } = {}) {
  if (userConsent !== true) throw new Error('CONSENT_REQUIRED');
  if (typeof imageBase64 !== 'string' ||
      !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(imageBase64) ||
      imageBase64.length > 5_000_000) throw new Error('INVALID_IMAGE');
  const noun = cleanConcept(concept);
  if (!noun) throw new Error('INVALID_CONCEPT');
  const key = process.env.MODEL_API_KEY;
  if (!key) throw new Error('NO_API_KEY');
  const hash = crypto.createHash('sha256').update(imageBase64).update(noun.toLowerCase()).digest('hex');
  if (samCache.has(hash)) return { ...samCache.get(hash), cached: true };
  if (attempts >= MAX_SAM_CALLS) throw new Error('SAM_SESSION_LIMIT');
  // Both dependencies are loaded lazily, so ordinary mock mode needs neither.
  const [{ default: OpenAI }, { parseImageStream, recordsOfKind, decodeMaskToSVGPath }] =
    await Promise.all([import('openai'), import('@meta-sam/parser')]);
  const client = new OpenAI({ baseURL: 'https://api.meta.ai/v1', apiKey: key,
                              maxRetries: 0, timeout: 90000 });
  // Charge attempt before sending. Even a failed/empty mask may be billable.
  attempts++;
  const events = await client.responses.create({
    model: 'sam-3.1',
    input: [{
      type: 'message', role: 'user',
      content: [
        { type: 'input_text', text: noun },
        { type: 'input_image', image_url: imageBase64 }
      ]
    }],
    stream: true,
    metadata: { mask_encoding: 'one_bit' }
  });
  const result = await parseImageStream(events).finalResult;
  if (result.outcome.status !== 'completed') throw new Error('SAM_INCOMPLETE');
  const masks = recordsOfKind(result.records, 'mask');
  const boxes = recordsOfKind(result.records, 'box');
  if (!masks.length || !boxes.length) throw new Error('SAM_NO_MATCH');
  // Deterministic main-subject selection: largest matching region.
  const candidates = masks.map(mask => {
    const box = boxes.find(b => b.objectId === mask.objectId);
    if (!box) return null;
    const area = (box.right - box.left) * (box.bottom - box.top);
    return { mask, box, area };
  }).filter(Boolean).sort((a, b) => b.area - a.area);
  if (!candidates.length) throw new Error('SAM_NO_MATCH');
  const { mask, box } = candidates[0];
  const path = decodeMaskToSVGPath(mask.mask);
  if (!path || path.length > 2_000_000) throw new Error('SAM_INVALID_MASK');
  const sticker = {
    success: true,
    cached: false,
    model: 'sam-3.1',
    concept: noun,
    // Mask path is local to the cropped bounding box, not the full photo.
    box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
    path,
    estimated_cost_usd: SAM_IMAGE_COST_USD
  };
  if (samCache.size >= 8) samCache.delete(samCache.keys().next().value);
  samCache.set(hash, sticker);
  return sticker;
}

module.exports = { segmentSticker, getSamStatus, cleanConcept, SAM_IMAGE_COST_USD };
