/**
 * THING//MANIA — GamePlan Schema & Validation Tests
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateGamePlan, createDefaultGamePlan, SAFE_BOUNDS, SCHEMA_VERSION } = require('../gameplan');

describe('GamePlan Schema & Safe Bounds Validation', () => {
  test('Default fallback plan is 100% valid and self-contained', () => {
    const fallback = createDefaultGamePlan({ label: 'TEST OBJECT' });
    assert.equal(fallback.schema_version, SCHEMA_VERSION);
    assert.equal(fallback.selected_object.label, 'TEST OBJECT');
    
    const res = validateGamePlan(fallback);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.sanitized.round_modifiers.round1_wreck.launch_impulse, 2.6);
  });

  test('All 3 diverse fixtures validate with zero errors', () => {
    const fixtures = ['toy_car.json', 'kitchen_object.json', 'stuffed_animal.json'];
    for (const file of fixtures) {
      const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', file), 'utf8'));
      const res = validateGamePlan(raw);
      assert.equal(res.valid, true, `Fixture ${file} should be valid: ${res.errors.join(', ')}`);
      assert.equal(res.errors.length, 0);
      assert.ok(res.sanitized.selected_object.label);
      assert.ok(res.sanitized.whimsical_role);
      assert.ok(res.sanitized.announcer_lines.intro);
      assert.ok(res.sanitized.round_modifiers.round1_wreck.launch_impulse >= SAFE_BOUNDS.round1_wreck.launch_impulse.min);
      assert.ok(res.sanitized.round_modifiers.round1_wreck.launch_impulse <= SAFE_BOUNDS.round1_wreck.launch_impulse.max);
    }
  });

  test('Rejects empty detected_objects array', () => {
    const badPlan = {
      schema_version: SCHEMA_VERSION,
      detected_objects: [],
      selected_object: { id: 'ghost' },
      round_modifiers: {}
    };
    const res = validateGamePlan(badPlan);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('non-empty array')));
    // Fallback is provided safely
    assert.ok(res.sanitized);
  });

  test('Anti-hallucination check: Rejects selected_object referencing un-detected object id', () => {
    const hallucinatedPlan = {
      schema_version: SCHEMA_VERSION,
      detected_objects: [
        { id: 'real_cup_1', label: 'Coffee Mug', confidence: 0.95 }
      ],
      selected_object: {
        id: 'fake_saucer_99', // Not in detected_objects!
        label: 'Imaginary Saucer'
      },
      whimsical_role: 'Spectral Dishware',
      round_modifiers: {}
    };
    const res = validateGamePlan(hallucinatedPlan);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('hallucinated id')));
  });

  test('Clamps out-of-range numeric parameters into safe bounds', () => {
    const extremePlan = {
      schema_version: SCHEMA_VERSION,
      detected_objects: [{ id: 'obj_1', label: 'Brick', confidence: 0.9 }],
      selected_object: { id: 'obj_1', label: 'Brick' },
      round_modifiers: {
        round1_wreck: {
          launch_impulse: 999.0, // Way too high! Max is 3.4
          time_limit: 0.1        // Too low! Min is 7.0
        },
        round2_beam: {
          ufo_speed_mult: -5.0,  // Too low! Min is 0.75
          beam_window_px: 500    // Too wide! Max is 85
        },
        round3_lava: {
          rock_speed_min: 5000,
          rock_speed_max: 10,
          hearts: 99
        }
      }
    };
    const res = validateGamePlan(extremePlan);
    // Sanitized values MUST be clamped to safe ranges
    const m = res.sanitized.round_modifiers;
    assert.equal(m.round1_wreck.launch_impulse, SAFE_BOUNDS.round1_wreck.launch_impulse.max);
    assert.equal(m.round1_wreck.time_limit, SAFE_BOUNDS.round1_wreck.time_limit.min);
    assert.equal(m.round2_beam.ufo_speed_mult, SAFE_BOUNDS.round2_beam.ufo_speed_mult.min);
    assert.equal(m.round2_beam.beam_window_px, SAFE_BOUNDS.round2_beam.beam_window_px.max);
    assert.equal(m.round3_lava.hearts, SAFE_BOUNDS.round3_lava.hearts.max);
  });

  test('Rejects unauthorized / unexpected mechanics in round_modifiers', () => {
    const roguePlan = {
      schema_version: SCHEMA_VERSION,
      detected_objects: [{ id: 'obj_1', label: 'Item', confidence: 0.9 }],
      selected_object: { id: 'obj_1', label: 'Item' },
      round_modifiers: {
        round1_wreck: {},
        round2_beam: {},
        round3_lava: {},
        round4_deathmatch: { pvp: true } // Illegal 4th round mechanic!
      }
    };
    const res = validateGamePlan(roguePlan);
    assert.equal(res.valid, false);
    assert.ok(res.errors.some(e => e.includes('round4_deathmatch')));
  });

  test('Handles completely malformed input (null, string, array)', () => {
    assert.equal(validateGamePlan(null).valid, false);
    assert.equal(validateGamePlan('bad').valid, false);
    assert.equal(validateGamePlan([1, 2, 3]).valid, false);
  });
});
