const assert = require('node:assert/strict');
const B = require('../balance.js');
const board = () => Array.from({ length: 30 }, () => []);
assert.equal(new Set(B.BRAND_ORDER).size, 16);
assert.equal(B.BRAND_ORDER.at(-1), 6, 'Red Bull is the sixteenth brand');
assert.deepEqual(B.UNLOCK_CLEARS.slice(6, 14).filter((_, i) => i % 2).map((x, i) => x - B.UNLOCK_CLEARS[6 + i * 2]), [30,30,30,30]);
{
  const p = B.initialProgression();
  assert.equal(B.unlock(p, 5000, 179.99), null); assert.equal(p.activeCount, 4);
  assert.equal(B.unlock(p, 5000, 180), 4); assert.equal(p.warmupCleared, 5000);
  assert.equal(B.unlock(p, 5000, 181), null, 'cannot skip an introduction');
  for (let i = 0; i < 3; i++) assert.equal(B.nextIntro(p), 4);
  assert.equal(B.nextIntro(p), null);
  B.placedIntro(p, null); B.placedIntro(p, 1); assert.equal(p.presenting.placed, 0);
  for (let i = 0; i < 2; i++) B.placedIntro(p, 4);
  assert.equal(B.unlock(p, 5000, 182), null, 'all three must be played');
  B.placedIntro(p, 4); assert.equal(p.presenting, null);
  assert.equal(B.unlock(p, 5000, 183), 5); assert.equal(p.activeCount, 6);
}
const random = B.seededRandom(3123);
for (let i = 0; i < 1000; i++) {
  const stack = B.makeNextStack({ board: board(), activeCount: 4, elapsed: 179, cleared: 2000 }, random);
  assert(stack.length >= 4 && stack.length <= 6); assert.equal(new Set(stack).size, 1); assert(stack[0] < 4);
}
for (let count = 4; count <= 16; count++) for (let i = 0; i < 300; i++) {
  const stack = B.makeNextStack({ board: board(), activeCount: count, elapsed: 3600, cleared: 3000, warmupCleared: 0 }, random);
  assert(stack.length >= 2 && stack.length <= 6); assert(new Set(stack).size <= 3);
  const blocks = stack.filter((brand, j) => j === 0 || brand !== stack[j-1]);
  assert.equal(blocks.length, new Set(blocks).size, 'each brand occupies one contiguous block');
  assert(stack.every(brand => B.activeBrands(count).includes(brand)));
}
{
  const p = B.initialProgression(); let clears = 10000;
  for (let count = 4; count < 16; count++) {
    const brand = B.unlock(p, clears, 1000); assert.equal(brand, B.BRAND_ORDER[count]);
    const emitted = [];
    for (let i = 0; i < 3; i++) {
      const forcedBrand = B.nextIntro(p), stack = B.makeNextStack({ elapsed: 3600, cleared: clears, activeCount: p.activeCount, forcedBrand }, random);
      assert.equal(new Set(stack).size, 1); assert.equal(stack[0], brand); emitted.push(forcedBrand);
    }
    assert.equal(B.nextIntro(p), null); emitted.forEach(id => B.placedIntro(p, id));
  }
  assert.equal(B.unlock(p, clears, 1000), null); assert.equal(p.activeCount, 16);
}
{
  const b = board(); b[0] = Array(9).fill(0);
  const ctx = { board: b, activeCount: 16, elapsed: 1200, cleared: 1000, freeCells: 5 };
  const samples = Array.from({ length: 10000 }, () => B.makeNextStack(ctx, random));
  const useful = samples.filter(stack => stack.at(-1) === 0).length / samples.length;
  assert(useful > .68 && useful < .76, `rescue probability ${useful}`);
  assert.equal(B.difficulty(ctx).helpChance, .7);
  assert(B.difficulty({ ...ctx, freeCells: 6, cleared: 2000 }).helpChance < B.difficulty({ ...ctx, freeCells: 6 }).helpChance);
}
{
  const a = B.seededRandom(999); for (let i = 0; i < 50; i++) a();
  const b = B.seededRandom(999, a.getState()); for (let i = 0; i < 30; i++) assert.equal(a(), b());
}
console.log('PASS: strict warmup, 16 brands, gated introductions, blocks, seeded replay, 70% rescue');
