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
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const state = {
    board: Array.from({length:R.CELLS},()=>[]), tray:[[],[],[]], selected:null, busy:false,
    score:0, best:Number(localStorage.getItem('cap-stack-sort-v2-best')||0), combo:0, cleared:0,
    activeCount:4, startedAt:0, timerId:0, sound:true, drag:null
  };
  const els = {
    grid:$('#grid'),tray:$('#tray'),score:$('#score'),best:$('#best'),combo:$('#combo'),time:$('#time'),
    banner:$('#banner'),bannerTitle:$('#banner-title'),bannerText:$('#banner-text'),settings:$('#settings'),
    overlay:$('#overlay'),modalTitle:$('#modal-title'),modalBody:$('#modal-body'),replay:$('#replay'),
    closeModal:$('#close-modal'),soundToggle:$('#sound-toggle'),scoreCard:$('#score-card')
  };

  const formatTime=sec=>`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
  const elapsed=()=>state.startedAt?Math.floor((Date.now()-state.startedAt)/1000):0;
  function startTimer(){if(state.startedAt)return;state.startedAt=Date.now();state.timerId=setInterval(()=>els.time.textContent=formatTime(elapsed()),500)}
  function stopTimer(){if(state.timerId)clearInterval(state.timerId);state.timerId=0}
  function audioCtx(){if(!state.sound)return null;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{const ctx=audioCtx.ctx||(audioCtx.ctx=new AC());if(ctx.state==='suspended')ctx.resume();return ctx}catch{return null}}
  function tone(freq,dur=.06,gain=.025,type='triangle',delay=0,endFreq=freq){const ctx=audioCtx();if(!ctx)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(40,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(40,endFreq),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+dur+.015)}
  function noise(dur=.05,gain=.012,delay=0,highpass=900){const ctx=audioCtx();if(!ctx)return;const length=Math.max(1,Math.floor(ctx.sampleRate*dur)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;filter.type='highpass';filter.frequency.value=highpass;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.buffer=buffer;src.connect(filter);filter.connect(g);g.connect(ctx.destination);src.start(t)}
  function sfx(name,pitch=0){if(!state.sound)return;const r=()=>Math.random()*18-9;switch(name){
    case'ui':tone(520,.045,.018,'sine',0,610);break;
    case'select':tone(360+r(),.055,.022,'triangle',0,510);noise(.025,.006,0,1500);break;
    case'pickup':tone(260,.07,.02,'triangle',0,390);noise(.045,.007,0,1200);break;
    case'land':tone(185,.075,.035,'triangle',0,125);tone(620+r(),.035,.014,'sine',.008,470);noise(.045,.012,0,850);break;
    case'bad':tone(155,.09,.025,'square',0,118);tone(132,.08,.018,'square',.095,105);break;
    case'hop':tone(390+pitch*8+r(),.07,.018,'sine',0,565+pitch*9);noise(.025,.005,0,1700);break;
    case'merge':tone(520+pitch*9+r(),.055,.026,'triangle',0,430+pitch*8);tone(1050+pitch*12,.025,.008,'sine',0,820);break;
    case'near8':tone(610,.16,.016,'sine',0,760);tone(915,.14,.01,'sine',.045,1050);break;
    case'near9':tone(660,.18,.02,'sine',0,880);tone(990,.18,.014,'sine',.05,1240);tone(1320,.12,.008,'sine',.105,1480);break;
    case'clear':tone(180,.24,.03,'sawtooth',0,520);tone(720,.18,.014,'sine',.08,980);noise(.12,.012,.04,1100);break;
    case'fly':noise(.075,.008,0,1300);tone(470+pitch*5,.09,.01,'sine',0,720+pitch*6);break;
    case'score':tone(820+pitch*7,.05,.023,'triangle',0,650+pitch*6);tone(1240+pitch*9,.035,.009,'sine',.012,980);break;
    case'chain':tone(520,.12,.022,'sine',0,720);tone(780,.13,.018,'sine',.07,1040);tone(1080,.15,.014,'sine',.14,1360);break;
    case'unlock':[523,659,784,1047].forEach((f,i)=>tone(f,.22,.022,'sine',i*.085,f*1.03));noise(.18,.007,.19,2200);break;
    case'gameover':[392,330,262,196].forEach((f,i)=>tone(f,.28,.022,'triangle',i*.13,f*.88));break;
    case'reset':tone(330,.09,.02,'triangle',0,520);tone(660,.11,.016,'sine',.07,820);break;
  }}
  function maybeBeep(freq=420,dur=.03,gain=.018){tone(freq,dur,gain,'triangle')}
  function playNearState(idx){const n=R.topRun(state.board[idx]);if(n===8)sfx('near8');else if(n===9)sfx('near9')}

  function spritePosition(brand){const col=brand%5,row=Math.floor(brand/5);return `${col*25}% ${row*(100/3)}%`}
  function makeCap(brand,cls=''){const e=document.createElement('div');e.className=`cap ${cls}`.trim();e.dataset.brand=brand;e.style.backgroundPosition=spritePosition(brand);return e}
  function stackEl(stack,compact=false){const wrap=document.createElement('div');wrap.className='stack';const step=compact?4:5;stack.forEach((brand,i)=>{const cap=makeCap(brand);cap.style.bottom=`${i*step}px`;cap.style.setProperty('--dx',`${((i%3)-1)*1.0}px`);cap.style.transform=`translateX(${((i%3)-1)*1.0}px)`;cap.style.zIndex=String(i+1);wrap.appendChild(cap)});return wrap}
  function cellClass(stack){const n=R.topRun(stack);if(n>=10)return' charged';if(n===9)return' pulse9';if(n===8)return' pulse8';return''}
  function renderBoard(){const cells=$$('.cell');state.board.forEach((s,i)=>{const c=cells[i];c.className=`cell${s.length?'':' empty'}${cellClass(s)}`;c.replaceChildren();if(s.length)c.appendChild(stackEl(s))})}
  function renderTray(){const slots=$$('.tray-slot');state.tray.forEach((s,i)=>{const slot=slots[i];slot.classList.toggle('selected',state.selected===i);slot.replaceChildren();if(s.length)slot.appendChild(stackEl(s,true))})}
  function renderHud(){els.score.textContent=state.score.toLocaleString();els.best.textContent=state.best.toLocaleString();els.combo.textContent=state.combo>1?`x${state.combo}`:'—';els.time.textContent=formatTime(elapsed())}
  function buildGrid(){els.grid.replaceChildren();for(let i=0;i<R.CELLS;i++){const c=document.createElement('button');c.type='button';c.className='cell empty';c.dataset.i=i;c.setAttribute('aria-label',`Board cell ${i+1}`);c.addEventListener('click',()=>{if(state.selected!=null)placeFromTray(state.selected,i)});els.grid.appendChild(c)}}
  function buildTray(){els.tray.replaceChildren();for(let i=0;i<3;i++){const s=document.createElement('button');s.type='button';s.className='tray-slot';s.dataset.slot=i;s.setAttribute('aria-label',`Next stack ${i+1}`);s.addEventListener('click',()=>{if(state.busy||!state.tray[i].length)return;state.selected=state.selected===i?null:i;sfx('select');renderTray()});s.addEventListener('pointerdown',ev=>beginDrag(ev,i));els.tray.appendChild(s)}}

  function pickBrand(){const candidates=Array.from({length:state.activeCount},(_,i)=>i),helpful=[];state.board.forEach(s=>{const b=R.top(s),n=R.topRun(s);if(b!=null&&b<state.activeCount&&n>=3&&n<=9)helpful.push(b)});if(helpful.length&&Math.random()<.62)return helpful[Math.floor(Math.random()*helpful.length)];return candidates[Math.floor(Math.random()*candidates.length)]}
  function makeNextStack(){const easy=elapsed()<180,layers=Math.random()<(easy?.12:.26)?2:1,out=[];let prev=-1;for(let l=0;l<layers;l++){let b=pickBrand();if(b===prev&&state.activeCount>1)b=(b+1+Math.floor(Math.random()*(state.activeCount-1)))%state.activeCount;prev=b;const count=easy?4+Math.floor(Math.random()*3):2+Math.floor(Math.random()*4);for(let k=0;k<count;k++)out.push(b)}return out}
  function refillTrayIfNeeded(){if(state.tray.every(s=>s.length===0))state.tray=[makeNextStack(),makeNextStack(),makeNextStack()];renderTray()}

  async function placeFromTray(slot,idx){if(state.busy||!state.tray[slot].length)return;if(state.board[idx].length){pulseBad(idx);return}startTimer();state.busy=true;state.combo=0;state.selected=null;state.board[idx]=state.tray[slot].slice();state.tray[slot]=[];renderBoard();renderTray();sfx('land');playNearState(idx);await sleep(120);await resolveAll(idx);refillTrayIfNeeded();renderHud();if(R.gameOver(state.board))showGameOver();state.busy=false}
  function pulseBad(idx){sfx('bad');const c=$(`.cell[data-i="${idx}"]`);c?.classList.add('bad');setTimeout(()=>c?.classList.remove('bad'),350)}
  const rectCenter=el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}};
  function topCapCenter(idx){const cap=$(`.cell[data-i="${idx}"] .cap:last-child`);return cap?rectCenter(cap):rectCenter($(`.cell[data-i="${idx}"]`))}
  function landingCenter(idx){const c=$(`.cell[data-i="${idx}"]`),p=rectCenter(c);const lift=Math.min(42,state.board[idx].length*5);return{x:p.x,y:p.y+18-lift}}
  async function flyCapBetween(brand,from,to,duration=300,scaleEnd=.98){const cap=makeCap(brand,'flying');const size=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cap'))||76;cap.style.left=`${from.x-size/2}px`;cap.style.top=`${from.y-size/2}px`;document.body.appendChild(cap);const dx=to.x-from.x,dy=to.y-from.y;const anim=cap.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx*.52}px,${dy*.52-24}px) scale(1.02)`,opacity:1,offset:.52},{transform:`translate(${dx}px,${dy}px) scale(${scaleEnd})`,opacity:.98}],{duration,easing:'cubic-bezier(.2,.76,.24,1)',fill:'forwards'});await anim.finished.catch(()=>{});cap.remove()}
  async function gatherComponent(comp,target){const brand=R.top(state.board[target]);for(const src of comp){if(src===target)continue;const n=R.topRun(state.board[src]),flights=[];for(let k=0;k<n;k++){const from=topCapCenter(src),to=landingCenter(target);state.board[src].pop();renderBoard();sfx('hop',k);flights.push(flyCapBetween(brand,from,to,300,1).then(()=>{state.board[target].push(brand);renderBoard();sfx('merge',k)}));if(k<n-1)await sleep(108)}await Promise.all(flights);playNearState(target);await sleep(80)}await sleep(100)}

  function pulseScore(){els.scoreCard.classList.remove('score-hit');void els.scoreCard.offsetWidth;els.scoreCard.classList.add('score-hit');setTimeout(()=>els.scoreCard.classList.remove('score-hit'),180)}
  async function clearTopRun(idx){const count=R.topRun(state.board[idx]);if(count<R.CLEAR_AT)return 0;const brand=R.top(state.board[idx]);state.combo+=1;sfx(state.combo>1?'chain':'clear');const flights=[];for(let k=0;k<count;k++){const from=topCapCenter(idx),target=rectCenter(els.scoreCard);state.board[idx].pop();renderBoard();sfx('fly',k);const cap=makeCap(brand,'v07-fly');const size=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cap'))||76;cap.style.left=`${from.x-size/2}px`;cap.style.top=`${from.y-size/2}px`;document.body.appendChild(cap);const dx=target.x-from.x,dy=target.y-from.y,dist=Math.hypot(dx,dy),dur=Math.max(560,Math.min(820,dist/.52)),rot=(k%2?1:-1)*7;const anim=cap.animate([{transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1},{transform:`translate(${dx*.58}px,${dy*.58}px) scale(.62) rotate(${rot*.55}deg)`,opacity:1,offset:.58},{transform:`translate(${dx}px,${dy}px) scale(.22) rotate(${rot}deg)`,opacity:.05}],{duration:dur,easing:'cubic-bezier(.20,.76,.20,1)',fill:'forwards'});flights.push(anim.finished.catch(()=>{}).then(()=>{cap.remove();state.score+=SCORE_PER_CAP;state.cleared+=1;if(state.score>state.best){state.best=state.score;localStorage.setItem('cap-stack-sort-v2-best',String(state.best))}renderHud();pulseScore();sfx('score',k)}));if(k<count-1)await sleep(108)}await Promise.all(flights);await sleep(90);return count}

  function findResolvable(preferred){if(preferred!=null&&R.top(state.board[preferred])!=null&&(R.component(state.board,preferred).length>1||R.topRun(state.board[preferred])>=R.CLEAR_AT))return preferred;for(let i=0;i<R.CELLS;i++)if(R.top(state.board[i])!=null&&(R.component(state.board,i).length>1||R.topRun(state.board[i])>=R.CLEAR_AT))return i;return-1}
  async function resolveAll(preferred){let anchor=preferred,guard=0;while(guard++<120){anchor=findResolvable(anchor);if(anchor<0)break;const comp=R.component(state.board,anchor);if(comp.length>1)await gatherComponent(comp,anchor);if(R.topRun(state.board[anchor])>=R.CLEAR_AT)await clearTopRun(anchor);else state.combo=0;anchor=null}maybeUnlock()}
  function maybeUnlock(){while(state.activeCount<BRANDS.length&&state.cleared>=UNLOCK_THRESHOLDS[state.activeCount]){const b=state.activeCount++;sfx('unlock');showBanner('NEW CAP UNLOCKED',BRANDS[b])}}
  function showBanner(title,text){els.bannerTitle.textContent=title;els.bannerText.textContent=text;els.banner.classList.add('show');clearTimeout(showBanner.t);showBanner.t=setTimeout(()=>els.banner.classList.remove('show'),1800)}

  function beginDrag(ev,slot){if(state.busy||!state.tray[slot].length||ev.button>0)return;sfx('pickup');const ghost=document.createElement('div');ghost.className='ghost';ghost.appendChild(stackEl(state.tray[slot],true));document.body.appendChild(ghost);state.drag={slot,ghost,moved:false};moveGhost(ev.clientX,ev.clientY);const onMove=e=>{if(!state.drag)return;state.drag.moved=true;moveGhost(e.clientX,e.clientY);highlightTarget(e.clientX,e.clientY)};const onUp=e=>{window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);finishDrag(e.clientX,e.clientY)};window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp,{once:true})}
  function moveGhost(x,y){if(state.drag){state.drag.ghost.style.left=`${x}px`;state.drag.ghost.style.top=`${y}px`}}
  function cellAt(x,y){const el=document.elementFromPoint(x,y),cell=el?.closest?.('.cell');return cell?Number(cell.dataset.i):-1}
  function highlightTarget(x,y){$$('.cell').forEach(c=>c.classList.remove('target'));const i=cellAt(x,y);if(i>=0&&!state.board[i].length)$(`.cell[data-i="${i}"]`)?.classList.add('target')}
  function finishDrag(x,y){if(!state.drag)return;const{slot,ghost,moved}=state.drag;ghost.remove();state.drag=null;$$('.cell').forEach(c=>c.classList.remove('target'));const i=cellAt(x,y);if(moved&&i>=0)placeFromTray(slot,i);else if(moved)sfx('bad')}

  function showGameOver(){stopTimer();sfx('gameover');els.modalTitle.textContent='Game Over';els.modalBody.innerHTML=`<div class="result"><span>FINAL SCORE</span><b>${state.score.toLocaleString()}</b><small>${formatTime(elapsed())}</small></div><p>The board is full after all reactions have finished.</p>`;els.overlay.hidden=false}
  function openSettings(){sfx('ui');els.modalTitle.textContent='Settings';els.modalBody.innerHTML='<p>Canonical V2 playtest. Drag or tap a NEXT STACK onto an empty cell. Matching exposed caps merge one by one; 10 or more clear into SCORE.</p>';els.soundToggle.textContent=`Sound: ${state.sound?'On':'Off'}`;els.overlay.hidden=false}
  function closeOverlay(){els.overlay.hidden=true}
  function resetGame(){sfx('reset');stopTimer();state.board=Array.from({length:R.CELLS},()=>[]);state.tray=[[],[],[]];state.selected=null;state.busy=false;state.score=0;state.combo=0;state.cleared=0;state.activeCount=4;state.startedAt=0;refillTrayIfNeeded();renderBoard();renderHud();closeOverlay()}
  function init(){buildGrid();buildTray();els.best.textContent=state.best.toLocaleString();refillTrayIfNeeded();renderBoard();renderHud();els.settings.addEventListener('click',openSettings);els.closeModal.addEventListener('click',closeOverlay);els.replay.addEventListener('click',resetGame);els.soundToggle.addEventListener('click',()=>{state.sound=!state.sound;els.soundToggle.textContent=`Sound: ${state.sound?'On':'Off'}`;if(state.sound)sfx('ui')});document.addEventListener('keydown',e=>{const n=Number(e.key);if(n>=1&&n<=3){state.selected=n-1;sfx('select');renderTray()}if(e.key==='Escape')closeOverlay()})}
  init();
})();
