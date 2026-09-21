(() => {
  'use strict';
  const R = window.CapRules;
  if (!R) throw new Error('CapRules missing');

  const BRANDS = [
    'COLA','PEPZI','FUNTI','SPRYT','Dr. Popper','SWEPS','RED BULL','Monstr',
    'PRYME','Poppy','San Aqua','Mountain Brew','NESTI','Liquid Dead','EVIEN','Grape Crushr'
  ];
  const UNLOCK_THRESHOLDS = [0,0,0,0,60,140,240,360,500,680,900,1180,1500,1860,2280,2760];
  const SCORE_PER_CAP = 10;
  const CAP_COLORS = ['#e7524b','#3b83d5','#f0b33a','#59a46f','#8651a8','#42a9b6','#ef7e3b','#d05279'];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];

  const state = {
    board: Array.from({ length: R.CELLS }, () => []),
    tray: [[],[],[]], selected: null, busy: false,
    score: 0, best: Number(localStorage.getItem('cap-stack-sort-v2-best') || 0),
    combo: 0, cleared: 0, activeCount: 4,
    startedAt: 0, timerId: 0, sound: true, drag: null
  };

  const els = {
    grid: $('#grid'), tray: $('#tray'), score: $('#score'), best: $('#best'), combo: $('#combo'), time: $('#time'),
    banner: $('#banner'), bannerTitle: $('#banner-title'), bannerText: $('#banner-text'),
    settings: $('#settings'), overlay: $('#overlay'), modalTitle: $('#modal-title'), modalBody: $('#modal-body'),
    replay: $('#replay'), closeModal: $('#close-modal'), soundToggle: $('#sound-toggle')
  };

  function formatTime(sec) { const m = Math.floor(sec/60), s = sec%60; return `${m}:${String(s).padStart(2,'0')}`; }
  function elapsed() { return state.startedAt ? Math.floor((Date.now() - state.startedAt)/1000) : 0; }
  function startTimer() {
    if (state.startedAt) return;
    state.startedAt = Date.now();
    state.timerId = setInterval(() => els.time.textContent = formatTime(elapsed()), 500);
  }
  function stopTimer() { if (state.timerId) clearInterval(state.timerId); state.timerId = 0; }

  function maybeBeep(freq=420, dur=.035, gain=.025) {
    if (!state.sound || !window.AudioContext) return;
    try {
      const ctx = maybeBeep.ctx || (maybeBeep.ctx = new AudioContext());
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq; o.type = 'triangle'; g.gain.value = gain;
      o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
    } catch (_) {}
  }

  function makeCap(brand, cls='') {
    const e = document.createElement('div');
    e.className = `cap ${cls}`.trim(); e.dataset.brand = brand;
    e.dataset.label = String(BRANDS[brand] || 'CAP').replace('Liquid Dead','DEAD').slice(0,9);
    e.style.setProperty('--cap-color', CAP_COLORS[brand % CAP_COLORS.length]);
    return e;
  }
  function stackEl(stack, compact=false) {
    const wrap = document.createElement('div'); wrap.className = 'stack';
    const step = compact ? 4 : 5;
    stack.forEach((brand, i) => {
      const cap = makeCap(brand); cap.style.bottom = `${i*step}px`; cap.style.left = `${(i%3-1)*.7}px`; cap.style.zIndex = String(i+1); wrap.appendChild(cap);
    });
    return wrap;
  }

  function cellClass(stack) {
    const n = R.topRun(stack);
    if (n >= 10) return ' charged'; if (n === 9) return ' pulse9'; if (n === 8) return ' pulse8'; return '';
  }
  function renderBoard() {
    $$('.cell').forEach((cell, i) => {
      cell.className = `cell${state.board[i].length ? '' : ' empty'}${cellClass(state.board[i])}`;
      cell.replaceChildren();
      if (state.board[i].length) cell.appendChild(stackEl(state.board[i]));
    });
  }
  function renderTray() {
    $$('.tray-slot').forEach((slot, i) => {
      slot.classList.toggle('selected', state.selected === i);
      slot.replaceChildren();
      if (state.tray[i].length) slot.appendChild(stackEl(state.tray[i], true));
    });
  }
  function renderHud() {
    els.score.textContent = state.score; els.best.textContent = state.best;
    els.combo.textContent = state.combo > 1 ? `x${state.combo}` : '—';
    els.time.textContent = formatTime(elapsed());
  }

  function buildGrid() {
    els.grid.replaceChildren();
    for (let i=0;i<R.CELLS;i++) {
      const c = document.createElement('button'); c.className='cell empty'; c.dataset.i=i; c.type='button'; c.setAttribute('aria-label',`Board cell ${i+1}`);
      c.addEventListener('click', () => { if (state.selected != null) placeFromTray(state.selected, i); });
      els.grid.appendChild(c);
    }
  }
  function buildTray() {
    els.tray.replaceChildren();
    for (let i=0;i<3;i++) {
      const s=document.createElement('button'); s.className='tray-slot'; s.type='button'; s.dataset.slot=i; s.setAttribute('aria-label',`Next stack ${i+1}`);
      s.addEventListener('click', () => { if (state.busy || !state.tray[i].length) return; state.selected = state.selected===i ? null : i; renderTray(); });
      s.addEventListener('pointerdown', ev => beginDrag(ev, i));
      els.tray.appendChild(s);
    }
  }

  function pickBrand() {
    const candidates=[];
    for (let i=0;i<state.activeCount;i++) candidates.push(i);
    const helpful=[];
    state.board.forEach(s => { const b=R.top(s), n=R.topRun(s); if (b!=null && b<state.activeCount && n>=3 && n<=9) helpful.push(b); });
    if (helpful.length && Math.random() < .58) return helpful[Math.floor(Math.random()*helpful.length)];
    return candidates[Math.floor(Math.random()*candidates.length)];
  }
  function makeNextStack() {
    const easy = elapsed() < 180;
    const layers = Math.random() < (easy ? .14 : .28) ? 2 : 1;
    const out=[]; let prev=-1;
    for (let l=0;l<layers;l++) {
      let b=pickBrand(); if (b===prev && state.activeCount>1) b=(b+1+Math.floor(Math.random()*(state.activeCount-1)))%state.activeCount;
      prev=b;
      const count = easy ? 3+Math.floor(Math.random()*3) : 2+Math.floor(Math.random()*3);
      for (let k=0;k<count;k++) out.push(b);
    }
    return out;
  }
  function refillTrayIfNeeded() {
    if (state.tray.every(s=>s.length===0)) state.tray = [makeNextStack(), makeNextStack(), makeNextStack()];
    renderTray();
  }

  async function placeFromTray(slot, idx) {
    if (state.busy || !state.tray[slot].length) return;
    if (state.board[idx].length) { pulseBad(idx); return; }
    startTimer(); state.busy=true; state.combo=0; state.selected=null;
    state.board[idx] = state.tray[slot].slice(); state.tray[slot]=[];
    renderBoard(); renderTray(); maybeBeep(330,.04,.02);
    await sleep(120);
    await resolveAll(idx);
    refillTrayIfNeeded(); renderHud();
    if (R.gameOver(state.board)) showGameOver();
    state.busy=false;
  }
  function pulseBad(idx) { const c=$(`.cell[data-i="${idx}"]`); c?.classList.add('bad'); setTimeout(()=>c?.classList.remove('bad'),350); }

  function rectCenter(el) { const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }
  async function flyCapBetween(brand, from, to, duration=230, scaleEnd=.92) {
    const cap=makeCap(brand,'flying'); cap.style.left=`${from.x-31}px`; cap.style.top=`${from.y-31}px`; document.body.appendChild(cap);
    const dx=to.x-from.x, dy=to.y-from.y;
    const anim=cap.animate([
      { transform:'translate(0,0) scale(1)', opacity:1 },
      { transform:`translate(${dx*.52}px,${dy*.52-20}px) scale(.98)`, opacity:1, offset:.52 },
      { transform:`translate(${dx}px,${dy}px) scale(${scaleEnd})`, opacity:.96 }
    ],{duration,easing:'cubic-bezier(.2,.75,.25,1)',fill:'forwards'});
    anim.finished.catch(()=>{}).finally(()=>cap.remove());
    return anim.finished.catch(()=>{});
  }

  async function gatherComponent(comp, target) {
    const brand=R.top(state.board[target]);
    for (const src of comp) {
      if (src===target) continue;
      const n=R.topRun(state.board[src]);
      for (let k=0;k<n;k++) {
        const srcCell=$(`.cell[data-i="${src}"]`), dstCell=$(`.cell[data-i="${target}"]`);
        const from=rectCenter(srcCell), to=rectCenter(dstCell);
        state.board[src].pop(); renderBoard();
        flyCapBetween(brand,from,to,230,.96).then(()=>{ state.board[target].push(brand); renderBoard(); maybeBeep(460,.025,.018); });
        await sleep(100);
      }
      await sleep(150);
    }
    await sleep(180);
  }

  async function clearTopRun(idx) {
    const count=R.topRun(state.board[idx]); if (count<R.CLEAR_AT) return 0;
    const brand=R.top(state.board[idx]); const scoreTarget=rectCenter($('#score-card'));
    state.combo += 1;
    for (let k=0;k<count;k++) {
      const cell=$(`.cell[data-i="${idx}"]`), from=rectCenter(cell);
      state.board[idx].pop(); renderBoard();
      const cap=makeCap(brand,'v07-fly'); cap.style.left=`${from.x-31}px`; cap.style.top=`${from.y-31}px`; document.body.appendChild(cap);
      const dx=scoreTarget.x-from.x, dy=scoreTarget.y-from.y;
      const anim=cap.animate([
        {transform:'translate(0,0) scale(1)',opacity:1},
        {transform:`translate(${dx*.58}px,${dy*.58}px) scale(.64)`,opacity:.96,offset:.58},
        {transform:`translate(${dx}px,${dy}px) scale(.2)`,opacity:.28}
      ],{duration:420,easing:'cubic-bezier(.22,.72,.18,1)',fill:'forwards'});
      anim.finished.catch(()=>{}).then(()=>{
        cap.remove(); state.score += SCORE_PER_CAP; state.cleared += 1;
        if (state.score>state.best) { state.best=state.score; localStorage.setItem('cap-stack-sort-v2-best',String(state.best)); }
        renderHud(); $('#score-card')?.classList.add('score-hit'); setTimeout(()=>$('#score-card')?.classList.remove('score-hit'),170); maybeBeep(650,.025,.015);
      });
      await sleep(95);
    }
    await sleep(430);
    maybeUnlock();
    return count;
  }

  function findResolvable(preferred) {
    if (preferred!=null && R.top(state.board[preferred])!=null) {
      if (R.component(state.board,preferred).length>1 || R.topRun(state.board[preferred])>=R.CLEAR_AT) return preferred;
    }
    for (let i=0;i<R.CELLS;i++) if (R.top(state.board[i])!=null && (R.component(state.board,i).length>1 || R.topRun(state.board[i])>=R.CLEAR_AT)) return i;
    return -1;
  }
  async function resolveAll(preferred) {
    let anchor=preferred, guard=0;
    while (guard++<120) {
      anchor=findResolvable(anchor); if (anchor<0) break;
      const comp=R.component(state.board,anchor);
      if (comp.length>1) await gatherComponent(comp,anchor);
      if (R.topRun(state.board[anchor])>=R.CLEAR_AT) await clearTopRun(anchor);
      else state.combo=0;
      anchor=null;
    }
  }

  function maybeUnlock() {
    while (state.activeCount < BRANDS.length && state.cleared >= UNLOCK_THRESHOLDS[state.activeCount]) {
      const b=state.activeCount++; showBanner('NEW CAP UNLOCKED',BRANDS[b]);
    }
  }
  function showBanner(title,text) {
    els.bannerTitle.textContent=title; els.bannerText.textContent=text; els.banner.classList.add('show');
    clearTimeout(showBanner.t); showBanner.t=setTimeout(()=>els.banner.classList.remove('show'),1800);
  }

  function beginDrag(ev, slot) {
    if (state.busy || !state.tray[slot].length || ev.button>0) return;
    const ghost=document.createElement('div'); ghost.className='ghost'; ghost.appendChild(stackEl(state.tray[slot],true)); document.body.appendChild(ghost);
    state.drag={slot,ghost,pointerId:ev.pointerId,moved:false,x:ev.clientX,y:ev.clientY}; moveGhost(ev.clientX,ev.clientY);
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch(_) {}
    const onMove=e=>{ if(!state.drag)return; state.drag.moved=true; state.drag.x=e.clientX; state.drag.y=e.clientY; moveGhost(e.clientX,e.clientY); highlightTarget(e.clientX,e.clientY); };
    const onUp=e=>{ window.removeEventListener('pointermove',onMove); window.removeEventListener('pointerup',onUp); finishDrag(e.clientX,e.clientY); };
    window.addEventListener('pointermove',onMove); window.addEventListener('pointerup',onUp,{once:true});
  }
  function moveGhost(x,y) { if(state.drag){ state.drag.ghost.style.left=`${x}px`; state.drag.ghost.style.top=`${y}px`; } }
  function cellAt(x,y) { const el=document.elementFromPoint(x,y); const cell=el?.closest?.('.cell'); return cell?Number(cell.dataset.i):-1; }
  function highlightTarget(x,y){ $$('.cell').forEach(c=>c.classList.remove('target')); const i=cellAt(x,y); if(i>=0&&!state.board[i].length) $(`.cell[data-i="${i}"]`)?.classList.add('target'); }
  function finishDrag(x,y) {
    if(!state.drag)return; const {slot,ghost,moved}=state.drag; ghost.remove(); state.drag=null; $$('.cell').forEach(c=>c.classList.remove('target'));
    const i=cellAt(x,y); if(moved && i>=0) placeFromTray(slot,i);
  }

  function showGameOver() {
    stopTimer(); els.modalTitle.textContent='Game Over';
    els.modalBody.innerHTML=`<div class="result"><span>FINAL SCORE</span><b>${state.score}</b><small>${formatTime(elapsed())}</small></div><p>The board is full after all reactions finished.</p>`;
    els.overlay.hidden=false;
  }
  function openSettings() {
    els.modalTitle.textContent='Settings';
    els.modalBody.innerHTML='<p>Current playtest settings.</p>';
    els.soundToggle.textContent=`Sound: ${state.sound?'On':'Off'}`; els.overlay.hidden=false;
  }
  function closeOverlay(){ els.overlay.hidden=true; }
  function resetGame() {
    stopTimer(); state.board=Array.from({length:R.CELLS},()=>[]); state.tray=[[],[],[]]; state.selected=null; state.busy=false; state.score=0; state.combo=0; state.cleared=0; state.activeCount=4; state.startedAt=0;
    refillTrayIfNeeded(); renderBoard(); renderHud(); closeOverlay();
  }

  function init() {
    buildGrid(); buildTray(); els.best.textContent=state.best; refillTrayIfNeeded(); renderBoard(); renderHud();
    els.settings.addEventListener('click',openSettings); els.closeModal.addEventListener('click',closeOverlay);
    els.replay.addEventListener('click',resetGame); els.soundToggle.addEventListener('click',()=>{state.sound=!state.sound; els.soundToggle.textContent=`Sound: ${state.sound?'On':'Off'}`;});
    document.addEventListener('keydown',e=>{ const n=Number(e.key); if(n>=1&&n<=3){state.selected=n-1;renderTray();} if(e.key==='Escape') closeOverlay(); });
  }
  init();
})();
