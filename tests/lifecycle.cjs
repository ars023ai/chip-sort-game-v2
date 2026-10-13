// DOM-based lifecycle regression tests. They do not launch or automate a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
function harness(creator, saved, best = 9876, motion = false, frameLess = false) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), { url: 'https://game.example/' + (creator ? '?creator=1' : ''), runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; let now = 0, id = 0, copiedLink; const tasks = new Map(), errors = [];
  w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async value => { copiedLink = value; } } });
  Object.defineProperty(w.performance, 'now', { value: () => now });
  w.setTimeout = (fn, delay = 0) => { const n = ++id; tasks.set(n, { fn, at: now + delay }); return n; };
  w.clearTimeout = n => tasks.delete(n);
  w.setInterval = (fn, delay) => { const n = ++id; tasks.set(n, { fn, at: now + delay, every: delay }); return n; };
  w.clearInterval = w.clearTimeout;
  w.requestAnimationFrame = fn => frameLess ? ++id : w.setTimeout(() => fn(now), 16); w.cancelAnimationFrame = w.clearTimeout;
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
  for (const file of ['rules.js', 'balance.js', 'scenes.js', 'session.js', 'layout.js', 'game.js', 'studio.js']) w.eval(fs.readFileSync(path.join(root, file), 'utf8'));
  w.document.querySelector('#boot-screen').hidden = true;
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
  return { w, G: w.CapGame, S: w.CapScenes, advance, press, errors, link: () => copiedLink, close: () => dom.window.close() };
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
  h.press('Generate scene'); h.w.document.querySelector('#scene-speed').value = '2'; h.w.document.querySelector('#scene-speed').dispatchEvent(new h.w.Event('change'));
  h.w.document.querySelector('#super-score').checked = true; h.w.document.querySelector('#super-score').dispatchEvent(new h.w.Event('change'));
  h.press('▶ Play the trigger'); await h.advance(18000); assert.equal(G.status().busy, false);
  h.w.document.querySelector('#scene-speed').value = '1.5'; h.w.document.querySelector('#scene-speed').dispatchEvent(new h.w.Event('change'));
  h.w.document.querySelector('#super-score').checked = false; h.w.document.querySelector('#super-score').dispatchEvent(new h.w.Event('change'));
  h.press('Copy scene link'); await Promise.resolve();
  const exported = S.decode(new URL(h.link()).hash.slice('#scene='.length));
  assert.deepEqual(JSON.parse(JSON.stringify(exported.playback)), { speed: 1.5, multiplier: 1 }, 'shared scene includes current playback controls after a take');
  // A full stable board with no adjacent matching tops must end the game and freeze time.
  const full = S.preset('spark', 0); full.board = Array.from({ length: 30 }, (_, i) => [(Math.floor(i/5) + i%5) % 4]);
  full.board[29] = []; full.tray = [[1],[],[]]; full.move = {slot:0,index:29}; G.loadScene(full); G.preparePlay();
  const endRun = G.place(0, 29); await h.advance(3000); await endRun; assert.equal(G.snapshot().over, true);
  const endedAt = G.snapshot().elapsedMs; await h.advance(10000); assert.equal(G.snapshot().elapsedMs, endedAt);
  assert.equal(await G.place(0, 1), false); assert.equal(h.errors.length, 0); h.close();
  const f = harness(true, null, 9876, true, true), stalledScene = f.S.preset('spark', 2);
  f.G.loadScene(stalledScene); f.G.preparePlay(); const withoutFrames = f.G.place(stalledScene.move.slot, stalledScene.move.index);
  await f.advance(16000); assert.equal(await withoutFrames, true); assert.equal(f.G.snapshot().cleared, 39);
  assert.equal(f.G.status().busy, false); const finishedTime = f.G.snapshot().elapsedMs;
  await f.advance(10000); assert.equal(f.G.snapshot().elapsedMs, finishedTime, 'completed creator take freezes time'); f.close();
  const P = require('../session.js'); const saved = P.create(1); saved.started = true; saved.tray = [[0,0,0,0],[1,1,1,1],[2,2,2,2]]; saved.elapsedMs = 12000;
  const n = harness(false, saved); assert.equal(n.w.document.querySelector('#home-title').textContent, 'Your board is waiting.'); assert.equal(n.w.document.querySelector('#home-screen').hidden, false);
  await n.advance(5000); assert.equal(n.G.snapshot().elapsedMs, 12000); n.press('Continue'); await n.advance(3000);
  assert(n.G.snapshot().elapsedMs >= 14900); n.w.document.querySelector('#pause-button').click();
  const atPause = n.G.snapshot().elapsedMs; await n.advance(5000); assert.equal(n.G.snapshot().elapsedMs, atPause);
  n.press('Start a fresh game'); n.press('Start new game'); await n.advance(3000);
  assert.equal(n.G.snapshot().elapsedMs, 0); assert.equal(n.G.snapshot().started, false); assert.equal(n.G.snapshot().moves, 0);
  assert.equal(n.errors.length, 0); n.close();
  const first = harness(false); assert.equal(first.G.status().homeVisible, true);
  await first.advance(10000); assert.equal(first.G.snapshot().elapsedMs, 0);
  first.press('How to play'); assert.equal(first.w.document.querySelector('#modal-title').textContent, 'Small moves. Big chains.'); first.press('Back to menu');
  first.press('Settings'); const sound = first.w.document.querySelector('input[aria-label="Sound effects"]'); sound.checked = true; sound.dispatchEvent(new first.w.Event('change')); first.press('Back to menu');
  assert.equal(JSON.parse(first.w.localStorage.getItem('cap-stack-sort-options-v2')).sound, true);
  first.press('Play'); assert.equal(first.G.status().homeVisible, false); assert.equal(first.w.document.querySelector('#coach').hidden, false);
  const one = first.G.place(0,12); await first.advance(2000); await one; const two = first.G.place(1,13); await first.advance(5000); await two;
  assert.equal(first.G.snapshot().score,100); assert.equal(first.G.snapshot().cleared,10); assert.equal(first.w.document.querySelector('#coach-title').textContent,'Nice. Your first clear!');
  first.press('Got it'); assert.equal(first.w.document.querySelector('#coach').hidden,true); assert.equal(JSON.parse(first.w.localStorage.getItem('cap-stack-sort-options-v2')).tutorialDone,true);
  first.w.document.querySelector('#home-button').click(); const inMenu = JSON.stringify(first.G.snapshot()); await first.advance(5000); assert.equal(JSON.stringify(first.G.snapshot()),inMenu);
  first.press('Continue'); assert.equal(first.G.snapshot().score,100); assert.equal(first.G.snapshot().moves,2);
  const pendingMove = first.G.place(2,0); await first.advance(16); first.w.document.querySelector('#home-button').click();
  const waiting = JSON.stringify(first.G.snapshot()); await first.advance(3000); assert.equal(JSON.stringify(first.G.snapshot()),waiting,'home freezes an in-flight move');
  first.press('Continue'); await first.advance(3000); assert.equal(await pendingMove,true);
  first.w.document.querySelector('#home-button').click(); first.press('New game'); first.press('Keep this round'); assert.equal(first.G.snapshot().score,100,'cancelled restart keeps the round');
  first.press('New game'); first.press('Start new game'); assert.equal(first.G.snapshot().score,0); assert.equal(first.G.snapshot().tutorial,false,'introduction is not repeated after completion');
  const restoreMe = first.G.place(0,0); await first.advance(2000); await restoreMe; first.w.document.querySelector('#home-button').click();
  const stored = JSON.parse(first.w.localStorage.getItem('cap-stack-sort-session-v2')), reopened = harness(false,stored); assert.equal(reopened.G.status().homeVisible,true); reopened.press('Continue');
  assert.deepEqual(JSON.parse(JSON.stringify(reopened.G.snapshot().board)),stored.board,'home continuation restores the same board');
  assert.equal(first.errors.length,0); assert.equal(reopened.errors.length,0); first.close(); reopened.close();
  console.log('PASS: animated lifecycle, pause, cancellation at 3 phases, Super Score isolation, editor undo, save/resume, frozen Game Over');
})().catch(error => { console.error(error); process.exitCode = 1; });
