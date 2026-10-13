(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CapSession = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const BEST_KEY = 'cap-stack-sort-v2-best', SAVE_KEY = 'cap-stack-sort-session-v2', OPTIONS_KEY = 'cap-stack-sort-options-v2';
  const clone = value => JSON.parse(JSON.stringify(value));
  function create(seed) {
    return { version: 2, seed: seed >>> 0, rngState: seed >>> 0, board: Array.from({ length: 30 }, () => []),
      tray: [[], [], []], introSlots: [null, null, null], score: 0, cleared: 0, moves: 0, elapsedMs: 0,
      started: false, over: false, activeCount: 4, presenting: null, warmupCleared: null };
  }
  function validate(input, scenes, balance) {
    if (!input || input.version !== 2 || !Number.isSafeInteger(input.score) || input.score < 0 || input.score > 1e12 ||
      !Number.isSafeInteger(input.cleared) || input.score !== input.cleared * 10 ||
      !Number.isSafeInteger(input.moves) || input.moves < 0 || !Number.isFinite(input.elapsedMs) || input.elapsedMs < 0 || input.elapsedMs > 1e12 ||
      !Number.isSafeInteger(input.seed) || input.seed < 0 || input.seed > 0xFFFFFFFF ||
      !Number.isSafeInteger(input.rngState) || input.rngState < 0 || input.rngState > 0xFFFFFFFF ||
      !Number.isInteger(input.activeCount) || input.activeCount < 4 || input.activeCount > 16 ||
      typeof input.started !== 'boolean' || typeof input.over !== 'boolean') throw new Error('Invalid saved game.');
    const result = clone(input), valid = new Set(balance.activeBrands(input.activeCount));
    result.board = scenes.validateStacks(input.board, 30, 10000);
    result.tray = scenes.validateStacks(input.tray, 3, 6);
    if ([...result.board, ...result.tray].some(stack => stack.some(id => !valid.has(id)))) throw new Error('Saved game contains a locked brand.');
    if (!Array.isArray(input.introSlots) || input.introSlots.length !== 3 || input.introSlots.some(id => id != null && !valid.has(id))) throw new Error('Invalid introduction.');
    if (input.warmupCleared != null && (!Number.isSafeInteger(input.warmupCleared) || input.warmupCleared < 0 || input.warmupCleared > input.cleared)) throw new Error('Invalid warmup.');
    if (input.presenting != null) {
      const p = input.presenting;
      if (p.brand !== balance.BRAND_ORDER[input.activeCount - 1] || !Number.isInteger(p.issued) || !Number.isInteger(p.placed) || p.issued < 0 || p.issued > 3 || p.placed < 0 || p.placed >= 3 || p.placed > p.issued) throw new Error('Invalid introduction counters.');
      if (input.introSlots.filter(id => id === p.brand).length !== p.issued - p.placed) throw new Error('Introduction stacks do not match counters.');
    } else if (input.introSlots.some(id => id != null)) throw new Error('Unexpected introduction stacks.');
    return result;
  }
  function storage() {
    try { return window.localStorage; } catch { return null; }
  }
  function read(key, fallback = null) { try { return JSON.parse(storage()?.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } }
  function write(key, value) { try { const target = storage(); if (!target) return false; target.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
  return { BEST_KEY, SAVE_KEY, OPTIONS_KEY, create, validate, clone, read, write };
});
