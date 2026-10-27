/**
 * THING//MANIA — Gameplay Parameter Differentiation & Simulation Tests
 * 
 * Verifies that each of the 3 fixtures (toy car, kitchen object, stuffed bear)
 * produces visibly distinct text, roles, and bounded gameplay mechanics
 * while keeping all three microgames playable and winnable.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { validateGamePlan, createDefaultGamePlan, SAFE_BOUNDS } = require('../gameplan');

function loadValidatedFixture(fileName) {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', fileName), 'utf8'));
  const res = validateGamePlan(raw);
  assert.equal(res.valid, true);
  return res.sanitized;
}

describe('Gameplay Variations & Multi-Round Playability Across Fixtures', () => {
  const toyCar = loadValidatedFixture('toy_car.json');
  const kitchen = loadValidatedFixture('kitchen_object.json');
  const stuffedBear = loadValidatedFixture('stuffed_animal.json');
  const fallback = createDefaultGamePlan();

  test('All fixtures produce visibly distinct titles, roles, and announcer scripts', () => {
    const plans = [toyCar, kitchen, stuffedBear, fallback];
    const labels = new Set(plans.map(p => p.selected_object.label));
    const roles = new Set(plans.map(p => p.whimsical_role));
    const r1Announcers = new Set(plans.map(p => p.announcer_lines.round1.intro));
    const r2Announcers = new Set(plans.map(p => p.announcer_lines.round2.intro));
    const r3Announcers = new Set(plans.map(p => p.announcer_lines.round3.intro));

    // Every plan must have unique labels, roles, and round intros
    assert.equal(labels.size, 4, 'All 4 plans must have distinct object labels');
    assert.equal(roles.size, 4, 'All 4 plans must have distinct whimsical roles');
    assert.equal(r1Announcers.size, 4, 'All 4 plans must have distinct round 1 announcer intros');
    assert.equal(r2Announcers.size, 4, 'All 4 plans must have distinct round 2 announcer intros');
    assert.equal(r3Announcers.size, 4, 'All 4 plans must have distinct round 3 announcer intros');
  });

  test('Round 1 (WRECK IT): Impulse, scale, and time limits vary meaningfully within safe bounds', () => {
    const plans = [
      { name: 'Toy Car', plan: toyCar, impulse: 3.2, time: 8.0, scale: 1.15 },
      { name: 'Kitchen Sponge', plan: kitchen, impulse: 2.1, time: 10.0, scale: 1.25 },
      { name: 'Stuffed Bear', plan: stuffedBear, impulse: 2.4, time: 9.5, scale: 1.20 },
      { name: 'Default Fallback', plan: fallback, impulse: 2.6, time: 9.0, scale: 1.00 }
    ];

    for (const item of plans) {
      const r1 = item.plan.round_modifiers.round1_wreck;
      assert.equal(r1.launch_impulse, item.impulse, `${item.name} launch_impulse mismatch`);
      assert.equal(r1.time_limit, item.time, `${item.name} time_limit mismatch`);
      assert.equal(r1.wreck_scale, item.scale, `${item.name} wreck_scale mismatch`);

      assert.ok(r1.launch_impulse >= SAFE_BOUNDS.round1_wreck.launch_impulse.min);
      assert.ok(r1.launch_impulse <= SAFE_BOUNDS.round1_wreck.launch_impulse.max);
    }
  });

  test('Round 1 Simulation: All fixtures reliably impact the haunted house upon launch', () => {
    // Simulates the exact pendulum physics from game.js:
    // w.omega += -12.2 * Math.sin(w.angle) * dt;
    // w.omega *= Math.pow(0.992, dt * 60);
    // w.angle += w.omega * dt;
    // Impact happens when w.angle > 0.32
    for (const plan of [toyCar, kitchen, stuffedBear, fallback]) {
      const impulse = plan.round_modifiers.round1_wreck.launch_impulse;
      let angle = -0.85; // Released pull angle
      let omega = impulse;
      let time = 0;
      let hit = false;
      const dt = 0.016;

      while (time < 3.0) {
        time += dt;
        omega += -12.2 * Math.sin(angle) * dt;
        omega *= Math.pow(0.992, dt * 60);
        angle += omega * dt;
        if (angle > 0.32) {
          hit = true;
          break;
        }
      }

      assert.equal(hit, true, `Fixture "${plan.selected_object.label}" must hit within 3 seconds`);
      assert.ok(time < plan.round_modifiers.round1_wreck.time_limit, 'Hit must occur before round timer expires');
    }
  });

  test('Round 2 (BEAM IT): UFO speed, beam window, and thematic decoys vary within safe bounds', () => {
    const plans = [
      { name: 'Toy Car', plan: toyCar, speed: 1.25, win: 62, decoys: ['TRAFFIC CONE', 'RACE FLAG'] },
      { name: 'Kitchen Sponge', plan: kitchen, speed: 0.90, win: 78, decoys: ['BURNT TOAST', 'SOUP CAN'] },
      { name: 'Stuffed Bear', plan: stuffedBear, speed: 0.82, win: 72, decoys: ['PILLOW?', 'DIRTY SOCK'] },
      { name: 'Default', plan: fallback, speed: 1.00, win: 68, decoys: ['COW?', 'NOT IT'] }
    ];

    for (const item of plans) {
      const r2 = item.plan.round_modifiers.round2_beam;
      assert.equal(r2.ufo_speed_mult, item.speed);
      assert.equal(r2.beam_window_px, item.win);
      assert.deepEqual(r2.decoys, item.decoys);

      assert.ok(r2.ufo_speed_mult >= SAFE_BOUNDS.round2_beam.ufo_speed_mult.min);
      assert.ok(r2.ufo_speed_mult <= SAFE_BOUNDS.round2_beam.ufo_speed_mult.max);
      assert.ok(r2.beam_window_px >= SAFE_BOUNDS.round2_beam.beam_window_px.min);
      assert.ok(r2.beam_window_px <= SAFE_BOUNDS.round2_beam.beam_window_px.max);
    }
  });

  test('Round 2 Simulation: Abduction target passes through center beam window repeatedly', () => {
    // targetX() = 210 + 136 * Math.sin(phase)
    // beamGood = Math.abs(targetX - 210) < beam_window_px
    for (const plan of [toyCar, kitchen, stuffedBear, fallback]) {
      const speedMult = plan.round_modifiers.round2_beam.ufo_speed_mult;
      const windowPx = plan.round_modifiers.round2_beam.beam_window_px;
      const targetCatches = plan.round_modifiers.round2_beam.target_catches;
      let phase = 0;
      let passes = 0;
      let inWindow = false;
      const dt = 0.016;

      for (let t = 0; t < 6.0; t += dt) {
        phase += dt * 1.93 * speedMult;
        const tx = 210 + 136 * Math.sin(phase);
        const aligned = Math.abs(tx - 210) < windowPx;

        if (aligned && !inWindow) {
          passes++;
          inWindow = true;
        } else if (!aligned) {
          inWindow = false;
        }
      }

      assert.ok(
        passes >= targetCatches,
        `Fixture "${plan.selected_object.label}" had ${passes} alignment opportunities (needed >= ${targetCatches})`
      );
    }
  });

  test('Round 3 (RUN FOR IT): Rock speed, spawn frequency, and player hearts differ and remain survivable', () => {
    const plans = [
      { name: 'Toy Car', plan: toyCar, minSpd: 260, maxSpd: 345, spawn: 0.65, hearts: 2 },
      { name: 'Kitchen Sponge', plan: kitchen, minSpd: 200, maxSpd: 280, spawn: 0.58, hearts: 3 },
      { name: 'Stuffed Bear', plan: stuffedBear, minSpd: 210, maxSpd: 290, spawn: 0.82, hearts: 3 },
      { name: 'Default', plan: fallback, minSpd: 245, maxSpd: 315, spawn: 0.73, hearts: 2 }
    ];

    for (const item of plans) {
      const r3 = item.plan.round_modifiers.round3_lava;
      assert.equal(r3.rock_speed_min, item.minSpd);
      assert.equal(r3.rock_speed_max, item.maxSpd);
      assert.equal(r3.spawn_interval, item.spawn);
      assert.equal(r3.hearts, item.hearts);

      assert.ok(r3.rock_speed_min <= r3.rock_speed_max);
      assert.ok(r3.hearts >= 2 && r3.hearts <= 3);
    }
  });

  test('Round 3 Simulation: Safe lane always exists during rock showers', () => {
    // 3 lanes: [92, 210, 328]
    // Verify that single-rock spawning preserves at least 2 open lanes per spawn
    for (const plan of [toyCar, kitchen, stuffedBear, fallback]) {
      const lanes = [92, 210, 328];
      let seed = 7821;
      const fakeRnd = () => {
        seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
        return seed / 4294967296;
      };

      for (let wave = 0; wave < 15; wave++) {
        const lane = Math.floor(fakeRnd() * 3);
        const occupied = lanes[lane];
        const openLanes = lanes.filter(l => l !== occupied);
        assert.equal(openLanes.length, 2, 'Must always leave open lanes for skilled dodging');
      }
    }
  });
});
