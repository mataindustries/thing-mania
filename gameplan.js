/**
 * THING//MANIA — GamePlan Schema & Validator (v1.3.0)
 * Designed for Meta Muse Spark 1.3 scene interpretation.
 * 
 * Works in both Node.js (backend proxy/tests) and browser (game client).
 * Only allows bounded, predefined mechanics and safe numeric ranges.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GamePlan = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA_VERSION = '1.3.0';

  // Strict numeric limits and bounds to ensure games remain mechanically fun and playable.
  const SAFE_BOUNDS = {
    round1_wreck: {
      launch_impulse: { min: 1.8, max: 3.4, default: 2.6 },
      time_limit: { min: 7.0, max: 12.0, default: 9.0 },
      wreck_scale: { min: 0.75, max: 1.30, default: 1.00 },
      theme_title_max_len: 32,
      theme_accent_regex: /^#[0-9a-fA-F]{6}$/
    },
    round2_beam: {
      ufo_speed_mult: { min: 0.75, max: 1.40, default: 1.00 },
      beam_window_px: { min: 50, max: 85, default: 68 },
      target_catches: { min: 2, max: 3, default: 2 },
      time_limit: { min: 8.0, max: 13.0, default: 10.0 },
      theme_title_max_len: 32,
      theme_accent_regex: /^#[0-9a-fA-F]{6}$/,
      decoy_max_len: 16
    },
    round3_lava: {
      rock_speed_min: { min: 180, max: 260, default: 245 },
      rock_speed_max: { min: 270, max: 360, default: 315 },
      spawn_interval: { min: 0.55, max: 0.95, default: 0.73 },
      hearts: { min: 2, max: 3, default: 2 },
      time_limit: { min: 8.0, max: 13.0, default: 10.0 },
      theme_title_max_len: 32,
      theme_accent_regex: /^#[0-9a-fA-F]{6}$/
    },
    string_caps: {
      object_label: 40,
      whimsical_role: 100,
      description: 160,
      announcer_line: 180
    }
  };

  /**
   * Clamp helper
   */
  function clamp(val, min, max) {
    if (typeof val !== 'number' || isNaN(val)) return min;
    return Math.min(max, Math.max(min, val));
  }

  /**
   * Sanitizes string length and strips control characters
   */
  function cleanString(str, maxLen = 120, fallback = '') {
    if (typeof str !== 'string') return fallback;
    // Replace unusual control characters but keep normal punctuation
    const cleaned = str.replace(/[\x00-\x1F\x7F]/g, ' ').trim();
    if (!cleaned) return fallback;
    return cleaned.slice(0, maxLen);
  }

  /**
   * Validates hex color
   */
  function sanitizeHexColor(hex, fallback) {
    if (typeof hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(hex.trim())) {
      return hex.trim().toLowerCase();
    }
    return fallback;
  }

  /**
   * Creates the default baseline GamePlan (100% offline fallback)
   */
  function createDefaultGamePlan(options = {}) {
    const label = cleanString(options.label, 30, 'MYSTERY THING');
    return {
      schema_version: SCHEMA_VERSION,
      source: options.source || 'default_offline',
      detected_objects: [
        {
          id: 'obj_default_1',
          label: label,
          confidence: 1.0,
          bounding_box: [0.1, 0.1, 0.9, 0.9]
        }
      ],
      selected_object: {
        id: 'obj_default_1',
        label: label,
        role: 'Chaotic Arcade Prop',
        description: 'An everyday item drafted into perilous microgame duty.'
      },
      whimsical_role: 'Unsuspecting Everyday Wonder',
      announcer_lines: {
        intro: 'One everyday object. Three ridiculous universes. Zero sense.',
        round1: {
          intro: 'Your thing is now a wrecking ball. Pull it left, release, and demolish the haunted house.',
          win: 'Property value reduced to zero. Ghosts now legally homeless.',
          lose: 'The haunted house survives. Its mortgage does not.'
        },
        round2: {
          intro: 'The UFO is hungry. Wait until your thing passes directly under its beam, then tap to abduct it twice.',
          win: 'The aliens have adopted your thing. Nobody asked you.',
          lose: 'The UFO went home hungry and filed a complaint.'
        },
        round3: {
          intro: 'Your thing is on vacation in a volcano. Drag left or right to dodge falling lava rocks. Survive the timer.',
          win: 'You escaped the volcano. Your insurance has not.',
          lose: 'Your thing has become locally sourced magma.'
        },
        summary: 'Worlds survived. Points of questionable achievement registered. Your thing deserves a vacation.'
      },
      round_modifiers: {
        round1_wreck: {
          launch_impulse: 2.6,
          time_limit: 9.0,
          wreck_scale: 1.0,
          theme_title: 'THE HAUNTED HOUSE',
          theme_accent: '#ff6f98'
        },
        round2_beam: {
          ufo_speed_mult: 1.0,
          beam_window_px: 68,
          target_catches: 2,
          time_limit: 10.0,
          theme_title: 'THE UFO INCIDENT',
          theme_accent: '#7ff2d4',
          decoys: ['COW?', 'NOT IT']
        },
        round3_lava: {
          rock_speed_min: 245,
          rock_speed_max: 315,
          spawn_interval: 0.73,
          hearts: 2,
          time_limit: 10.0,
          theme_title: 'VOLCANO VACATION',
          theme_accent: '#ffcd63'
        }
      }
    };
  }

  /**
   * Validates a raw GamePlan object from Meta Muse Spark or any JSON source.
   * Returns: { valid: boolean, errors: string[], sanitized: Object }
   */
  function validateGamePlan(raw) {
    const errors = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return {
        valid: false,
        errors: ['GamePlan must be a valid non-null JSON object.'],
        sanitized: createDefaultGamePlan()
      };
    }

    // 1. Schema version check
    if (typeof raw.schema_version !== 'string') {
      errors.push('Missing or invalid schema_version (expected "1.3.0").');
    }

    // 2. Detected objects array (MUST NOT BE EMPTY)
    if (!Array.isArray(raw.detected_objects) || raw.detected_objects.length === 0) {
      errors.push('detected_objects must be a non-empty array of recognized objects.');
    }

    const detectedMap = new Map();
    const sanitizedDetected = [];

    if (Array.isArray(raw.detected_objects)) {
      raw.detected_objects.forEach((obj, idx) => {
        if (!obj || typeof obj !== 'object') {
          errors.push(`detected_objects[${idx}] is not an object.`);
          return;
        }
        const id = cleanString(obj.id, 32);
        const label = cleanString(obj.label, SAFE_BOUNDS.string_caps.object_label);
        const confidence = typeof obj.confidence === 'number' ? clamp(obj.confidence, 0.0, 1.0) : 0.5;

        if (!id) {
          errors.push(`detected_objects[${idx}] missing valid string id.`);
        } else {
          detectedMap.set(id, { id, label: label || 'Object', confidence });
          sanitizedDetected.push({
            id,
            label: label || 'Object',
            confidence,
            bounding_box: Array.isArray(obj.bounding_box) && obj.bounding_box.length === 4
              ? obj.bounding_box.map(n => clamp(Number(n) || 0, 0.0, 1.0))
              : [0, 0, 1, 1]
          });
        }
      });
    }

    // 3. Selected object validation & Hallucination Check
    if (!raw.selected_object || typeof raw.selected_object !== 'object') {
      errors.push('selected_object must be an object.');
    } else {
      const selId = cleanString(raw.selected_object.id, 32);
      if (!selId) {
        errors.push('selected_object.id is required.');
      } else if (!detectedMap.has(selId)) {
        // Strict anti-hallucination guard!
        errors.push(`selected_object references hallucinated id "${selId}" not present in detected_objects.`);
      }
    }

    // 4. Whimsical role
    const whimsicalRole = cleanString(
      raw.whimsical_role || raw.selected_object?.role,
      SAFE_BOUNDS.string_caps.whimsical_role,
      'Everyday Chaos Dynamo'
    );

    // 5. Announcer lines
    const rawAnnouncer = raw.announcer_lines || {};
    const announcerLines = {
      intro: cleanString(rawAnnouncer.intro, SAFE_BOUNDS.string_caps.announcer_line, 'One everyday object. Three ridiculous microgames.'),
      round1: {
        intro: cleanString(rawAnnouncer.round1?.intro, SAFE_BOUNDS.string_caps.announcer_line, 'Haunted house demolition time!'),
        win: cleanString(rawAnnouncer.round1?.win, SAFE_BOUNDS.string_caps.announcer_line, 'House demolished! Ghosts evicted!'),
        lose: cleanString(rawAnnouncer.round1?.lose, SAFE_BOUNDS.string_caps.announcer_line, 'House stands tall. Swing again!')
      },
      round2: {
        intro: cleanString(rawAnnouncer.round2?.intro, SAFE_BOUNDS.string_caps.announcer_line, 'UFO sighting overhead! Timing is everything.'),
        win: cleanString(rawAnnouncer.round2?.win, SAFE_BOUNDS.string_caps.announcer_line, 'Extraterrestrial pickup complete!'),
        lose: cleanString(rawAnnouncer.round2?.lose, SAFE_BOUNDS.string_caps.announcer_line, 'Beam missed! Alien highway patrol filed a ticket.')
      },
      round3: {
        intro: cleanString(rawAnnouncer.round3?.intro, SAFE_BOUNDS.string_caps.announcer_line, 'Active volcano! Dodge the falling magma!'),
        win: cleanString(rawAnnouncer.round3?.win, SAFE_BOUNDS.string_caps.announcer_line, 'Volcano conquered! Safe on the shore.'),
        lose: cleanString(rawAnnouncer.round3?.lose, SAFE_BOUNDS.string_caps.announcer_line, 'Turned to toasted cinder!')
      },
      summary: cleanString(rawAnnouncer.summary, SAFE_BOUNDS.string_caps.announcer_line, 'Arcade trial concluded. Incident archived.')
    };

    // 6. Round modifiers & safe bounds enforcement
    const rawMods = raw.round_modifiers || {};
    const b1 = SAFE_BOUNDS.round1_wreck;
    const b2 = SAFE_BOUNDS.round2_beam;
    const b3 = SAFE_BOUNDS.round3_lava;

    const r1Raw = rawMods.round1_wreck || {};
    const r2Raw = rawMods.round2_beam || {};
    const r3Raw = rawMods.round3_lava || {};

    // Check for illegal mechanics or unexpected keys
    const allowedMechanics = ['round1_wreck', 'round2_beam', 'round3_lava'];
    for (const key of Object.keys(rawMods)) {
      if (!allowedMechanics.includes(key)) {
        errors.push(`Unrecognized / unauthorized game mode "${key}" in round_modifiers.`);
      }
    }

    const sanitizedMods = {
      round1_wreck: {
        launch_impulse: clamp(Number(r1Raw.launch_impulse) || b1.launch_impulse.default, b1.launch_impulse.min, b1.launch_impulse.max),
        time_limit: clamp(Number(r1Raw.time_limit) || b1.time_limit.default, b1.time_limit.min, b1.time_limit.max),
        wreck_scale: clamp(Number(r1Raw.wreck_scale) || b1.wreck_scale.default, b1.wreck_scale.min, b1.wreck_scale.max),
        theme_title: cleanString(r1Raw.theme_title, b1.theme_title_max_len, 'THE HAUNTED HOUSE'),
        theme_accent: sanitizeHexColor(r1Raw.theme_accent, '#ff6f98')
      },
      round2_beam: {
        ufo_speed_mult: clamp(Number(r2Raw.ufo_speed_mult) || b2.ufo_speed_mult.default, b2.ufo_speed_mult.min, b2.ufo_speed_mult.max),
        beam_window_px: Math.round(clamp(Number(r2Raw.beam_window_px) || b2.beam_window_px.default, b2.beam_window_px.min, b2.beam_window_px.max)),
        target_catches: Math.round(clamp(Number(r2Raw.target_catches) || b2.target_catches.default, b2.target_catches.min, b2.target_catches.max)),
        time_limit: clamp(Number(r2Raw.time_limit) || b2.time_limit.default, b2.time_limit.min, b2.time_limit.max),
        theme_title: cleanString(r2Raw.theme_title, b2.theme_title_max_len, 'THE UFO INCIDENT'),
        theme_accent: sanitizeHexColor(r2Raw.theme_accent, '#7ff2d4'),
        decoys: Array.isArray(r2Raw.decoys) && r2Raw.decoys.length >= 2
          ? [cleanString(r2Raw.decoys[0], b2.decoy_max_len, 'COW?'), cleanString(r2Raw.decoys[1], b2.decoy_max_len, 'NOT IT')]
          : ['COW?', 'NOT IT']
      },
      round3_lava: {
        rock_speed_min: Math.round(clamp(Number(r3Raw.rock_speed_min) || b3.rock_speed_min.default, b3.rock_speed_min.min, b3.rock_speed_min.max)),
        rock_speed_max: Math.round(clamp(Number(r3Raw.rock_speed_max) || b3.rock_speed_max.default, b3.rock_speed_max.min, b3.rock_speed_max.max)),
        spawn_interval: Number(clamp(Number(r3Raw.spawn_interval) || b3.spawn_interval.default, b3.spawn_interval.min, b3.spawn_interval.max).toFixed(2)),
        hearts: Math.round(clamp(Number(r3Raw.hearts) || b3.hearts.default, b3.hearts.min, b3.hearts.max)),
        time_limit: clamp(Number(r3Raw.time_limit) || b3.time_limit.default, b3.time_limit.min, b3.time_limit.max),
        theme_title: cleanString(r3Raw.theme_title, b3.theme_title_max_len, 'VOLCANO VACATION'),
        theme_accent: sanitizeHexColor(r3Raw.theme_accent, '#ffcd63')
      }
    };

    // Make sure rock_speed_min <= rock_speed_max
    if (sanitizedMods.round3_lava.rock_speed_min > sanitizedMods.round3_lava.rock_speed_max) {
      const tmp = sanitizedMods.round3_lava.rock_speed_min;
      sanitizedMods.round3_lava.rock_speed_min = sanitizedMods.round3_lava.rock_speed_max;
      sanitizedMods.round3_lava.rock_speed_max = tmp;
    }

    const isValid = errors.length === 0;

    // Build the sanitized plan
    const selectedObj = isValid
      ? {
          id: cleanString(raw.selected_object.id, 32),
          label: cleanString(raw.selected_object.label, SAFE_BOUNDS.string_caps.object_label, 'Mystery Prop'),
          role: cleanString(raw.selected_object.role, SAFE_BOUNDS.string_caps.whimsical_role, 'Arcade Prop'),
          description: cleanString(raw.selected_object.description, SAFE_BOUNDS.string_caps.description, '')
        }
      : createDefaultGamePlan().selected_object;

    const sanitizedPlan = {
      schema_version: SCHEMA_VERSION,
      source: cleanString(raw.source, 32, isValid ? 'meta_muse_spark' : 'sanitized_fallback'),
      detected_objects: sanitizedDetected.length > 0 ? sanitizedDetected : createDefaultGamePlan().detected_objects,
      selected_object: selectedObj,
      whimsical_role: whimsicalRole,
      announcer_lines: announcerLines,
      round_modifiers: sanitizedMods
    };

    return {
      valid: isValid,
      errors: errors,
      sanitized: sanitizedPlan
    };
  }

  return {
    SCHEMA_VERSION,
    SAFE_BOUNDS,
    createDefaultGamePlan,
    validateGamePlan
  };
});
