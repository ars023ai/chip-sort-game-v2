const assert = require('node:assert/strict'), L = require('../layout.js');
for (const [w,h] of [[320,568],[360,640],[375,667],[390,844],[414,896],[768,1024],[1366,768],[1920,1080],[844,390]]) {
  for (const coach of [false,true]) {
    const m = L.measure(w,h,{coach});
    assert(m.stageWidth > 0 && m.stageHeight > 0); assert(m.stageWidth <= w);
    assert(m.stageHeight + m.top + m.bottom <= h + 1);
    const cellHeight = (m.stageHeight * .701 - 5 * m.unit * .82) / 6;
    const capHeight = m.unit * 6.5 * 1.16;
    assert(capHeight <= cellHeight, `caps stay inside cells at ${w}×${h}`);
  }
}
for (const [w,h,top,bottom] of [[390,844,47,34],[393,852,59,34],[360,800,24,16]]) {
 const m=L.measure(w,h,{coach:true,safeTop:top,safeBottom:bottom});
 assert(m.stageHeight+m.top+m.bottom<=h+1); assert(m.top>=top+44); assert(m.bottom>=bottom+60);
}
console.log('PASS: 9 viewport sizes, coaching layout, notch insets and cap containment');
