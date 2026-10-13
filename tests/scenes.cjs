const assert = require('node:assert/strict');
const S = require('../scenes.js'), R = require('../rules.js');
for (const [kind, depth, count] of [['spark',3,3], ['cascade',5,4], ['finale',6,5]]) {
  for (let seed = 0; seed < 100; seed++) {
    const scene = S.validate(S.preset(kind, seed));
    assert.equal(R.planResolution(scene.board, null).cleared, 0, 'the scene stays dormant');
    const placed = scene.board.map(stack => stack.slice()); placed[scene.move.index] = scene.tray[scene.move.slot].slice();
    const plan = R.planResolution(placed, scene.move.index);
    assert.equal(plan.events.filter(e => e.type === 'clear').length, depth);
    assert.equal(plan.cleared, depth * (count * 4 + 1)); assert(plan.board.every(stack => !stack.length));
    const instant = placed.map(stack => stack.slice()); assert.equal(R.resolveInstant(instant, scene.move.index), plan.cleared); assert.deepEqual(instant, plan.board);
    assert.deepEqual(S.decode(S.encode(scene)), scene);
  }
}
const scene = S.preset('cascade', 123);
assert.throws(() => S.validate({ ...scene, board: [[]] }));
assert.throws(() => S.validate({ ...scene, tray: [[99], [], []] }));
assert.throws(() => S.validate({ ...scene, move: { slot: 9, index: 0 } }));
assert.throws(() => S.validate({ ...scene, score: Infinity }));
assert.throws(() => S.validate({ ...scene, board: Array.from({ length: 30 }, () => Array(101).fill(0)) }));
assert.throws(() => S.decode('!bad-link'));
assert.deepEqual(S.blocks([0,0,1,1,0]), [{brand:0,count:2},{brand:1,count:2},{brand:0,count:1}]);
console.log('PASS: 300 dormant scenes, exact 3/5/6 chains, portable links, invalid scene rejection');
