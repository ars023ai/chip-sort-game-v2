// DOM-based lifecycle regression tests. They do not launch or automate a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
function harness(creator, saved, best = 9876, motion = false) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://game.example/' + (creator ? '?creator=1' : ''), runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; let now = 0, id = 0; const tasks = new Map(), errors = [];
  Object.defineProperty(w.performance, 'now', { value: () => now });
  w.setTimeout = (fn, delay = 0) => { const n = ++id; tasks.set(n, { fn, at: now + delay }); return n; };
  w.clearTimeout = n => tasks.delete(n);
  w.setInterval = (fn, delay) => { const n = ++id; tasks.set(n, { fn, at: now + delay, every: delay }); return n; };
  w.clearInterval = w.clearTimeout;
  w.requestAnimationFrame = fn => w.setTimeout(() => fn(now), 16); w.cancelAnimationFrame = w.clearTimeout;
  w.Element.prototype.animate = function (_, options) {
    let remaining = options.duration, previous = now, playing = true, frame, stopped = false, resolve, reject;
    const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
    const animation = { finished, playbackRate: 1, pause() { playing = false; }, play() { playing = true; },
      cancel() { if (stopped) return; stopped = true; w.cancelAnimationFrame(frame); reject(new w.DOMException('Cancelled', 'AbortError')); } };
    const step = time => {
      if (stopped) return; if (playing) remaining -= (time - previous) * animation.playbackRate; previous = time;
      if (remaining <= 0) { stopped = true; resolve(); } else frame = w.requestAnimationFrame(step);
    };
    frame = w.requestAnimationFrame(step); return animation;
  };
  w.matchMedia = () => ({ matches: false }); w.ResizeObserver = class { observe() {} };
  w.Element.prototype.getBoundingClientRect = function () { return { x: 0, y: 0, left: 0, top: 0, width: this.classList.contains('cap') ? 60 : 100, height: 100 }; };
  w.console.error = (...values) => errors.push(values.map(String).join(' '));
  w.localStorage.setItem('cap-stack-sort-v2-best', JSON.stringify(best));
  w.localStorage.setItem('cap-stack-sort-options-v2', JSON.stringify({ sound: false, motion }));
  if (saved) w.localStorage.setItem('cap-stack-sort-session-v2', JSON.stringify(saved));
  for (const file of ['rules.js', 'balance.js', 'scenes.js', 'session.js', 'game.js', 'studio.js']) w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  async function advance(duration) {
    const until = now + duration;
    while (now < until) {
      now = Math.min(now + 16, until);
      const due = [...tasks].filter(([, task]) => task.at <= now);
      for (const [n, task] of due) {
        if (!tasks.has(n)) continue;
        if (task.every) task.at += task.every; else tasks.delete(n);
        task.fn();
      }
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    }
  }
  const press = text => { const button = [...w.document.querySelectorAll('button')].find(node => node.textContent.trim() === text); assert(button, `button ${text}`); button.click(); };
  return { w, G: w.CapGame, S: w.CapScenes, advance, press, errors, close: () => dom.window.close() };
}
(async () => {
  const h = harness(true, null, 9876, true), { G, S } = h;
  assert.equal(h.w.document.querySelectorAll('.cell').length, 30); assert.equal(h.w.document.querySelectorAll('.tray-slot').length, 3);
  const originalBest = h.w.localStorage.getItem('cap-stack-sort-v2-best');
  const scene = S.preset('spark', 8); G.loadScene(scene); G.preparePlay();
  const run = G.place(scene.move.slot, scene.move.index); await h.advance(300);
  assert(G.status().busy); G.pause(true);
  const paused = JSON.stringify(G.snapshot()); await h.advance(3000); assert.equal(JSON.stringify(G.snapshot()), paused, 'pause freezes the board, score and timer');
  G.pause(false); await h.advance(16000); assert.equal(await run, true);
  assert.equal(G.snapshot().score, 1240 + 390); assert.equal(G.snapshot().cleared, 39); assert.equal(G.status().chainCount, 3);
  assert.equal(G.snapshot().board.filter(stack => stack.length).length, 0);
  assert.equal(h.w.localStorage.getItem('cap-stack-sort-v2-best'), originalBest, 'creator points cannot change BEST');
  assert.equal(h.w.localStorage.getItem('cap-stack-sort-session-v2'), null, 'creator cannot overwrite normal saves');
  G.loadScene(scene); G.setMultiplier(10); G.preparePlay(); const superRun = G.place(scene.move.slot, scene.move.index); await h.advance(16000); await superRun;
  assert.equal(G.snapshot().score, 1240 + 3900); G.setMultiplier(1);
  for (const delay of [32, 500, 2800]) {
    const old = S.preset('cascade', 12), replacement = S.preset('spark', 99); G.loadScene(old); G.preparePlay();
    const pending = G.place(old.move.slot, old.move.index); await h.advance(delay); G.loadScene(replacement);
    const snapshot = JSON.stringify(G.snapshot()); await h.advance(10000); assert.equal(await pending, false);
    assert.equal(JSON.stringify(G.snapshot()), snapshot, 'cancelled take cannot mutate the next scene'); assert.equal(G.status().busy, false);
  }
  // Exercise the actual editor controls, layer mutation, undo and invalid import.
  h.press('Empty board'); h.w.document.querySelector('#layer-brand').value = '6'; h.press('+ Add top layer');
  assert.equal(G.snapshot().board[12].length, 4); assert(G.snapshot().board[12].every(id => id === 6));
  h.press('Undo'); assert.equal(G.snapshot().board[12].length, 0);
  h.w.document.querySelector('#scene-json').value = '{"version":99}'; h.press('Import JSON');
  assert(h.w.document.querySelector('#studio-status').classList.contains('error'));
  // A full stable board with no adjacent matching tops must end the game and freeze time.
  const full = S.preset('spark', 0); full.board = Array.from({ length: 30 }, (_, i) => [(Math.floor(i/5) + i%5) % 4]);
  full.board[29] = []; full.tray = [[1],[],[]]; full.move = {slot:0,index:29}; G.loadScene(full); G.preparePlay();
  const endRun = G.place(0, 29); await h.advance(3000); await endRun; assert.equal(G.snapshot().over, true);
  const endedAt = G.snapshot().elapsedMs; await h.advance(10000); assert.equal(G.snapshot().elapsedMs, endedAt);
  assert.equal(await G.place(0, 1), false); assert.equal(h.errors.length, 0); h.close();
  const P = require('../session.js'); const saved = P.create(1); saved.started = true; saved.tray = [[0,0,0,0],[1,1,1,1],[2,2,2,2]]; saved.elapsedMs = 12000;
  const n = harness(false, saved); assert.equal(n.w.document.querySelector('#modal-title').textContent, 'Your board is waiting.');
  await n.advance(5000); assert.equal(n.G.snapshot().elapsedMs, 12000); n.press('Continue round'); await n.advance(3000);
  assert(n.G.snapshot().elapsedMs >= 14900); n.w.document.querySelector('#settings').click();
  const atPause = n.G.snapshot().elapsedMs; await n.advance(5000); assert.equal(n.G.snapshot().elapsedMs, atPause);
  n.press('Start a fresh game'); n.press('Start new game'); await n.advance(3000);
  assert.equal(n.G.snapshot().elapsedMs, 0); assert.equal(n.G.snapshot().started, false); assert.equal(n.G.snapshot().moves, 0);
  assert.equal(n.errors.length, 0); n.close();
  console.log('PASS: animated lifecycle, pause, cancellation at 3 phases, Super Score isolation, editor undo, save/resume, frozen Game Over');
})().catch(error => { console.error(error); process.exitCode = 1; });
