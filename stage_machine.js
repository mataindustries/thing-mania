/**
 * THING//MANIA — Chaos Stage Machine v2.
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

  const VERSION = '2.0.0';
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
    industrial: ['metal', 'steel', 'zinc', 'alloy', 'wrench', 'tool', 'machine', 'gear', 'battering', 'supercharged', 'iron', 'factory', 'bolt'],
    fiery: ['volcano', 'volcanic', 'lava', 'magma', 'caldera', 'eruption', 'fire', 'fiery', 'flame', 'spicy', 'chili', 'pepper', 'sauna', 'tropical', 'vacation', 'beach'],
    rural: ['farm', 'barn', 'cow', 'hay', 'tractor', 'corn', 'chicken', 'pig', 'sheep', 'goat', 'rural', 'harvest', 'crop', 'scarecrow', 'egg']
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
      set: {
        night_farm: { label: 'NIGHT FARM', title: 'THE UFO INCIDENT', noun: 'THE FARM', affinity: { rural: 3, cozy: 1, toy: 1, spooky: 1 } },
        alien_drive_through: { label: 'ALIEN DRIVE-THROUGH', title: 'THE ALIEN DRIVE-THROUGH', noun: 'THE DRIVE-THROUGH', affinity: { kitchen: 3, roadside: 2, carnival: 1 } }
      },
      atmosphere: {
        starry_night: { label: 'STARRY NIGHT', fits: ['night_farm'], affinity: {} },
        aurora_night: { label: 'AURORA NIGHT', fits: ['night_farm'], affinity: { cozy: 1, industrial: 1 } },
        neon_nebula: { label: 'NEON NEBULA', fits: ['alien_drive_through'], affinity: { carnival: 1, kitchen: 1 } },
        twin_moons: { label: 'TWIN MOONS', fits: ['alien_drive_through'], affinity: { roadside: 1 } }
      },
      props: {
        barn_silo: { label: 'BARN + SILO', fits: ['night_farm'], affinity: {} },
        menu_boards: { label: 'FLOATING MENUS', fits: ['alien_drive_through'], affinity: { kitchen: 1 } },
        snack_ads: { label: 'SNACK ADS', fits: ['alien_drive_through'], affinity: { roadside: 1, carnival: 1 } }
      },
      fx: {
        night_breeze: { label: 'NIGHT BREEZE', fits: ['night_farm', 'alien_drive_through'], affinity: {} },
        neon_buzz: { label: 'NEON BUZZ', fits: ['alien_drive_through'], affinity: { roadside: 1, carnival: 1 } },
        fryer_steam: { label: 'FRYER STEAM', fits: ['alien_drive_through'], affinity: { kitchen: 1 } }
      }
    },
    dodge: {
      set: {
        volcano: { label: 'VOLCANO', title: 'VOLCANO VACATION', noun: 'THE VOLCANO', affinity: { fiery: 2, cozy: 1, kitchen: 1, carnival: 1 } },
        industrial_meltdown: { label: 'INDUSTRIAL MELTDOWN', title: 'INDUSTRIAL MELTDOWN', noun: 'THE FOUNDRY', affinity: { industrial: 3, roadside: 2, toy: 1 } }
      },
      atmosphere: {
        sunset_haze: { label: 'SUNSET HAZE', fits: ['volcano'], affinity: { fiery: 1 } },
        eclipse_glow: { label: 'ECLIPSE GLOW', fits: ['volcano'], affinity: { spooky: 1 } },
        smog_dusk: { label: 'SMOG DUSK', fits: ['industrial_meltdown'], affinity: { roadside: 1 } },
        night_shift: { label: 'NIGHT SHIFT', fits: ['industrial_meltdown'], affinity: { spooky: 1, industrial: 1 } }
      },
      props: {
        basalt_ridge: { label: 'BASALT RIDGE', fits: ['volcano'], affinity: {} },
        pipe_works: { label: 'PIPE WORKS', fits: ['industrial_meltdown'], affinity: { industrial: 1 } },
        safety_theater: { label: 'SAFETY THEATER', fits: ['industrial_meltdown'], affinity: { toy: 1, roadside: 1 } }
      },
      fx: {
        ember_drift: { label: 'EMBER DRIFT', fits: ['volcano', 'industrial_meltdown'], affinity: {} },
        spark_shower: { label: 'SPARK SHOWER', fits: ['industrial_meltdown'], affinity: { industrial: 1 } },
        steam_vents: { label: 'STEAM VENTS', fits: ['industrial_meltdown'], affinity: { kitchen: 1 } }
      }
    }
  };

  // Player-facing words for each set. Model-written lines are shown only if
  // they describe the world on stage: a sibling world's vocabulary is swapped
  // for this one's, and anything still off-world falls back to these lines.
  // Swaps run in order, so longer phrases come first.
  const SET_COPY = {
    haunted_house: { heading: ['WRECK', 'THE HOUSE!'], swaps: [], forbid: null },
    cursed_diner: {
      heading: ['WRECK', 'THE DINER!'],
      swaps: [['haunted houses', 'cursed diners'], ['haunted house', 'cursed diner'], ['spooky manor', 'cursed diner'], ['haunted mansion', 'cursed diner'], ['manor', 'diner'], ['mansion', 'diner'], ['house', 'diner']],
      forbid: null
    },
    night_farm: {
      heading: ['ALIENS', 'WANT YOUR STUFF!'], hint: 'TAP WHEN THE THING IS UNDER THE UFO.',
      intro: 'The UFO is hungry. Wait until your thing passes directly under its beam, then tap to abduct it twice.',
      win: 'The aliens have adopted your thing. Nobody asked you.',
      lose: 'The UFO went home hungry and filed a complaint.',
      cheer: 'ADOPTED BY SPACE WEIRDOS.',
      swaps: [['drive-throughs', 'farms'], ['drive-through', 'farm'], ['drive-thrus', 'farms'], ['drive-thru', 'farm'], ['drive thru', 'farm'], ['restaurants', 'farms'], ['restaurant', 'farm'], ['takeout', 'harvest'], ['takeaway', 'harvest']],
      forbid: /\b(drive[- ]?thr(u|ough)s?|restaurants?|take ?out|take ?away|fast food|burger joint)\b/i
    },
    alien_drive_through: {
      heading: ['ALIENS', 'WANT TAKEOUT!'], hint: 'TAP WHEN THE THING IS UNDER THE BEAM.',
      intro: 'A hungry saucer just pulled into the drive-through. Tap when your thing slides under the beam to fill the order.',
      win: 'Order complete. Your thing is now a Galactic Value Meal.',
      lose: 'Order cancelled. The saucer left a one-star review.',
      cheer: 'ORDER UP! ONE THING, TO GO.',
      swaps: [['cornfields', 'parking lots'], ['cornfield', 'parking lot'], ['crop circles', 'onion rings'], ['crop circle', 'onion ring'], ['farmyards', 'parking lots'], ['farmyard', 'parking lot'], ['farmhouse', 'restaurant'], ['farmers', 'fry cooks'], ['farmer', 'fry cook'], ['farms', 'drive-throughs'], ['farm', 'drive-through'], ['barnyard', 'parking lot'], ['barns', 'kitchens'], ['barn', 'kitchen'], ['silos', 'soda tanks'], ['silo', 'soda tank'], ['haystacks', 'fry piles'], ['haystack', 'fry pile'], ['hayloft', 'kitchen'], ['pastures', 'parking lots'], ['pasture', 'parking lot'], ['countryside', 'roadside'], ['rural', 'roadside']],
      forbid: /\b(farm\w*|barn\w*|silos?|cornfields?|crop circles?|haystacks?|hayloft|pastures?|countryside|rural)\b/i
    },
    volcano: {
      heading: ['THE FLOOR', 'IS LAVA!'], hint: 'SLIDE LEFT/RIGHT. DODGE HOT ROCKS.',
      intro: 'Your thing is on vacation in a volcano. Drag left or right to dodge falling lava rocks. Survive the timer.',
      win: 'You escaped the volcano. Your insurance has not.',
      lose: 'Your thing has become locally sourced magma.',
      status: 'OH NO IT IS VERY HOT', cheer: 'STILL RAW IN THE MIDDLE!',
      swaps: [['steel mills', 'volcanoes'], ['steel mill', 'volcano'], ['foundries', 'volcanoes'], ['foundry', 'volcano'], ['factories', 'volcanoes'], ['factory', 'volcano'], ['smelters', 'calderas'], ['smelter', 'caldera'], ['furnaces', 'craters'], ['furnace', 'crater'], ['molten steel', 'lava'], ['molten metal', 'lava'], ['molten scrap', 'lava rocks'], ['scrap metal', 'lava rocks'], ['slag', 'magma']],
      forbid: /\b(foundr(y|ies)|factor(y|ies)|steel mills?|smelters?|furnaces?|molten (steel|metal|scrap)|scrap metal|slag|conveyors?)\b/i
    },
    industrial_meltdown: {
      heading: ['THE FLOOR', 'IS MOLTEN!'], hint: 'SLIDE LEFT/RIGHT. DODGE MOLTEN SCRAP.',
      intro: 'Your thing just clocked in at the foundry. Drag left or right to dodge falling molten scrap. Survive the shift.',
      win: 'Shift survived. Management is deeply suspicious.',
      lose: 'Your thing has been recycled into a souvenir spoon.',
      status: 'HARD HATS ARE DECORATIVE', cheer: 'QUALITY CONTROL: PASSED?!',
      swaps: [['an active volcano', 'an active foundry'], ['an erupting volcano', 'a melting foundry'], ['volcanoes', 'foundries'], ['volcano', 'foundry'], ['volcanic', 'industrial'], ['lava rocks', 'molten scrap'], ['lava rock', 'molten scrap'], ['magma rocks', 'hunks of slag'], ['magma rock', 'hunk of slag'], ['pumice rocks', 'hot scrap'], ['lava', 'molten steel'], ['magma', 'slag'], ['calderas', 'smelters'], ['caldera', 'smelter'], ['craters', 'furnaces'], ['crater', 'furnace'], ['an eruption', 'a meltdown'], ['eruptions', 'meltdowns'], ['eruption', 'meltdown'], ['erupting', 'melting down'], ['erupts', 'melts down'], ['erupt', 'melt down'], ['pumice', 'scrap'], ['boulders', 'girders'], ['boulder', 'girder'], ['rocks', 'scrap'], ['rock', 'scrap'], ['pebbles', 'bolts'], ['pebble', 'bolt'], ['cinders', 'sparks'], ['cinder', 'slag'], ['basalt', 'iron'], ['vacation', 'shift']],
      forbid: /\b(volcan\w*|lava|magma|calderas?|craters?|erupt\w*|pumice|basalt|obsidian|tephra|islands?|beach\w*|tropical|tiki)\b/i
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

  const casedLike = (match, word) => {
    if (match === match.toUpperCase() && match !== match.toLowerCase()) return word.toUpperCase();
    if (/^[A-Z]/.test(match)) {
      const titled = match.split(/[\s-]+/).every(w => /^[A-Z]/.test(w));
      return titled ? word.replace(/(^|[\s-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase()) : word[0].toUpperCase() + word.slice(1);
    }
    return word;
  };
  const SWAP_RE = new Map();
  for (const [id, copy] of Object.entries(SET_COPY))
    SWAP_RE.set(id, copy.swaps.map(([from, to]) => [new RegExp(`\\b${from.replace(/[-\s]/g, '[-\\s]')}\\b`, 'gi'), to]));

  // Rewrite one line of model copy for the set on stage. Returns null when the
  // line still names another world, so the caller shows the set's own line.
  function fitCopy(recipe, text) {
    if (typeof text !== 'string' || !text.trim()) return null;
    const id = recipe && recipe.set;
    const copy = own(SET_COPY, id);
    if (!copy) return text;
    let out = text;
    for (const [re, to] of SWAP_RE.get(id)) out = out.replace(re, m => casedLike(m, to));
    return copy.forbid && copy.forbid.test(out) ? null : out;
  }

  // Fixed per-set lines (headings, hints, fallbacks). Never model text.
  function setCopy(recipe) {
    const copy = own(SET_COPY, recipe && recipe.set);
    if (!copy) return null;
    const { swaps, forbid, ...lines } = copy;
    return lines;
  }

  // True when a line mentions nothing from another world of the same game.
  function copyFits(recipe, text) {
    const copy = own(SET_COPY, recipe && recipe.set);
    return !copy || !copy.forbid || !copy.forbid.test(String(text));
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
    buildRecipe, validateRecipe, composeStage, composeAll, listModules,
    SET_COPY, fitCopy, setCopy, copyFits
  };
});
