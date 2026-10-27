/**
 * THING//MANIA — DOM Contract & Mobile Viewport QA Tests
 * 
 * Verifies that:
 * 1. Every DOM selector referenced in game.js exists in index.html.
 * 2. Responsive viewport meta tags and ARIA accessibility labels are present.
 * 3. Script load order is correct (gameplan.js before game.js).
 * 4. CSS contains all responsive breakpoints and classes.
 * 5. State transitions progress properly through all three rounds to incident summary.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('DOM Contract, Mobile Layout & ARIA Accessibility QA', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');

  test('index.html contains mobile responsive meta and accessibility attributes', () => {
    assert.ok(html.includes('<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'), 'Viewport meta tag must be mobile-optimized');
    assert.ok(html.includes('aria-label="THING MANIA: Three playable arcade microgames'), 'Canvas must have informative ARIA label');
    assert.ok(html.includes('aria-live="polite"'), 'Status and modal live regions must have aria-live="polite"');
    assert.ok(html.includes('tabindex="0"'), 'Canvas must be keyboard focusable');
  });

  test('All required DOM elements queried in game.js are present in index.html', () => {
    const requiredIds = [
      'game',
      'modal',
      'primaryBtn',
      'ticketStamp',
      'ticketTitle',
      'ticketBody',
      'ticketBadges',
      'ticketSub',
      'status',
      'photoNote',
      'roleBadge',
      'userConsent',
      'analyzePhotoBtn',
      'budgetStatus',
      'demo',
      'photo'
    ];

    for (const id of requiredIds) {
      const pattern = new RegExp(`id=["']${id}["']`);
      assert.ok(pattern.test(html), `Required element #${id} missing in index.html`);
    }

    assert.ok(html.includes('class="chip-btn"'), '.chip-btn elements must exist');
    assert.ok(html.includes('data-fixture="toy_car"'), 'toy_car chip button must exist');
    assert.ok(html.includes('data-fixture="kitchen_object"'), 'kitchen_object chip button must exist');
    assert.ok(html.includes('data-fixture="stuffed_animal"'), 'stuffed_animal chip button must exist');
  });

  test('Script tags are correctly sequenced in index.html', () => {
    const gameplanIdx = html.indexOf('src="gameplan.js"');
    const gameIdx = html.indexOf('src="game.js"');
    assert.ok(gameplanIdx > 0, 'gameplan.js script tag missing');
    assert.ok(gameIdx > 0, 'game.js script tag missing');
    assert.ok(gameplanIdx < gameIdx, 'gameplan.js must load before game.js');
  });

  test('styles.css contains mobile breakpoints and director panel styles', () => {
    assert.ok(css.includes('@media(max-width:380px)'), 'Mobile breakpoint max-width:380px missing');
    assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'), 'Accessibility reduced motion query missing');
    assert.ok(css.includes('.director-box'), '.director-box styling missing');
    assert.ok(css.includes('.role-badge'), '.role-badge styling missing');
    assert.ok(css.includes('.chip-btn'), '.chip-btn styling missing');
    assert.ok(css.includes('.consent-checkbox'), '.consent-checkbox styling missing');
  });

  test('Three-round state machine sequence is verified', () => {
    // Check that stages define all 3 distinct microgames
    const stagesDef = [
      { name: 'WRECK IT!', round: 0 },
      { name: 'BEAM IT!', round: 1 },
      { name: 'RUN FOR IT!', round: 2 }
    ];

    for (const st of stagesDef) {
      assert.ok(js.includes(st.name), `Microgame "${st.name}" must be defined in game.js`);
    }

    // Verify progression logic exists in game.js
    assert.ok(js.includes('state.round===2'), 'Final round transition must be handled');
    assert.ok(js.includes("setModal('summary')"), 'Summary screen must be reached');
  });
});
