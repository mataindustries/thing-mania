/* THING//MANIA original OST. No media-element looping or timer-based seams. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ThingMusic = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  // Soundtrack manifest: 1,596,420 frames / 44,100 Hz. AAC has end padding.
  const LOOP_SECONDS = 1596420 / 44100;
  const PREFERENCE_KEY = 'thingmania.music.enabled';
  const LEVEL = 0.48;
  const FADE = 0.35;

  function createMusicController({ window: win = window, document: doc = document, button, status } = {}) {
    let enabled = true;
    try { enabled = win.localStorage.getItem(PREFERENCE_KEY) !== 'off'; } catch (_) {}
    let context = null, master = null, gains = [], sources = [], buffers = null;
    let loading = null, activated = false, away = false, failed = false;
    let mix = 'menu', epoch = 0, offset = 0, duckUntil = 0;
    let retryAt = 0, destroyed = false;
    const listeners = [];
    const hidden = () => away || doc.hidden;
    const listen = (target, type, handler, options) => {
      target.addEventListener(type, handler, options);
      listeners.push(() => target.removeEventListener(type, handler, options));
    };

    function render() {
      const state = !enabled ? 'off' : failed ? 'unavailable' : !activated ? 'locked'
        : hidden() ? 'paused' : loading ? 'loading'
        : context?.state !== 'running' ? 'interrupted' : sources.length ? 'playing' : 'loading';
      if (button) {
        button.textContent = enabled ? '♫ MUSIC ON' : '♫ MUSIC OFF';
        button.setAttribute('aria-pressed', String(enabled));
        button.dataset.state = state;
      }
      if (status) status.textContent = {
        off: 'SOUND EFFECTS STAY ON', locked: 'TAP TO START', paused: 'PAUSED',
        loading: 'LOADING THE GROOVE', interrupted: 'TAP TO RESUME',
        unavailable: 'AUDIO UNAVAILABLE · TOGGLE TO RETRY', playing: 'ORIGINAL SOUNDTRACK'
      }[state];
    }

    // Hold the actual interpolated value, including when transitions overlap.
    // Linear complementary fades suit these correlated, aligned arrangements.
    function ramp(param, value, duration) {
      const now = context.currentTime;
      if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(now);
      else {
        const held = param.value;
        param.cancelScheduledValues(now);
        param.setValueAtTime(held, now);
      }
      param.linearRampToValueAtTime(value, now + duration);
    }

    function stopSources() {
      if (sources.length && context) offset = ((context.currentTime - epoch) % LOOP_SECONDS + LOOP_SECONDS) % LOOP_SECONDS;
      for (const source of sources) {
        try { source.stop(); source.disconnect(); } catch (_) {}
      }
      for (const gain of gains) gain.disconnect();
      sources = []; gains = [];
    }

    function setLevel() {
      if (!master) return;
      const now = context.currentTime;
      ramp(master.gain, enabled && !hidden() ? LEVEL : 0, 0.08);
      if (enabled && !hidden() && duckUntil > now) {
        // Audio-clock automation survives a busy render thread; overlapping
        // effects extend the hold instead of scheduling competing restorations.
        ramp(master.gain, LEVEL * 0.25, 0.025);
        master.gain.setValueAtTime(LEVEL * 0.25, duckUntil);
        master.gain.linearRampToValueAtTime(LEVEL, duckUntil + 0.3);
      }
    }

    function play() {
      if (destroyed || !enabled || hidden() || !buffers || context?.state !== 'running') { render(); return; }
      if (!sources.length) {
        // Both sources start at the same audio-clock instant, and keep running
        // through mix changes. Native loopEnd excludes AAC padding every cycle.
        const when = context.currentTime + 0.025;
        epoch = when - offset;
        try {
          for (let i = 0; i < buffers.length; i++) {
            const source = context.createBufferSource(), gain = context.createGain();
            sources.push(source); gains.push(gain);
            source.buffer = buffers[i]; source.loop = true;
            source.loopStart = 0; source.loopEnd = LOOP_SECONDS;
            gain.gain.setValueAtTime((i === 1) === (mix === 'main') ? 1 : 0, when);
            source.connect(gain); gain.connect(master); source.start(when, offset);
          }
          master.gain.setValueAtTime(0, context.currentTime);
          failed = false;
        } catch (_) { stopSources(); failed = true; }
      }
      setLevel();
      render();
    }

    async function decode(name) {
      const probe = doc.createElement('audio');
      const formats = probe.canPlayType?.('audio/ogg; codecs="vorbis"') ? ['ogg', 'm4a'] : ['m4a', 'ogg'];
      for (const format of formats) {
        const abort = new win.AbortController();
        const timeout = win.setTimeout(() => abort.abort(), 12000);
        try {
          const response = await win.fetch(`/public/audio/${name}-loop.${format}`, { signal: abort.signal });
          if (!response.ok) throw new Error('OST unavailable');
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          if (buffer.duration + 1 / buffer.sampleRate < LOOP_SECONDS) throw new Error('OST truncated');
          return buffer;
        } catch (_) { /* Try the other verified browser encoding. */ }
        finally { win.clearTimeout(timeout); }
      }
      throw new Error('OST unavailable');
    }

    function load() {
      if (buffers || loading || Date.now() < retryAt) return;
      failed = false;
      loading = Promise.all([decode('menu-mix'), decode('main-theme')])
        .then(result => { buffers = result; failed = false; })
        .catch(() => { failed = true; retryAt = Date.now() + 10000; })
        .finally(() => { loading = null; if (!destroyed) play(); });
      render();
    }

    function unlock() {
      if (destroyed || !enabled || hidden()) return;
      activated = true;
      try {
        if (!context || context.state === 'closed') {
          stopSources();
          const AudioContext = win.AudioContext || win.webkitAudioContext;
          context = new AudioContext();
          master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
          context.onstatechange = () => {
            if (destroyed) return;
            if (context.state === 'running') {
              if (hidden()) pause(); else { setLevel(); play(); }
            }
            render();
          };
        }
        // Call resume in the gesture itself, before any fetch/decode await.
        // A one-frame silent buffer also unlocks older mobile Web Audio paths.
        const resumed = context.resume();
        const silent = context.createBufferSource();
        silent.buffer = context.createBuffer(1, 1, context.sampleRate);
        silent.connect(context.destination); silent.onended = () => silent.disconnect(); silent.start();
        Promise.resolve(resumed).then(() => { if (!destroyed) play(); }).catch(() => { render(); });
        load();
      } catch (_) { failed = true; }
      render();
    }

    function pause() {
      if (!context || context.state === 'closed') return;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0, context.currentTime);
      // Keep the pair and its timeline intact while the audio clock is frozen.
      Promise.resolve(context.suspend()).then(() => {
        // A quick app switch may return before suspend resolves.
        if (!destroyed && !hidden() && enabled) unlock();
      }).catch(() => {}).finally(render);
      render();
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      try { win.localStorage.setItem(PREFERENCE_KEY, enabled ? 'on' : 'off'); } catch (_) {}
      if (enabled) { retryAt = 0; unlock(); }
      else {
        failed = false;
        if (context && master) { duckUntil = 0; setLevel(); }
      }
      render();
    }

    function setMix(value) {
      const next = value === 'main' ? 'main' : 'menu';
      if (mix === next) return;
      mix = next;
      if (context && sources.length) {
        gains.forEach((gain, i) => ramp(gain.gain, (i === 1) === (mix === 'main') ? 1 : 0, FADE));
      }
    }

    function duck(seconds = 0.8) {
      if (!context || !enabled || hidden() || context.state !== 'running') return;
      duckUntil = Math.max(duckUntil, context.currentTime + Math.max(0, seconds));
      setLevel();
    }

    const gesture = event => {
      if (event.isTrusted === false || event.repeat || event.target?.closest?.('#musicToggle')) return;
      // Pointer/key/click listeners remain installed for interruption recovery.
      if (!activated || failed || context?.state !== 'running') unlock();
    };
    listen(doc, 'pointerdown', gesture, true);
    listen(doc, 'keydown', gesture, true);
    listen(doc, 'click', gesture, true);
    if (button) listen(button, 'click', () => setEnabled(!enabled));
    listen(doc, 'visibilitychange', () => { if (hidden()) pause(); else if (activated && enabled) unlock(); });
    listen(win, 'pagehide', () => { away = true; pause(); });
    listen(win, 'pageshow', () => { away = false; if (activated && enabled && !hidden()) unlock(); });
    render();
    return {
      unlock, setEnabled, setMix, duck,
      destroy() {
        destroyed = true; listeners.forEach(remove => remove()); stopSources();
        if (context && context.state !== 'closed') Promise.resolve(context.close()).catch(() => {});
      }
    };
  }
  return { createMusicController, LOOP_SECONDS, PREFERENCE_KEY };
});
