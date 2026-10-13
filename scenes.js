(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CapScenes = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const NAMES = ['COLA', 'PEPZI', 'FUNTI', 'SPRYT', 'Dr. Popper', 'SWEPS', 'RED RULL', 'Monstr',
    'PRYME', 'Poppy', 'San Aqua', 'Mountain Brew', 'NESTI', 'Liquid Dead', 'EVIEN', 'Grape Crushr'];
  const COLORS = ['#e42721', '#1855e4', '#ff921b', '#1b9644', '#8b1c35', '#f8d535', '#8d9ebd', '#81b631',
    '#f436ae', '#f790b7', '#80d5ef', '#8ecd48', '#35cae6', '#474d53', '#99c4ec', '#9951d8'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const whole = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;
  function validateStacks(stacks, length, max = 100) {
    if (!Array.isArray(stacks) || stacks.length !== length) throw new Error(`Expected ${length} stacks.`);
    return stacks.map(stack => {
      if (!Array.isArray(stack) || stack.length > max || stack.some(id => !whole(id, 15))) throw new Error('A stack contains invalid caps or more than 100 caps.');
      return stack.slice();
    });
  }
  function validate(input) {
    if (!input || typeof input !== 'object' || input.version !== 1) throw new Error('This scene format is not supported.');
    const board = validateStacks(input.board, 30), tray = validateStacks(input.tray, 3);
    if (!whole(input.score, 1e12) || !whole(input.seed, 0xFFFFFFFF) || !whole(input.elapsed ?? 0, 1e7)) throw new Error('Check the score, time and seed.');
    const playback = input.playback ?? { speed: 1, multiplier: 1 };
    if (![.5, 1, 1.5, 2].includes(playback.speed) || ![1, 10].includes(playback.multiplier)) throw new Error('Check the scene playback settings.');
    const move = input.move;
    if (move != null && (!whole(move.slot, 2) || !whole(move.index, 29) || board[move.index].length || !tray[move.slot].length)) throw new Error('The trigger needs a Next stack and an empty target cell.');
    return { version: 1, name: String(input.name || 'Untitled scene').slice(0, 80), seed: input.seed,
      score: input.score, elapsed: input.elapsed ?? 0, board, tray, playback: { speed: playback.speed, multiplier: playback.multiplier }, move: move ? { slot: move.slot, index: move.index } : null };
  }
  function preset(kind = 'cascade', seed = 2026) {
    const styles = { spark: [3, 3, 'First spark'], cascade: [5, 4, 'Soda cascade'], finale: [6, 5, 'Full pour'] };
    const [depth, count, name] = styles[kind] || styles.cascade;
    const ids = [0, 1, 2, 3, 5, 6, 8, 10, 15, 4];
    const offset = (seed >>> 0) % ids.length;
    const brands = Array.from({ length: depth }, (_, i) => ids[(offset + i) % ids.length]);
    const board = Array.from({ length: 30 }, () => []), index = [12, 17, 7][(seed >>> 0) % 3];
    const neighbors = [index - 5, index + 5, index - 1, index + 1];
    // Four separated towers stay dormant until the fifth, layered stack connects them.
    for (const n of neighbors) board[n] = [...brands].reverse().flatMap(id => Array(count).fill(id));
    const trigger = [...brands].reverse();
    return { version: 1, name, seed: seed >>> 0, score: 1240, elapsed: 88, board,
      tray: [trigger, Array(5).fill(ids[(offset + depth) % ids.length]), Array(4).fill(ids[(offset + depth + 1) % ids.length])],
      move: { slot: 0, index } };
  }
  function blocks(stack) {
    const out = [];
    for (const brand of stack) {
      if (out.at(-1)?.brand === brand) out.at(-1).count++;
      else out.push({ brand, count: 1 });
    }
    return out;
  }
  function encode(scene) {
    const bytes = new TextEncoder().encode(JSON.stringify(validate(scene)));
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function decode(value) {
    if (typeof value !== 'string' || value.length > 24000 || !/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('The scene link is invalid or too large.');
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    return validate(JSON.parse(new TextDecoder().decode(bytes)));
  }
  return { NAMES, COLORS, clone, validate, validateStacks, preset, blocks, encode, decode };
});
