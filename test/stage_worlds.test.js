/**
 * THING//MANIA — Chaos Stage Machine v2: BEAM IT and DODGE IT worlds
 *
 * ALIEN DRIVE-THROUGH and INDUSTRIAL MELTDOWN join the original NIGHT FARM and
 * VOLCANO. Recipes stay deterministic, allowlisted and compatible; remixing
 * stays free and purely visual; player-facing copy always names the world
 * that is actually on stage.
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
const NEW_SETS = { beam: 'alien_drive_through', dodge: 'industrial_meltdown' };
const OLD_SETS = { beam: 'night_farm', dodge: 'volcano' };
// Words that must never describe a world they do not belong to.
const OFF_WORLD = {
  industrial_meltdown: /\b(volcan\w*|lava|magma|calderas?|craters?|erupt\w*|pumice)\b/i,
  volcano: /\b(foundr(y|ies)|factor(y|ies)|smelters?|furnaces?|molten steel|slag|meltdown)\b/i,
  alien_drive_through: /\b(farm\w*|barn\w*|silos?|cornfields?|pastures?|haystacks?)\b/i,
  night_farm: /\b(drive[- ]?thr(u|ough)|restaurants?|takeout|zorp)\b/i
};

describe('Stage Machine v2 catalog', () => {
  test('both new sets compose valid, frozen StageRecipes', () => {
    for (const [game, set] of Object.entries(NEW_SETS)) {
      let found = 0;
      for (const plan of Object.values(PLANS)) {
        for (let remix = 0; remix < 40; remix++) {
          const r = SM.composeStage(plan, { game, remix });
          if (r.set !== set) continue;
          found++;
          assert.deepEqual(SM.validateRecipe(r), { ok: true, errors: [] });
          assert.ok(Object.isFrozen(r) && Object.isFrozen(r.labels) && Object.isFrozen(r.tags));
          assert.equal(r.version, '2.0.0');
          assert.equal(r.signature, `${r.set}/${r.atmosphere}/${r.props}/${r.fx}`);
          assert.equal(r.labels.set, SM.CATALOG[game].set[set].label);
          assert.ok(!/https?:|<|\(/.test(JSON.stringify(r)), 'recipes are plain allowlisted data');
        }
      }
      assert.ok(found >= 40, `${set} should appear on many remixes, saw ${found}`);
    }
    assert.equal(SM.composeStage(PLANS.default, { game: 'beam', remix: 1 }).title, 'THE ALIEN DRIVE-THROUGH');
    assert.equal(SM.composeStage(PLANS.default, { game: 'dodge', remix: 1 }).title, 'INDUSTRIAL MELTDOWN');
  });

  test('every module names real sets, and only painted-together modules combine', () => {
    for (const game of SM.GAMES) {
      const cat = SM.CATALOG[game], sets = Object.keys(cat.set);
      for (const slot of ['atmosphere', 'props', 'fx'])
        for (const [id, mod] of Object.entries(cat[slot])) {
          assert.ok(mod.fits.length > 0 && mod.fits.every(s => sets.includes(s)), `${game}.${slot}.${id} fits unknown sets`);
          assert.ok(mod.label && Object.values(mod.affinity).every(Number.isInteger));
        }
      // exhaustive: a recipe builds if and only if every module fits the set
      for (const set of sets)
        for (const atmosphere of SM.listModules(game, 'atmosphere'))
          for (const props of SM.listModules(game, 'props'))
            for (const fx of SM.listModules(game, 'fx')) {
              const fits = [['atmosphere', atmosphere], ['props', props], ['fx', fx]].every(([slot, id]) => cat[slot][id].fits.includes(set));
              const built = SM.buildRecipe(game, { set, atmosphere, props, fx });
              assert.equal(Boolean(built), fits, `${game} ${set}/${atmosphere}/${props}/${fx}`);
              if (built) assert.ok(SM.validateRecipe(built).ok);
            }
    }
    for (const [game, set] of Object.entries(NEW_SETS))
      for (const slot of ['atmosphere', 'props', 'fx'])
        assert.ok(SM.listModules(game, slot).filter(id => SM.CATALOG[game][slot][id].fits.includes(set)).length >= 2, `${set} needs a choice of ${slot}`);
    const farm = { set: 'night_farm', atmosphere: 'starry_night', props: 'barn_silo', fx: 'night_breeze' };
    assert.ok(SM.buildRecipe('beam', farm));
    assert.equal(SM.buildRecipe('beam', { ...farm, set: 'alien_drive_through' }), null, 'no barn at the drive-through');
    assert.equal(SM.buildRecipe('beam', { ...farm, atmosphere: 'neon_nebula' }), null);
    assert.ok(SM.buildRecipe('beam', { ...farm, set: 'alien_drive_through', atmosphere: 'neon_nebula', props: 'menu_boards' }), 'night breeze is shared');
    const lava = { set: 'volcano', atmosphere: 'sunset_haze', props: 'basalt_ridge', fx: 'ember_drift' };
    assert.ok(SM.buildRecipe('dodge', lava));
    assert.equal(SM.buildRecipe('dodge', { ...lava, set: 'industrial_meltdown' }), null, 'no basalt in the foundry');
    assert.equal(SM.buildRecipe('dodge', { ...lava, props: 'pipe_works' }), null);
    assert.equal(SM.buildRecipe('dodge', { ...lava, fx: 'spark_shower' }), null);
    assert.equal(SM.buildRecipe('beam', lava), null, 'modules are per game');
    for (const bad of ['__proto__', 'constructor', 'hasOwnProperty', 'javascript:alert(1)'])
      assert.equal(SM.buildRecipe('dodge', { ...lava, set: bad }), null);
    const forged = { ...SM.composeStage(PLANS.default, { game: 'dodge', remix: 1 }), props: 'basalt_ridge' };
    assert.match(SM.validateRecipe(forged).errors.join(' '), /incompatible/);
  });

  test('composition is deterministic across calls, clones and remix order', () => {
    for (const plan of Object.values(PLANS)) {
      const clone = JSON.parse(JSON.stringify(plan));
      for (const game of ['beam', 'dodge']) {
        const forward = [], backward = [];
        for (let remix = 0; remix < 16; remix++) forward.push(SM.composeStage(plan, { game, remix }));
        for (let remix = 15; remix >= 0; remix--) backward.unshift(SM.composeStage(clone, { game, remix }));
        assert.deepEqual(forward, backward);
      }
      assert.deepEqual(SM.composeAll(plan, 5), SM.composeAll(clone, 5));
    }
  });

  test('every remix changes the BEAM and DODGE world and explores the modules', () => {
    for (const plan of Object.values(PLANS)) {
      for (const game of ['beam', 'dodge']) {
        const seen = new Set(), sets = new Set();
        let prev = SM.composeStage(plan, { game, remix: 0 });
        for (let remix = 1; remix <= 24; remix++) {
          const next = SM.composeStage(plan, { game, remix });
          assert.notEqual(next.set, prev.set, `${game} remix ${remix} must rebuild the world`);
          sets.add(next.set);
          if (next.set === NEW_SETS[game]) seen.add(next.signature);
          prev = next;
        }
        assert.deepEqual([...sets].sort(), [NEW_SETS[game], OLD_SETS[game]].sort());
        assert.ok(seen.size >= 3, `${game} remixes should explore ${NEW_SETS[game]} modules, saw ${[...seen]}`);
      }
    }
  });

  test("the director's cut fits the GamePlan; the originals stay the default", () => {
    const cut = (plan, game) => SM.composeStage(plan, { game });
    assert.equal(cut(PLANS.default, 'beam').signature, 'night_farm/starry_night/barn_silo/night_breeze');
    assert.equal(cut(PLANS.default, 'dodge').signature, 'volcano/sunset_haze/basalt_ridge/ember_drift');
    assert.equal(cut(PLANS.toyCar, 'beam').set, 'alien_drive_through', 'a hot rod pulls into the drive-through');
    assert.equal(cut(PLANS.toyCar, 'dodge').set, 'industrial_meltdown', 'a die-cast car goes back to the foundry');
    assert.equal(cut(PLANS.sponge, 'beam').set, 'alien_drive_through', 'a kitchen sponge belongs near a fryer');
    assert.equal(cut(PLANS.sponge, 'dodge').set, 'volcano', 'its plan is about a volcanic steam bath');
    assert.equal(cut(PLANS.plush, 'beam').set, 'night_farm');
    assert.equal(cut(PLANS.pumpkin, 'beam').set, 'night_farm');
    assert.ok(SM.deriveTags(PLANS.default).tags.includes('fiery'));
    assert.ok(SM.deriveTags(createDefaultGamePlan({ label: 'Rubber Cow from the Farm' })).tags.includes('rural'));
  });

  test('model copy is rewritten for the world on stage or replaced', () => {
    const recipe = (game, set) => SM.composeStage(PLANS.default, { game, remix: SM.composeStage(PLANS.default, { game }).set === set ? 0 : 1 });
    const foundry = recipe('dodge', 'industrial_meltdown'), volcano = recipe('dodge', 'volcano');
    const drive = recipe('beam', 'alien_drive_through'), farm = recipe('beam', 'night_farm');
    assert.equal(SM.fitCopy(foundry, 'VOLCANO VACATION'), 'FOUNDRY SHIFT');
    assert.equal(SM.fitCopy(foundry, 'Your thing is on vacation in a volcano. Drag left or right to dodge falling lava rocks.'),
      'Your thing is on shift in a foundry. Drag left or right to dodge falling molten scrap.');
    assert.equal(SM.fitCopy(foundry, 'BLOWN GASKET: A giant magma rock flattened your hot rod chassis.'), 'BLOWN GASKET: A giant hunk of slag flattened your hot rod chassis.');
    assert.equal(SM.fitCopy(foundry, 'You drifted past an eruption!'), 'You drifted past a meltdown!');
    assert.equal(SM.fitCopy(foundry, 'Caldera Tea Party'), 'Smelter Tea Party');
    assert.equal(SM.fitCopy(foundry, 'Surf the tiki beach!'), null, 'unfixable lines fall back');
    assert.equal(SM.fitCopy(volcano, 'Escape the factory furnace!'), 'Escape the volcano crater!');
    assert.equal(SM.fitCopy(volcano, 'Dodge the rocks!'), 'Dodge the rocks!', 'the original world keeps the model text');
    assert.equal(SM.fitCopy(drive, 'Align under the tractor beam over the farm.'), 'Align under the tractor beam over the drive-through.', 'tractor beams are sci-fi, not farming');
    assert.equal(SM.fitCopy(drive, 'Crop circles appeared in the cornfield!'), 'Onion rings appeared in the parking lot!');
    assert.equal(SM.fitCopy(farm, 'A saucer at the drive-thru!'), 'A saucer at the farm!');
    assert.equal(SM.fitCopy(farm, 'Fast food for aliens'), null);
    assert.equal(SM.fitCopy(drive, ''), null);
    assert.equal(SM.fitCopy(drive, 42), null);
    const house = SM.buildRecipe('wreck', { set: 'haunted_house', atmosphere: 'haunted_moon', props: 'graveyard', fx: 'fog_bats' });
    assert.equal(SM.fitCopy(house, 'Demolish the haunted house.'), 'Demolish the haunted house.');
    const diner = SM.buildRecipe('wreck', { set: 'cursed_diner', atmosphere: 'egg_moon', props: 'parking_lot', fx: 'neon_moths' });
    assert.equal(SM.fitCopy(diner, 'Crash the haunted mansion!'), 'Crash the cursed diner!');
    for (const r of [foundry, volcano, drive, farm]) {
      const lines = SM.setCopy(r);
      for (const key of ['intro', 'win', 'lose', 'hint', 'cheer']) {
        assert.equal(typeof lines[key], 'string', `${r.set} ${key}`);
        assert.ok(!OFF_WORLD[r.set].test(lines[key]) && SM.copyFits(r, lines[key]), `${r.set} ${key}: ${lines[key]}`);
      }
      assert.equal(lines.heading.length, 2);
      assert.ok(!('swaps' in lines) && !('forbid' in lines));
    }
  });
});

// The real browser game, offline, with a lightweight DOM/Canvas host.
function arcade({ reduced = false } = {}) {
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
    window: { GamePlan: { createDefaultGamePlan }, StageMachine: SM, matchMedia: () => ({ matches: reduced }), addEventListener() {} },
    location: { search: '?seed=7821' }, requestAnimationFrame() {},
    fetch: async () => { fetches++; return { ok: true, json: async () => ({}) }; },
    navigator: { canShare: () => false }, File: class {},
    URL: { createObjectURL: () => '', revokeObjectURL() {} }, setTimeout() {}
  };
  const source = fs.readFileSync(require.resolve('../game.js'), 'utf8').replace(
    '  applyPlanToStages(activePlan);\n  resetPhysics();',
    '  globalThis.qa={applyPlanToStages,state,update,draw,startRound,beginSession,setModal,endRound,drawUfo,drawLava,shareIncident,stageMachine,get activePlan(){return activePlan;}};\n  applyPlanToStages(activePlan);\n  resetPhysics();');
  vm.runInNewContext(source, sandbox);
  const qa = sandbox.qa;
  return {
    qa, element, images, labels,
    get fetches() { return fetches; },
    advance(seconds) { for (let t = 0; t < seconds; t += .01) { now += 10; qa.update(.01); } },
    remix() { now += 1000; element('#remixBtn').handlers.click(); },
    ticket(round) { qa.state.round = round; qa.state.scene = 'between'; qa.setModal('round'); now += 1000; }
  };
}
const pointer = (x, y) => ({ clientX: x, clientY: y, pointerId: 1, preventDefault() {} });
const ticketText = a => ['#ticketStamp', '#ticketTitle', '#ticketBody', '#ticketSub'].map(id => a.element(id).textContent || a.element(id).innerHTML).join(' | ');

describe('BEAM IT and DODGE IT worlds in the live game', () => {
  test('REMIX THE CHAOS on the BEAM and DODGE tickets rebuilds that world with zero API calls', () => {
    for (const [round, game, heading, stamp, paint] of [[1, 'beam', /WANT TAKEOUT!/, /THE ALIEN DRIVE-THROUGH/, "ZORP'S"], [2, 'dodge', /IS MOLTEN!/, /INDUSTRIAL MELTDOWN/, 'A MELTDOWN']]) {
      const a = arcade();
      const sprite = { width: 120, height: 180 };
      a.qa.state.photo = sprite; a.qa.state.cutout = true;
      a.qa.beginSession(); a.ticket(round);
      const remixBtn = a.element('#remixBtn');
      assert.equal(remixBtn.hidden, false, `remix is offered on the round ${round + 1} ticket`);
      assert.match(remixBtn.textContent, new RegExp(SM.CATALOG[game].set[OLD_SETS[game]].label));
      const fetches = a.fetches, seed = a.qa.state.seed, plan = a.qa.activePlan, planJson = JSON.stringify(plan);
      a.remix();
      assert.equal(a.qa.stageMachine.recipes[game].set, NEW_SETS[game]);
      assert.equal(a.qa.stageMachine.focus, game, 'the assembly rebuilds the world on the ticket');
      assert.equal(a.element('#modal').hidden, true);
      assert.ok(a.element('#game').dataset.worlds.includes(NEW_SETS[game]));
      a.advance(.9);
      a.images.length = 0; a.labels.length = 0; a.qa.draw();
      assert.ok(a.images.some(args => args[0] === sprite), 'the transparent sticker stays on stage while the world assembles');
      assert.ok(a.labels.includes('ASSEMBLING MAYHEM'));
      assert.ok(a.labels.includes(paint), `${NEW_SETS[game]} is painted during the assembly`);
      a.advance(.6);
      assert.equal(a.qa.stageMachine.assemble, 0);
      assert.equal(a.element('#modal').hidden, false, 'ticket returns after the assembly');
      assert.match(a.element('#ticketTitle').innerHTML, heading);
      assert.match(a.element('#ticketStamp').textContent, stamp);
      assert.match(remixBtn.textContent, new RegExp(SM.CATALOG[game].set[NEW_SETS[game]].label));
      assert.equal(a.fetches, fetches, 'remix made no API calls');
      assert.equal(a.qa.state.seed, seed, 'remix never touches the gameplay RNG');
      assert.equal(a.qa.activePlan, plan); assert.equal(JSON.stringify(plan), planJson);
      assert.equal(a.qa.state.photo, sprite); assert.equal(a.qa.state.cutout, true);
      a.qa.startRound(); a.advance(.3);
      assert.equal(a.qa.state.scene, 'playing');
      assert.equal(a.qa.state.worlds[round], SM.CATALOG[game].set[NEW_SETS[game]].label, 'the remixed world is the one played');
      a.remix();
      assert.equal(a.qa.stageMachine.recipes[game].set, NEW_SETS[game], 'no remix mid-round');
    }
  });

  test('gameplay RNG, hitboxes, scores and timers are identical in every BEAM and DODGE world', () => {
    function session(remixes) {
      const a = arcade();
      a.qa.beginSession();
      for (let i = 0; i < remixes; i++) { a.remix(); a.advance(1.5); }
      const worlds = `${a.qa.stageMachine.recipes.beam.signature} ${a.qa.stageMachine.recipes.dodge.signature}`;
      const canvas = a.element('#game');
      a.qa.state.round = 1; a.qa.startRound();
      assert.equal(a.qa.state.remaining, 10, 'BEAM IT timer');
      a.advance(.3);
      const beam = [];
      for (let i = 0; i < 1400 && a.qa.state.scene !== 'result'; i++) {
        if (i % 41 === 0) canvas.handlers.pointerdown(pointer(210, 440));
        if (i % 5 === 0) a.qa.draw();
        a.advance(.01);
        const u = a.qa.state.ufo;
        beam.push(`${a.qa.state.scene}:${a.qa.state.remaining.toFixed(3)}:${u.phase.toFixed(4)}:${u.hits}:${u.misses}:${u.beamGood}`);
      }
      const beamResult = { score: a.qa.state.score, won: a.qa.state.won[1] };
      a.qa.state.round = 2; a.qa.startRound();
      assert.equal(a.qa.state.remaining, 10, 'DODGE IT timer');
      a.advance(.3);
      const dodge = [];
      for (let i = 0; i < 1400 && a.qa.state.scene !== 'result'; i++) {
        if (i % 60 === 0) { const x = [92, 210, 328][(i / 60) % 3]; canvas.handlers.pointerdown(pointer(x, 510)); canvas.handlers.pointermove(pointer(x, 510)); canvas.handlers.pointerup(pointer(x, 510)); }
        if (i % 5 === 0) a.qa.draw();
        a.advance(.01);
        const l = a.qa.state.lava;
        dodge.push(`${a.qa.state.scene}:${a.qa.state.remaining.toFixed(3)}:${l.x.toFixed(3)}:${l.hearts}:${l.invuln.toFixed(3)}:` + l.rocks.map(r => `${r.x},${r.y.toFixed(2)},${r.r.toFixed(3)},${r.speed.toFixed(3)}`).join(';'));
      }
      return { worlds, beam: beam.join('|'), dodge: dodge.join('|'), beamResult, dodgeWon: a.qa.state.won[2], score: a.qa.state.score, seed: a.qa.state.seed };
    }
    const original = session(0), remixed = session(1), third = session(3);
    assert.equal(original.worlds, 'night_farm/starry_night/barn_silo/night_breeze volcano/sunset_haze/basalt_ridge/ember_drift');
    assert.match(remixed.worlds, /^alien_drive_through\/\S+ industrial_meltdown\//);
    assert.match(third.worlds, /^alien_drive_through\/\S+ industrial_meltdown\//);
    assert.ok(original.beamResult.score > 0 && original.beam.includes(':true'), 'the scripted taps really capture');
    assert.ok(original.dodge.includes(':1:'), 'the scripted run really takes a hit');
    for (const other of [remixed, third]) {
      assert.equal(other.beam, original.beam, 'same beam timing, captures and timer in every world');
      assert.deepEqual(other.beamResult, original.beamResult);
      assert.equal(other.dodge, original.dodge, 'same lanes, sizes, speeds, hits and hearts in every world');
      assert.equal(other.dodgeWon, original.dodgeWon);
      assert.equal(other.score, original.score);
      assert.equal(other.seed, original.seed);
    }
  });

  test('the transparent sticker is drawn in every BEAM and DODGE composition', () => {
    const sprite = { width: 120, height: 180 };
    for (const game of ['beam', 'dodge']) {
      const cat = SM.CATALOG[game];
      for (const set of Object.keys(cat.set))
        for (const atmosphere of SM.listModules(game, 'atmosphere'))
          for (const props of SM.listModules(game, 'props'))
            for (const fx of SM.listModules(game, 'fx')) {
              const recipe = SM.buildRecipe(game, { set, atmosphere, props, fx });
              if (!recipe) continue;
              const a = arcade();
              a.qa.state.photo = sprite; a.qa.state.cutout = true;
              a.qa.stageMachine.recipes[game] = recipe;
              a.qa.beginSession(); a.qa.state.round = game === 'beam' ? 1 : 2; a.qa.startRound(); a.advance(2.2);
              a.images.length = 0;
              if (game === 'beam') a.qa.drawUfo(); else a.qa.drawLava();
              assert.ok(a.images.some(args => args[0] === sprite), `${recipe.signature} keeps the sticker`);
              if (game === 'dodge') assert.ok(a.qa.state.lava.rocks.length > 0, 'hazards are on screen');
            }
    }
  });

  test('reduced motion keeps the BEAM and DODGE assemblies short and readable', () => {
    for (const round of [1, 2]) {
      const a = arcade({ reduced: true });
      a.qa.beginSession(); a.ticket(round); a.remix();
      assert.ok(a.qa.stageMachine.assemble > 0 && a.qa.stageMachine.assemble <= .6);
      a.advance(.3); a.labels.length = 0; a.qa.draw();
      assert.ok(a.labels.includes('ASSEMBLING MAYHEM'));
      a.advance(.35);
      assert.equal(a.element('#modal').hidden, false, 'ticket is back within 0.65 s');
      a.qa.startRound();
      assert.equal(a.qa.state.scene, 'playing', 'reduced motion skips the entry wipe');
      a.advance(1); a.qa.draw();
      a.qa.state.scene = 'aftermath'; a.qa.state.aftermath = { time: .3, duration: 1, win: true, called: false };
      a.labels.length = 0; if (round === 1) a.qa.drawUfo(); else a.qa.drawLava();
      assert.ok(a.labels.includes(round === 1 ? 'ORDER UP! ONE THING, TO GO.' : 'QUALITY CONTROL: PASSED?!'));
    }
  });

  test('no ticket, banner or canvas line describes a world that is not on stage', () => {
    const hostile = createDefaultGamePlan({ label: 'Lava Lamp' });
    hostile.round_modifiers.round3_lava.theme_title = 'TIKI LAVA BEACH';
    hostile.announcer_lines.round3 = { intro: 'Surf the tiki beach under the volcano!', win: 'You outran the eruption.', lose: 'Obsidian forever.' };
    hostile.round_modifiers.round2_beam.theme_title = 'BARNYARD BEAM';
    hostile.announcer_lines.round2 = { intro: 'Beam the thing out of the barn before the farmer wakes!', win: 'The silo is empty.', lose: 'Back to the pasture.' };
    let checked = 0;
    for (const plan of [...Object.values(PLANS), hostile]) {
      for (let remixes = 0; remixes < 3; remixes++) {
        const a = arcade();
        a.qa.applyPlanToStages(plan);
        a.qa.beginSession();
        for (let i = 0; i < remixes; i++) { a.remix(); a.advance(1.5); }
        for (const [round, game] of [[1, 'beam'], [2, 'dodge']]) {
          const set = a.qa.stageMachine.recipes[game].set, bad = OFF_WORLD[set];
          const lines = [];
          a.ticket(round); lines.push(ticketText(a));
          for (const won of [true, false]) { a.qa.state.won[round] = won; a.qa.setModal('result'); lines.push(ticketText(a)); }
          a.qa.startRound(); a.advance(.5);
          a.labels.length = 0; a.qa.draw();
          a.qa.state.scene = 'aftermath'; a.qa.state.aftermath = { time: .4, duration: 1, win: true, called: false };
          if (round === 1) a.qa.state.ufo.hits = 2;
          a.qa.draw();
          lines.push(a.labels.join(' | '));
          for (const line of lines) { assert.ok(!bad.test(line), `${set}: "${line.match(bad)?.[0]}" in ${line}`); checked++; }
          a.qa.state.aftermath = null; a.qa.state.scene = 'between';
        }
      }
    }
    assert.ok(checked >= 70);
    // and the worlds do describe themselves
    const a = arcade();
    a.qa.applyPlanToStages(PLANS.toyCar); a.qa.beginSession(); a.ticket(2);
    assert.match(ticketText(a), /FOUNDRY DRAG STRIP: Dodge high-velocity molten girders on the slag superhighway!/);
    assert.match(ticketText(a), /SLAG HIGHWAY/);
    a.ticket(1);
    assert.match(ticketText(a), /tractor beam/, 'the plan keeps its own voice');
  });

  test('the Chaos Report names the three worlds that were actually played', async () => {
    const a = arcade();
    a.qa.beginSession(); a.qa.startRound(); a.advance(.3);
    a.qa.endRound(true);
    a.ticket(1); a.remix(); a.advance(1.5);
    a.qa.startRound(); a.advance(.3); a.qa.endRound(true);
    a.ticket(2); a.remix(); a.advance(1.5); a.remix(); a.advance(1.5);
    a.qa.startRound(); a.advance(.3); a.qa.endRound(false);
    assert.deepEqual([...a.qa.state.worlds], ['HAUNTED HOUSE', 'ALIEN DRIVE-THROUGH', 'INDUSTRIAL MELTDOWN']);
    assert.equal(a.qa.stageMachine.recipes.wreck.set, 'cursed_diner', 'later remixes do not rewrite history');
    a.qa.state.scene = 'summary'; a.qa.setModal('summary');
    const badges = a.element('#ticketBadges').innerHTML;
    for (const want of ['✓ WRECK', 'HAUNTED HOUSE', '✓ BEAM', 'ALIEN DRIVE-THROUGH', '✕ DODGE', 'INDUSTRIAL MELTDOWN']) assert.ok(badges.includes(want), want);
    assert.ok(!badges.includes('LAVA') && !badges.includes('CURSED DINER'));
    a.labels.length = 0; await a.qa.shareIncident();
    for (const want of ['HAUNTED HOUSE', 'ALIEN DRIVE-THROUGH', 'INDUSTRIAL MELTDOWN', 'ONE PHOTO · THREE WORLDS · ALL CHAOS']) assert.ok(a.labels.includes(want), want);
    a.qa.setModal('menu');
    assert.match(a.element('#ticketBadges').innerHTML, /01 WRECK<small>CURSED DINER<\/small>/, 'the menu shows the current lineup');
  });
});
