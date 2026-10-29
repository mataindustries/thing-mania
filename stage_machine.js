/**
 * THING//MANIA — Chaos Stage Machine v1.
 *
 * A stage is assembled from four modular slots (ATMOSPHERE, SET, PROPS, FX)
 * picked from a fixed allowlist of hand-painted renderers in game.js. A recipe
 * is plain data: no code, no URLs, no images. It is derived deterministically
 * from the validated GamePlan (label, role, theme titles) plus a remix count,
 * using its own RNG, so it can never touch gameplay randomness, physics or
 * scoring. Collision geometry lives in game.js and is identical for every set.
 *
 * Works in Node (tests) and the browser (window.StageMachine).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StageMachine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = '1.0.0';
  const GAMES = ['wreck', 'beam', 'dodge'];
  const SLOTS = ['atmosphere', 'set', 'props', 'fx'];
  const MAX_REMIX = 9999;

  // Safe visual tags. Only these names can ever leave deriveTags(); model text
  // is matched word-by-word against this list and otherwise ignored.
  const TAG_WORDS = {
    spooky: ['ghost', 'ghosts', 'haunted', 'haunt', 'pumpkin', 'skull', 'bat', 'witch', 'spooky', 'grave', 'spider', 'zombie', 'monster', 'creepy', 'candle', 'halloween', 'boo', 'phantom', 'cursed'],
    kitchen: ['sponge', 'kitchen', 'sink', 'suds', 'soap', 'dish', 'scrub', 'galley', 'soup', 'toast', 'toaster', 'bread', 'cup', 'mug', 'spoon', 'fork', 'pan', 'pot', 'kettle', 'plate', 'coffee', 'chef', 'diner', 'food', 'fruit', 'apple', 'banana', 'egg', 'burger', 'pizza', 'cereal', 'snack', 'can', 'bottle', 'jar', 'sauce', 'ketchup', 'steam'],
    roadside: ['car', 'truck', 'rod', 'speedway', 'speed', 'highway', 'road', 'dragster', 'v8', 'racer', 'race', 'wheel', 'motor', 'engine', 'bus', 'van', 'tire', 'garage', 'gas', 'diesel', 'traffic', 'drive', 'cone'],
    toy: ['toy', 'plush', 'bear', 'teddy', 'doll', 'robot', 'lego', 'block', 'puppet', 'figurine', 'action', 'yo'],
    carnival: ['carnival', 'circus', 'clown', 'balloon', 'candy', 'popcorn', 'ticket', 'party', 'confetti', 'prize', 'juggling'],
    cozy: ['cozy', 'cuddly', 'fluffy', 'fluff', 'soft', 'tea', 'blanket', 'pillow', 'sock', 'slipper', 'yarn'],
    industrial: ['metal', 'steel', 'zinc', 'alloy', 'wrench', 'tool', 'machine', 'gear', 'battering', 'supercharged', 'iron', 'factory', 'bolt']
  };
  const TAGS = Object.keys(TAG_WORDS);
  const WORD_TO_TAG = new Map();
  for (const tag of TAGS) for (const w of TAG_WORDS[tag]) WORD_TO_TAG.set(w, tag);

  // The allowlist. Sets carry an affinity per tag; every other module names the
  // sets it fits, so a recipe can only pair art that was painted to coexist.
  const CATALOG = {
    wreck: {
      set: {
        haunted_house: { label: 'HAUNTED HOUSE', title: 'THE HAUNTED HOUSE', noun: 'THE HOUSE', affinity: { spooky: 3, toy: 2, cozy: 1, carnival: 1 } },
        cursed_diner: { label: 'CURSED DINER', title: 'THE CURSED DINER', noun: 'THE DINER', affinity: { kitchen: 3, roadside: 3, industrial: 2, carnival: 1 } }
      },
      atmosphere: {
        haunted_moon: { label: 'HAUNTED MOON', fits: ['haunted_house'], affinity: { spooky: 1 } },
        toxic_moon: { label: 'TOXIC MOON', fits: ['haunted_house'], affinity: { industrial: 1, toy: 1 } },
        greasy_sunset: { label: 'GREASY SUNSET', fits: ['cursed_diner'], affinity: { roadside: 1 } },
        egg_moon: { label: 'FRIED-EGG MOON', fits: ['cursed_diner'], affinity: { kitchen: 1, spooky: 1 } }
      },
      props: {
        graveyard: { label: 'GRAVEYARD', fits: ['haunted_house'], affinity: { spooky: 1 } },
        pumpkin_patch: { label: 'PUMPKIN PATCH', fits: ['haunted_house'], affinity: { carnival: 1, kitchen: 1, cozy: 1 } },
        condiment_alley: { label: 'CONDIMENT ALLEY', fits: ['cursed_diner'], affinity: { kitchen: 1 } },
        parking_lot: { label: 'PARKING LOT', fits: ['cursed_diner'], affinity: { roadside: 1, toy: 1 } }
      },
      fx: {
        fog_bats: { label: 'FOG + BATS', fits: ['haunted_house'], affinity: { spooky: 1 } },
        will_o_wisps: { label: "WILL-O'-WISPS", fits: ['haunted_house', 'cursed_diner'], affinity: { cozy: 1 } },
        grease_steam: { label: 'GREASE STEAM', fits: ['cursed_diner'], affinity: { kitchen: 1 } },
        neon_moths: { label: 'NEON MOTHS', fits: ['cursed_diner'], affinity: { roadside: 1 } }
      }
    },
    beam: {
      set: { night_farm: { label: 'NIGHT FARM', title: 'THE UFO INCIDENT', noun: 'THE FARM', affinity: {} } },
      atmosphere: {
        starry_night: { label: 'STARRY NIGHT', fits: ['night_farm'], affinity: {} },
        aurora_night: { label: 'AURORA NIGHT', fits: ['night_farm'], affinity: { cozy: 1, industrial: 1 } }
      },
      props: { barn_silo: { label: 'BARN + SILO', fits: ['night_farm'], affinity: {} } },
      fx: { night_breeze: { label: 'NIGHT BREEZE', fits: ['night_farm'], affinity: {} } }
    },
    dodge: {
      set: { volcano: { label: 'VOLCANO', title: 'VOLCANO VACATION', noun: 'THE VOLCANO', affinity: {} } },
      atmosphere: {
        sunset_haze: { label: 'SUNSET HAZE', fits: ['volcano'], affinity: {} },
        eclipse_glow: { label: 'ECLIPSE GLOW', fits: ['volcano'], affinity: { spooky: 1 } }
      },
      props: { basalt_ridge: { label: 'BASALT RIDGE', fits: ['volcano'], affinity: {} } },
      fx: { ember_drift: { label: 'EMBER DRIFT', fits: ['volcano'], affinity: {} } }
    }
  };

  const own = (obj, key) => (obj && typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key)) ? obj[key] : null;

  function hash32(str) {
    let h = 0x811c9dc5;
    const s = String(str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  // Visual-only RNG (mulberry32). Never shared with the gameplay LCG.
  function visualRng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function planText(plan) {
    const p = plan || {};
    const m = p.round_modifiers || {};
    return [p.selected_object?.label, p.selected_object?.role, p.whimsical_role,
      m.round1_wreck?.theme_title, m.round2_beam?.theme_title, m.round3_lava?.theme_title]
      .filter(v => typeof v === 'string').join(' ').slice(0, 600);
  }

  // Tag strengths from the plan's own words, capped so no tag can dominate.
  function deriveTags(plan) {
    const scores = {};
    const words = planText(plan).toLowerCase().match(/[a-z0-9]+/g) || [];
    for (const raw of words) {
      const tag = WORD_TO_TAG.get(raw) || (raw.endsWith('s') ? WORD_TO_TAG.get(raw.slice(0, -1)) : null);
      if (tag) scores[tag] = Math.min(3, (scores[tag] || 0) + 1);
    }
    const tags = TAGS.filter(t => scores[t]).sort((a, b) => scores[b] - scores[a] || TAGS.indexOf(a) - TAGS.indexOf(b));
    return { tags, scores };
  }

  function planSeed(plan) {
    const explicit = plan && (plan.visual_seed ?? plan.seed);
    if (Number.isInteger(explicit)) return explicit >>> 0;
    const p = plan || {};
    return hash32(`${p.selected_object?.label || ''}|${p.whimsical_role || p.selected_object?.role || ''}|${p.round_modifiers?.round1_wreck?.theme_title || ''}`);
  }

  const affinityScore = (mod, scores) => Object.entries(mod.affinity || {}).reduce((sum, [tag, w]) => sum + w * (scores[tag] || 0), 0);

  function best(entries, scores) {
    let pick = entries[0];
    for (const e of entries) if (affinityScore(e[1], scores) > affinityScore(pick[1], scores)) pick = e;
    return pick[0];
  }
  function weighted(entries, scores, rng) {
    const weights = entries.map(([, m]) => 1 + 2 * affinityScore(m, scores));
    let roll = rng() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < entries.length; i++) { roll -= weights[i]; if (roll < 0) return entries[i][0]; }
    return entries[entries.length - 1][0];
  }
  const mergeAffinity = (...mods) => {
    const out = {};
    for (const m of mods) for (const [tag, w] of Object.entries(m.affinity || {})) out[tag] = (out[tag] || 0) + w;
    return out;
  };
  const fitting = (cat, slot, set) => Object.entries(cat[slot]).filter(([, m]) => m.fits.includes(set));

  // Assemble explicit picks into a recipe; null if anything is off-list or the
  // modules were not painted to sit together.
  function buildRecipe(game, picks, meta = {}) {
    const cat = own(CATALOG, game);
    if (!cat || !picks) return null;
    const set = own(cat.set, picks.set);
    if (!set) return null;
    for (const slot of ['atmosphere', 'props', 'fx']) {
      const m = own(cat[slot], picks[slot]);
      if (!m || !m.fits.includes(picks.set)) return null;
    }
    const tags = (meta.tags || []).filter(t => TAGS.includes(t));
    return Object.freeze({
      version: VERSION, game, remix: meta.remix || 0, seed: (meta.seed || 0) >>> 0,
      tags: Object.freeze(tags),
      atmosphere: picks.atmosphere, set: picks.set, props: picks.props, fx: picks.fx,
      title: set.title, noun: set.noun,
      labels: Object.freeze({ atmosphere: cat.atmosphere[picks.atmosphere].label, set: set.label, props: cat.props[picks.props].label, fx: cat.fx[picks.fx].label }),
      signature: `${picks.set}/${picks.atmosphere}/${picks.props}/${picks.fx}`
    });
  }

  function validateRecipe(recipe) {
    const errors = [];
    if (!recipe || typeof recipe !== 'object') return { ok: false, errors: ['recipe must be an object'] };
    const cat = own(CATALOG, recipe.game);
    if (!cat) errors.push(`unknown game: ${recipe.game}`);
    else {
      if (!own(cat.set, recipe.set)) errors.push(`set not allowlisted: ${recipe.set}`);
      for (const slot of ['atmosphere', 'props', 'fx']) {
        const m = own(cat[slot], recipe[slot]);
        if (!m) errors.push(`${slot} not allowlisted: ${recipe[slot]}`);
        else if (!m.fits.includes(recipe.set)) errors.push(`${slot} ${recipe[slot]} is incompatible with set ${recipe.set}`);
      }
    }
    if (!Array.isArray(recipe.tags) || recipe.tags.some(t => !TAGS.includes(t))) errors.push('tags must come from the safe tag list');
    return { ok: errors.length === 0, errors };
  }

  // remix 0 is the director's cut: the best-matching module in every slot
  // (catalog order breaks ties, so the original art is the default). Each
  // later remix is a seeded weighted draw that must leave the previous set
  // (or, for single-set games, the previous composition) behind.
  function composeStage(plan, { game = 'wreck', remix = 0 } = {}) {
    const cat = own(CATALOG, game);
    if (!cat) throw new Error(`Unknown stage game: ${game}`);
    const { tags, scores } = deriveTags(plan);
    const base = planSeed(plan);
    const n = Math.min(MAX_REMIX, Math.max(0, Math.floor(Number(remix) || 0)));
    let prev = null;
    for (let r = 0; r <= n; r++) {
      const seed = hash32(`${base}:${game}:${r}`);
      let picks;
      if (r === 0) {
        const set = best(Object.entries(cat.set), scores);
        picks = { set };
        for (const slot of ['atmosphere', 'props', 'fx']) picks[slot] = best(fitting(cat, slot, set), scores);
      } else {
        const rng = visualRng(seed);
        const sets = Object.entries(cat.set).filter(([id]) => id !== prev.set);
        const set = weighted(sets.length ? sets : Object.entries(cat.set), scores, rng);
        // Every compatible combination for this set except the one on stage.
        const combos = [];
        for (const [atmosphere, a] of fitting(cat, 'atmosphere', set))
          for (const [props, pr] of fitting(cat, 'props', set))
            for (const [fx, f] of fitting(cat, 'fx', set))
              if (`${set}/${atmosphere}/${props}/${fx}` !== prev.signature)
                combos.push([{ set, atmosphere, props, fx }, { affinity: mergeAffinity(a, pr, f) }]);
        picks = combos.length ? weighted(combos, scores, rng) : { set, atmosphere: prev.atmosphere, props: prev.props, fx: prev.fx };
      }
      prev = buildRecipe(game, picks, { remix: r, seed, tags });
    }
    return prev;
  }

  function composeAll(plan, remix = 0) {
    const out = {};
    for (const game of GAMES) out[game] = composeStage(plan, { game, remix });
    return out;
  }

  function listModules(game, slot) {
    const cat = own(CATALOG, game);
    const group = cat && own(cat, slot);
    return group ? Object.keys(group) : [];
  }

  return {
    VERSION, GAMES, SLOTS, TAGS, CATALOG,
    hash32, visualRng, deriveTags, planSeed,
    buildRecipe, validateRecipe, composeStage, composeAll, listModules
  };
});
