/**
 * THING//MANIA — Chaos Stage Machine v1
 *
 * Recipes must be deterministic, allowlisted and compatible; remixing must be
 * free (no network) and purely visual (no gameplay RNG, score or timer drift).
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const SM = require('../stage_machine');
const { createDefaultGamePlan, validateGamePlan } = require('../gameplan');

const fixture = name => validateGamePlan(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', `${name}.json`), 'utf8'))).sanitized;
const PLANS = {
  default: createDefaultGamePlan({ label: 'MYSTERY THING' }),
  pumpkin: createDefaultGamePlan({ label: 'Grinning Pumpkin' }),
  sponge: fixture('kitchen_object'),
  toyCar: fixture('toy_car'),
  plush: fixture('stuffed_animal')
};

describe('StageRecipe composition', () => {
  test('same GamePlan + same remix seed always yields the same recipe', () => {
    for (const plan of Object.values(PLANS)) {
      for (const game of SM.GAMES) {
        for (const remix of [0, 1, 7, 42]) {
          const a = SM.composeStage(plan, { game, remix });
          const b = SM.composeStage(JSON.parse(JSON.stringify(plan)), { game, remix });
          assert.deepEqual(a, b);
          assert.equal(a.seed, SM.composeStage(plan, { game, remix }).seed);
        }
      }
    }
  });

  test('every remix produces a different, valid composition', () => {
    for (const plan of Object.values(PLANS)) {
      for (const game of SM.GAMES) {
        let prev = SM.composeStage(plan, { game, remix: 0 });
        for (let remix = 1; remix <= 24; remix++) {
          const next = SM.composeStage(plan, { game, remix });
          assert.ok(SM.validateRecipe(next).ok, `${game} remix ${remix} invalid`);
          assert.notEqual(next.signature, prev.signature, `${game} remix ${remix} repeated ${prev.signature}`);
          if (game === 'wreck') assert.notEqual(next.set, prev.set, 'a WRECK remix always changes the world');
          prev = next;
        }
      }
    }
  });

  test('every module choice comes from the allowlist and fits its set', () => {
    for (const plan of Object.values(PLANS)) {
      for (const game of SM.GAMES) {
        for (let remix = 0; remix < 60; remix++) {
          const r = SM.composeStage(plan, { game, remix });
          const cat = SM.CATALOG[game];
          assert.ok(Object.hasOwn(cat.set, r.set));
          for (const slot of ['atmosphere', 'props', 'fx']) {
            assert.ok(Object.hasOwn(cat[slot], r[slot]), `${slot} ${r[slot]} not allowlisted`);
            assert.ok(cat[slot][r[slot]].fits.includes(r.set), `${slot} ${r[slot]} does not fit ${r.set}`);
          }
          assert.ok(r.tags.every(t => SM.TAGS.includes(t)));
          assert.ok(Object.isFrozen(r));
        }
      }
    }
  });

  test('incompatible or unknown modules cannot be combined', () => {
    const ok = { set: 'haunted_house', atmosphere: 'haunted_moon', props: 'graveyard', fx: 'fog_bats' };
    assert.ok(SM.buildRecipe('wreck', ok));
    assert.equal(SM.buildRecipe('wreck', { ...ok, atmosphere: 'greasy_sunset' }), null, 'diner sky on the haunted house');
    assert.equal(SM.buildRecipe('wreck', { ...ok, props: 'condiment_alley' }), null);
    assert.equal(SM.buildRecipe('wreck', { ...ok, fx: 'grease_steam' }), null);
    assert.equal(SM.buildRecipe('wreck', { ...ok, set: 'cursed_diner' }), null, 'graveyard props cannot follow the diner');
    for (const bad of ['__proto__', 'constructor', 'toString', 'https://evil.example/x.png', 'alert(1)']) {
      assert.equal(SM.buildRecipe('wreck', { ...ok, set: bad }), null);
      assert.equal(SM.buildRecipe('wreck', { ...ok, atmosphere: bad }), null);
    }
    assert.equal(SM.buildRecipe('beam', ok), null, 'modules are per game');
    assert.equal(SM.buildRecipe('nope', ok), null);
    const forged = { ...SM.composeStage(PLANS.default), atmosphere: 'greasy_sunset' };
    const v = SM.validateRecipe(forged);
    assert.equal(v.ok, false);
    assert.match(v.errors.join(' '), /incompatible/);
    assert.equal(SM.validateRecipe({ ...SM.composeStage(PLANS.default), tags: ['<script>'] }).ok, false);
    assert.throws(() => SM.composeStage(PLANS.default, { game: 'unknown' }));
  });

  test('the director picks a coherent world for the photographed object', () => {
    assert.equal(SM.composeStage(PLANS.pumpkin).set, 'haunted_house');
    assert.equal(SM.composeStage(PLANS.default).signature, 'haunted_house/haunted_moon/graveyard/fog_bats', 'original art is the default');
    assert.equal(SM.composeStage(PLANS.sponge).set, 'cursed_diner');
    const car = SM.composeStage(PLANS.toyCar);
    assert.equal(car.set, 'cursed_diner');
    assert.equal(car.props, 'parking_lot');
    assert.ok(SM.deriveTags(PLANS.sponge).tags.includes('kitchen'));
    assert.ok(SM.deriveTags(PLANS.toyCar).tags.includes('roadside'));
    assert.ok(SM.deriveTags(PLANS.pumpkin).tags.includes('spooky'));
  });

  test('the same object gets a different world after a remix', () => {
    const first = SM.composeStage(PLANS.pumpkin, { remix: 0 });
    const second = SM.composeStage(PLANS.pumpkin, { remix: 1 });
    assert.equal(first.set, 'haunted_house');
    assert.equal(second.set, 'cursed_diner');
    const seen = new Set();
    for (let r = 0; r < 12; r++) seen.add(SM.composeStage(PLANS.pumpkin, { remix: r }).signature);
    assert.ok(seen.size >= 4, `remixes should explore modules, saw ${[...seen]}`);
  });

  test('model text can only influence the stage through safe tags', () => {
    const hostile = createDefaultGamePlan({ label: '<img src=x onerror=alert(1)> soup can' });
    hostile.whimsical_role = 'javascript:fetch("https://evil.example") constructor __proto__';
    const { tags } = SM.deriveTags(hostile);
    assert.ok(tags.every(t => SM.TAGS.includes(t)));
    const r = SM.composeStage(hostile, { remix: 3 });
    assert.ok(SM.validateRecipe(r).ok);
    assert.ok(!JSON.stringify(r).includes('evil'));
  });
});

// The real browser game, offline, with a lightweight DOM/Canvas host.
function arcade({ reduced = false, stageMachine = true } = {}) {
  let now = 1000, fetches = 0;
  const images = [], labels = [], elements = new Map();
  const context = new Proxy({
    measureText: s => ({ width: String(s).length * 12 }),
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    drawImage: (...args) => images.push(args),
    fillText: s => labels.push(s)
  }, { get: (o, k) => o[k] || (() => {}) });
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      hidden: false, disabled: false, dataset: {}, textContent: '', innerHTML: '', checked: true,
      width: 420, height: 640, handlers: {}, getContext: () => context,
      addEventListener(type, fn) { this.handlers[type] = fn; },
      getAnimations: () => [], animate() {}, scrollIntoView() {}, click() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 420, height: 640 }),
      setPointerCapture() {}, toBlob: fn => fn({}), classList: { add() {}, remove() {} }
    });
    return elements.get(id);
  }
  const sandbox = {
    console, performance: { now: () => now }, URLSearchParams, Math,
    document: { querySelector: element, querySelectorAll: () => [], createElement: id => element('new-' + id) },
    window: { GamePlan: { createDefaultGamePlan }, StageMachine: stageMachine ? SM : undefined, matchMedia: () => ({ matches: reduced }), addEventListener() {} },
    location: { search: '?seed=7821' }, requestAnimationFrame() {},
    fetch: async () => { fetches++; return { ok: true, json: async () => ({}) }; },
    navigator: { canShare: () => false }, File: class {},
    URL: { createObjectURL: () => '', revokeObjectURL() {} }, setTimeout() {}
  };
  const source = fs.readFileSync(require.resolve('../game.js'), 'utf8').replace(
    '  applyPlanToStages(activePlan);\n  resetPhysics();',
    '  globalThis.qa={applyPlanToStages,state,update,draw,wreckImpact,startRound,beginSession,setModal,drawWreck,drawLava,stageMachine,random,get activePlan(){return activePlan;}};\n  applyPlanToStages(activePlan);\n  resetPhysics();');
  vm.runInNewContext(source, sandbox);
  const qa = sandbox.qa;
  return {
    qa, element, images, labels,
    get fetches() { return fetches; },
    advance(seconds) { for (let t = 0; t < seconds; t += .01) { now += 10; qa.update(.01); } },
    remix() { now += 1000; element('#remixBtn').handlers.click(); }
  };
}
const pointer = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, preventDefault() {} });

describe('REMIX THE CHAOS in the live game', () => {
  test('remix rebuilds the stage with zero network requests and keeps plan and sprite', () => {
    const a = arcade();
    const sprite = { width: 120, height: 180 };
    a.qa.state.photo = sprite; a.qa.state.cutout = true;
    a.advance(.5);
    const fetchesBefore = a.fetches, plan = a.qa.activePlan, planJson = JSON.stringify(plan);
    assert.equal(a.qa.stageMachine.recipes.wreck.set, 'haunted_house');
    a.qa.beginSession();
    assert.equal(a.element('#remixBtn').hidden, false, 'remix is offered on the WRECK IT ticket');
    a.remix();
    assert.equal(a.qa.stageMachine.recipes.wreck.set, 'cursed_diner');
    assert.equal(a.element('#game').dataset.stage, a.qa.stageMachine.recipes.wreck.signature);
    assert.equal(a.element('#modal').hidden, true, 'the assembly plays on the open stage');
    a.advance(.9);
    a.images.length = 0; a.qa.draw();
    assert.ok(a.images.some(args => args[0] === sprite), 'transparent SAM sprite still rides the crane');
    a.advance(.6);
    assert.equal(a.qa.stageMachine.assemble, 0);
    assert.equal(a.element('#modal').hidden, false, 'ticket returns after ~1.4s');
    assert.match(a.element('#ticketTitle').innerHTML, /THE DINER!/);
    assert.equal(a.fetches, fetchesBefore, 'remix made no API calls');
    assert.equal(a.qa.activePlan, plan); assert.equal(JSON.stringify(a.qa.activePlan), planJson);
    assert.equal(a.qa.state.photo, sprite); assert.equal(a.qa.state.cutout, true);
  });

  test('remix is unavailable while a round is being played', () => {
    const a = arcade();
    a.qa.beginSession(); a.qa.startRound(); a.advance(.3);
    assert.equal(a.qa.state.scene, 'playing');
    const before = a.qa.stageMachine.recipes.wreck;
    a.remix();
    assert.equal(a.qa.stageMachine.recipes.wreck, before);
    assert.equal(a.qa.stageMachine.assemble, 0);
    a.qa.wreckImpact(); a.remix();
    assert.equal(a.qa.state.scene, 'aftermath');
    assert.equal(a.qa.stageMachine.recipes.wreck, before);
  });

  test('visual generation never advances the gameplay RNG', () => {
    const a = arcade();
    a.qa.beginSession();
    const seed = a.qa.state.seed;
    for (let i = 0; i < 4; i++) {
      a.remix();
      for (let f = 0; f < 30; f++) { a.advance(.05); a.qa.draw(); }
      a.qa.drawWreck(); a.qa.drawLava();
    }
    assert.equal(a.qa.state.seed, seed);
  });

  test('scores, timers and rock lanes are identical in every world', () => {
    function playSession(remixes) {
      const a = arcade();
      a.qa.beginSession();
      for (let i = 0; i < remixes; i++) { a.remix(); a.advance(1.5); }
      const signature = a.qa.stageMachine.recipes.wreck.signature;
      a.qa.startRound(); a.advance(.3);
      const canvas = a.element('#game');
      canvas.handlers.pointerdown(pointer(70, 260)); canvas.handlers.pointermove(pointer(60, 270)); canvas.handlers.pointerup(pointer(60, 270));
      const trace = [];
      for (let i = 0; i < 400 && a.qa.state.scene !== 'result'; i++) { a.advance(.01); trace.push(`${a.qa.state.scene}:${a.qa.state.remaining.toFixed(3)}:${a.qa.state.wreck.angle.toFixed(4)}`); }
      const wreck = { score: a.qa.state.score, won: a.qa.state.won[0], trace: trace.join('|') };
      a.qa.state.round = 2; a.qa.startRound(); a.advance(3);
      const rocks = a.qa.state.lava.rocks.map(r => `${r.x}:${r.r.toFixed(3)}:${r.speed.toFixed(3)}`).join(',');
      return { signature, wreck, rocks, seed: a.qa.state.seed };
    }
    const house = playSession(0), diner = playSession(1), third = playSession(2);
    assert.match(house.signature, /^haunted_house/);
    assert.match(diner.signature, /^cursed_diner/);
    for (const other of [diner, third]) {
      assert.equal(other.wreck.score, house.wreck.score);
      assert.equal(other.wreck.won, true);
      assert.equal(other.wreck.trace, house.wreck.trace, 'same swing, same hit frame, same timer');
      assert.equal(other.rocks, house.rocks, 'DODGE IT rock lanes unchanged');
      assert.equal(other.seed, house.seed);
    }
  });

  test('the original haunted house stays the default and stays drawable', () => {
    const a = arcade();
    assert.equal(a.qa.stageMachine.recipes.wreck.signature, 'haunted_house/haunted_moon/graveyard/fog_bats');
    a.labels.length = 0; a.qa.drawWreck();
    assert.ok(a.labels.includes('NO REFUNDS'), 'the crooked house with its sign is on stage');
    a.qa.beginSession(); a.remix(); a.advance(1.5); a.remix(); a.advance(1.5);
    assert.equal(a.qa.stageMachine.recipes.wreck.set, 'haunted_house', 'remixing comes back around');
    const offline = arcade({ stageMachine: false });
    assert.equal(offline.qa.stageMachine.recipes.wreck.set, 'haunted_house', 'without the module the classic stage remains');
  });

  test('the cursed diner paints its own cast: soup can, toast and closed sign', () => {
    const a = arcade();
    a.qa.beginSession(); a.remix(); a.advance(1.5);
    a.qa.startRound(); a.advance(.3);
    a.labels.length = 0; a.qa.drawWreck();
    for (const word of ['SOUP', 'D', 'I', 'N', 'E', 'R']) assert.ok(a.labels.includes(word), `missing ${word}`);
    assert.ok(!a.labels.includes('NO REFUNDS'));
    a.qa.wreckImpact(); a.advance(2.2);
    a.labels.length = 0; a.qa.drawWreck();
    assert.ok(a.labels.includes('CLOSED'));
    assert.ok(a.labels.some(l => /KITCHEN EXORCIST/.test(l)));
  });

  test('reduced motion keeps the assembly short and still restores the ticket', () => {
    const a = arcade({ reduced: true });
    a.qa.beginSession(); a.remix();
    assert.ok(a.qa.stageMachine.assemble <= .6);
    a.advance(.65);
    assert.equal(a.element('#modal').hidden, false);
  });

  test('reset during an assembly cancels it cleanly', () => {
    const a = arcade();
    a.qa.beginSession(); a.remix(); a.advance(.4);
    a.element('#demo').handlers.click();
    assert.equal(a.qa.stageMachine.assemble, 0);
    assert.equal(a.qa.state.scene, 'menu');
    assert.equal(a.element('#modal').hidden, false);
  });
});
