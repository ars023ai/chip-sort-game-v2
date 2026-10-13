// One generator and one progression policy for gameplay and reproducible simulations.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CapBalance = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const BRAND_ORDER = [0, 1, 2, 3, 4, 5, 10, 8, 15, 9, 7, 11, 12, 14, 13, 6];
  const UNLOCK_CLEARS = [0, 0, 0, 0, 60, 140, 230, 260, 350, 380, 470, 500, 590, 620, 710, 800];
  const WARMUP_SECONDS = 180;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const activeBrands = count => BRAND_ORDER.slice(0, clamp(count, 1, BRAND_ORDER.length));
  function seededRandom(seed, savedState) {
    let x = (savedState ?? seed) >>> 0;
    const random = () => {
      x = (x + 0x6D2B79F5) >>> 0;
      let t = Math.imul(x ^ (x >>> 15), x | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    random.getState = () => x;
    return random;
  }
  function difficulty(ctx) {
    const free = ctx.freeCells ?? 30, cleared = ctx.cleared || 0;
    if ((ctx.elapsed || 0) < WARMUP_SECONDS) {
      return { progress: 0, minSize: 4, maxSize: 6, maxColors: 1, mixChance: 0,
        threeChance: 0, helpChance: free <= 5 ? .70 : .68, rescue: free <= 5, warmup: true };
    }
    // Changes follow clears, not elapsed time. The warmup baseline prevents a cliff at 3:00.
    const earned = Math.max(0, cleared - (ctx.warmupCleared || 0));
    const progress = 1 - Math.exp(-earned / 420);
    const late = 1 - Math.exp(-Math.max(0, cleared - 800) / 1400);
    const maxColors = (ctx.activeCount || 4) >= 9 ? 3 : 2;
    return { progress, late, minSize: progress > .58 ? 2 : 3, maxSize: progress > .58 ? 4 : 6,
      maxColors, warmup: false, rescue: free <= 5,
      helpChance: free <= 5 ? .70 : .62 - progress * .39 - late * .09,
      mixChance: .08 + progress * .67 + late * .15,
      threeChance: maxColors < 3 ? 0 : Math.max(0, (progress - .28) / .72) * .56 + late * .12 };
  }
  function usefulWeights(board, ids) {
    const weights = new Map(ids.map(id => [id, 0]));
    for (const stack of board || []) {
      if (!stack?.length) continue;
      const top = stack.at(-1);
      if (!weights.has(top)) continue;
      let run = 0;
      for (let i = stack.length - 1; i >= 0 && stack[i] === top; i--) run++;
      weights.set(top, weights.get(top) + 1 + run * run + (run >= 8 ? 28 : run >= 6 ? 13 : 0));
    }
    return weights;
  }
  function weightedPick(entries, random) {
    let roll = random() * entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [value, weight] of entries) { roll -= weight; if (roll < 0) return value; }
    return entries.at(-1)[0];
  }
  function pickBrand(ctx, ids, random, helpful, excluded) {
    const pool = ids.filter(id => !excluded.includes(id));
    if (helpful) {
      const weights = usefulWeights(ctx.board, pool);
      const candidates = pool.map(id => [id, weights.get(id)]).filter(([, w]) => w > 0);
      if (candidates.length) return weightedPick(candidates, random);
    }
    return pool[Math.floor(random() * pool.length)];
  }
  function makeNextStack(ctx, random = Math.random) {
    const d = difficulty(ctx);
    if (ctx.forcedBrand != null) return Array(4 + Math.floor(random() * 3)).fill(ctx.forcedBrand);
    const ids = activeBrands(ctx.activeCount || 4).filter(id => id !== ctx.excludedBrand);
    let total;
    if (d.warmup) total = 4 + Math.floor(random() * 3);
    else if (random() < d.progress) total = 2 + Math.floor(random() * (d.late > .65 ? 2 : 3));
    else total = 4 + Math.floor(random() * 3);
    const roll = random();
    const blocks = Math.min(total, ids.length, roll < d.threeChance ? 3 : roll < d.mixChance ? 2 : 1);
    const sizes = Array(blocks).fill(1), colors = [], helpful = random() < d.helpChance;
    for (let n = blocks; n < total; n++) sizes[Math.floor(random() * blocks)]++;
    // Choose the useful top first, so lower blocks cannot consume its brand.
    colors[blocks - 1] = pickBrand(ctx, ids, random, helpful, []);
    for (let i = 0; i < blocks - 1; i++) colors[i] = pickBrand(ctx, ids, random, false, colors.filter(id => id != null));
    return colors.flatMap((color, i) => Array(sizes[i]).fill(color));
  }
  function initialProgression() { return { activeCount: 4, presenting: null, warmupCleared: null }; }
  function unlock(progress, cleared, elapsed) {
    if (elapsed < WARMUP_SECONDS) return null;
    if (progress.warmupCleared == null) progress.warmupCleared = cleared;
    if (progress.presenting || progress.activeCount >= BRAND_ORDER.length || cleared < UNLOCK_CLEARS[progress.activeCount]) return null;
    const brand = BRAND_ORDER[progress.activeCount++];
    progress.presenting = { brand, issued: 0, placed: 0 };
    return brand;
  }
  function nextIntro(progress) {
    const intro = progress.presenting;
    if (!intro || intro.issued >= 3) return null;
    intro.issued++;
    return intro.brand;
  }
  function placedIntro(progress, brand) {
    if (brand == null || !progress.presenting || brand !== progress.presenting.brand) return;
    progress.presenting.placed++;
    if (progress.presenting.placed >= 3) progress.presenting = null;
  }
  return { BRAND_ORDER, UNLOCK_CLEARS, WARMUP_SECONDS, activeBrands, seededRandom,
    difficulty, usefulWeights, makeNextStack, initialProgression, unlock, nextIntro, placedIntro };
});
