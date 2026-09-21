const assert=require('node:assert/strict');
const R=require('../rules.js');
const board=()=>Array.from({length:R.CELLS},()=>[]);
for(const n of [9,10,13,15]){
  const b=board(); b[0]=Array(n).fill(1); const cleared=R.resolveInstant(b,0);
  assert.equal(b[0].length,n<10?n:0,`threshold ${n}`);
  assert.equal(cleared,n<10?0:n,`cleared ${n}`);
}
for(const n of [10,13]){
  const b=board(); b[0]=[0,0,0,...Array(n).fill(1)]; const cleared=R.resolveInstant(b,0);
  assert.deepEqual(b[0],[0,0,0]); assert.equal(cleared,n);
}
{
  const b=board(); b[0]=[0,0,0,...Array(10).fill(1)]; b[1]=Array(7).fill(0);
  const cleared=R.resolveInstant(b,0); assert.equal(cleared,20); assert(b.every(s=>!s.length));
}
{
  const b=board(); b[6]=Array(8).fill(1); b[1]=Array(6).fill(1); b[5]=Array(7).fill(1);
  const cleared=R.resolveInstant(b,6); assert.equal(cleared,21); assert.equal(b[6].length,0);
}
{
  const b=Array.from({length:R.CELLS},(_,i)=>[i%6]); assert.equal(R.gameOver(b),true); b[0]=[]; assert.equal(R.gameOver(b),false);
}
console.log('PASS: 5x6, thresholds 9/10/13/15, buried layers, adjacency gather, chains, game over');
