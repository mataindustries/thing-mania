const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMusicController, LOOP_SECONDS, PREFERENCE_KEY } = require('../music');

function host(options = {}) {
  const requests = [], contexts = [], saved = new Map(), timers = new Map();
  if (options.off) saved.set(PREFERENCE_KEY, 'off');
  const events = () => ({
    handlers: {},
    addEventListener(type, fn) { (this.handlers[type] ||= new Set()).add(fn); },
    removeEventListener(type, fn) { this.handlers[type]?.delete(fn); },
    emit(type, event = {}) { for (const fn of this.handlers[type] || []) fn(event); }
  });
  function param(value = 0) {
    return { value, calls: [],
      cancelAndHoldAtTime(t) { this.calls.push(['hold', t]); },
      cancelScheduledValues(t) { this.calls.push(['cancel', t]); },
      setValueAtTime(v, t) { this.calls.push(['set', v, t]); this.value = v; },
      linearRampToValueAtTime(v, t) { this.calls.push(['ramp', v, t]); this.value = v; }
    };
  }
  class Context {
    constructor() {
      this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 48000;
      this.sources = []; this.gains = []; this.resumeCalls = 0; contexts.push(this);
    }
    createGain() {
      const node = { gain: param(), connect() {}, disconnect() {} };
      this.gains.push(node); return node;
    }
    createBufferSource() {
      const node = { starts: [], connect() {}, disconnect() {},
        start(...args) { this.starts.push(args); }, stop() { this.stopped = true; }
      };
      this.sources.push(node); return node;
    }
    createBuffer() { return { duration: 1 / this.sampleRate }; }
    async decodeAudioData(data) {
      if (options.decodeFail?.(data)) throw new Error('Unsupported codec');
      return { duration: options.short ? 30 : data.format === 'm4a' ? 36.223129 : LOOP_SECONDS, sampleRate: this.sampleRate };
    }
    resume() {
      this.resumeCalls++;
      if (options.rejectResume) return Promise.reject(new Error('Interrupted'));
      this.state = 'running'; return Promise.resolve();
    }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const win = Object.assign(events(), {
    AudioContext: options.unsupported ? undefined : Context,
    AbortController,
    setTimeout(fn) { const key = {}; timers.set(key, fn); return key; },
    clearTimeout(key) { timers.delete(key); },
    localStorage: {
      getItem(key) { if (options.storageBlocked) throw new Error('Blocked'); return saved.get(key); },
      setItem(key, value) { if (options.storageBlocked) throw new Error('Blocked'); saved.set(key, value); }
    },
    async fetch(url, init) {
      requests.push(url);
      assert.equal(contexts[0].resumeCalls > 0, true, 'resume must happen synchronously before fetching');
      if (options.fetcher) return options.fetcher(url, init);
      if (options.networkFail) throw new Error('Offline');
      return { ok: true, arrayBuffer: async () => ({ format: url.split('.').pop() }) };
    }
  });
  const doc = Object.assign(events(), {
    hidden: false, createElement: () => ({ canPlayType: () => options.aacOnly ? '' : 'probably' })
  });
  const button = Object.assign(events(), {
    dataset: {}, attrs: {}, setAttribute(key, value) { this.attrs[key] = value; }
  });
  const status = {};
  const music = createMusicController({ window: win, document: doc, button, status });
  const flush = () => new Promise(resolve => setImmediate(resolve));
  return { music, win, doc, button, status, saved, requests, contexts, timers, options, flush,
    loops: () => contexts.at(-1)?.sources.filter(s => s.loop) || [] };
}

test('no context or downloads before a trusted interaction; first tap unlocks both aligned loops', async () => {
  const h = host();
  assert.equal(h.contexts.length, 0); assert.deepEqual(h.requests, []);
  assert.equal(h.button.dataset.state, 'locked');
  h.doc.emit('click', { isTrusted: false }); assert.equal(h.contexts.length, 0);
  h.doc.emit('pointerdown'); await h.flush();
  assert.equal(h.contexts.length, 1); assert.equal(h.requests.length, 2);
  assert.ok(h.requests.every(url => url.endsWith('.ogg')));
  assert.equal(h.loops().length, 2);
  assert.deepEqual(h.loops().map(s => s.starts), [[[0.025, 0]], [[0.025, 0]]]);
  for (const source of h.loops()) {
    assert.equal(source.loopStart, 0); assert.equal(source.loopEnd, 36.2);
  }
  assert.equal(h.button.dataset.state, 'playing'); assert.equal(h.timers.size, 0);
  h.music.destroy();
});

test('mix changes and rapid reversals preserve source identity and musical phase across many wraps', async () => {
  const h = host(); h.music.unlock(); await h.flush();
  const pair = h.loops(), ctx = h.contexts[0], [master, menu, main] = ctx.gains;
  assert.equal(menu.gain.value, 1); assert.equal(main.gain.value, 0);
  for (const time of [2, 36.19, 36.21, 200]) {
    ctx.currentTime = time;
    h.music.setMix('main'); assert.equal(main.gain.value, 1); assert.equal(menu.gain.value, 0);
    h.music.setMix('menu'); assert.equal(menu.gain.value, 1); assert.equal(main.gain.value, 0);
  }
  assert.deepEqual(h.loops(), pair);
  assert.ok(pair.every(source => source.starts.length === 1 && !source.stopped));
  assert.ok(main.gain.calls.some(c => c[0] === 'hold'));
  assert.ok(master.gain.value > 0); h.music.destroy();
});

test('saved OFF prevents downloads; toggling saves preference and leaves aligned sources intact', async () => {
  const h = host({ off: true });
  h.doc.emit('keydown'); await h.flush(); assert.equal(h.contexts.length, 0);
  assert.equal(h.button.attrs['aria-pressed'], 'false');
  h.button.emit('click'); await h.flush();
  assert.equal(h.saved.get(PREFERENCE_KEY), 'on'); assert.equal(h.loops().length, 2);
  const pair = h.loops();
  h.button.emit('click'); assert.equal(h.saved.get(PREFERENCE_KEY), 'off');
  assert.equal(h.contexts[0].gains[0].gain.value, 0);
  h.button.emit('click'); await h.flush(); assert.deepEqual(h.loops(), pair);
  assert.equal(h.contexts[0].gains[0].gain.value, 0.48, 'unmute while context is already running must restore gain');
  assert.equal(h.requests.length, 2); h.music.destroy();
});

test('first interaction on MUSIC OFF does not accidentally unlock or fetch audio', async () => {
  const h = host();
  h.doc.emit('pointerdown', { target: { closest: () => h.button } });
  h.button.emit('click'); await h.flush();
  assert.equal(h.contexts.length, 0); assert.equal(h.requests.length, 0);
});

test('AAC fallback and AAC-only browsers use an explicit loop end excluding encoder padding', async () => {
  for (const options of [{ decodeFail: d => d.format === 'ogg' }, { aacOnly: true }]) {
    const h = host(options); h.music.unlock(); await h.flush();
    assert.equal(h.loops().length, 2);
    assert.ok(h.requests.some(url => url.endsWith('.m4a')));
    for (const source of h.loops()) {
      assert.ok(source.buffer.duration > source.loopEnd);
      assert.equal(source.loopEnd, 36.2);
    }
    h.music.destroy();
  }
});

test('backgrounding, rapid foreground return and bfcache restore suspend music without restarting the pair', async () => {
  const h = host(); h.music.unlock(); await h.flush(); const pair = h.loops(), ctx = h.contexts[0];
  h.doc.hidden = true; h.doc.emit('visibilitychange');
  assert.equal(ctx.state, 'suspended'); assert.equal(ctx.gains[0].gain.value, 0);
  h.doc.hidden = false; h.doc.emit('visibilitychange'); await h.flush();
  assert.equal(ctx.state, 'running'); assert.deepEqual(h.loops(), pair);
  h.win.emit('pagehide'); await h.flush(); assert.equal(ctx.state, 'suspended');
  h.win.emit('pageshow'); await h.flush(); assert.equal(ctx.state, 'running');
  h.music.setEnabled(false);
  h.doc.hidden = true; h.doc.emit('visibilitychange'); await h.flush();
  h.doc.hidden = false; h.doc.emit('visibilitychange'); await h.flush();
  assert.equal(ctx.state, 'suspended'); assert.equal(h.button.dataset.state, 'off');
  h.music.destroy();
});

test('interruptions and rejected resume promises recover on the next gesture without reloading', async () => {
  const h = host(); h.music.unlock(); await h.flush(); const pair = h.loops(), ctx = h.contexts[0];
  ctx.state = 'interrupted'; ctx.onstatechange(); assert.equal(h.button.dataset.state, 'interrupted');
  h.options.rejectResume = true; h.doc.emit('pointerdown'); await h.flush();
  assert.equal(h.button.dataset.state, 'interrupted');
  h.options.rejectResume = false; h.doc.emit('keydown'); await h.flush();
  assert.equal(h.button.dataset.state, 'playing'); assert.deepEqual(h.loops(), pair);
  assert.equal(h.requests.length, 2); h.music.destroy();
});

test('overlapping ducks extend the audio-clock hold and restore volume; mute cancels restoration', async () => {
  const h = host(); h.music.unlock(); await h.flush(); const ctx = h.contexts[0], gain = ctx.gains[0].gain;
  ctx.currentTime = 10; h.music.duck(1.8);
  ctx.currentTime = 11; h.music.duck(2.6);
  ctx.currentTime = 11.2; h.music.duck(0.1);
  assert.deepEqual(gain.calls.at(-2), ['set', 0.12, 13.6]);
  assert.deepEqual(gain.calls.at(-1), ['ramp', 0.48, 13.9]);
  h.music.setEnabled(false); assert.equal(gain.value, 0); h.music.destroy();
});

test('load errors, truncated encodes and unsupported audio stay nonfatal and retry on re-enable', async () => {
  for (const options of [{ networkFail: true }, { short: true }, { unsupported: true }]) {
    const h = host(options); assert.doesNotThrow(() => h.music.unlock()); await h.flush();
    assert.equal(h.button.dataset.state, 'unavailable'); assert.equal(h.loops().length, 0);
    h.options.networkFail = false; h.options.short = false;
    if (!options.unsupported) {
      h.music.setEnabled(false); h.music.setEnabled(true); await h.flush();
      assert.equal(h.button.dataset.state, 'playing');
    }
    h.music.destroy();
  }
});

test('muting or backgrounding during decode cannot start music, and blocked storage is harmless', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const h = host({ storageBlocked: true, fetcher: async () => {
    await pending; return { ok: true, arrayBuffer: async () => ({ format: 'ogg' }) };
  } });
  h.music.unlock(); h.music.setEnabled(false); h.doc.hidden = true; h.doc.emit('visibilitychange');
  finish(); await h.flush(); assert.equal(h.loops().length, 0);
  h.doc.hidden = false; h.doc.emit('visibilitychange'); await h.flush();
  assert.equal(h.loops().length, 0);
  h.music.setEnabled(true); await h.flush(); assert.equal(h.loops().length, 2);
  h.music.destroy(); assert.equal(h.contexts[0].state, 'closed');
  h.doc.emit('pointerdown'); assert.equal(h.contexts.length, 1);
});
