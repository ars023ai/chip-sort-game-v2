const R=require('../rules.js');
const B=require('../balance.js');

const rng = B.seededRandom;
const clone=b=>b.map(s=>s.slice());
function potential(board){let v=0;for(let i=0;i<R.CELLS;i++){if(!board[i].length)continue;const run=R.topRun(board[i]);v+=Math.min(run,9)*2;for(const n of R.neighbors(i))if(n>i&&R.top(board[n])===R.top(board[i]))v+=8}return v}
function choose(board,stack,random,skill){const empty=[];for(let i=0;i<R.CELLS;i++)if(!board[i].length)empty.push(i);if(!empty.length)return null;const ranked=empty.map(i=>{const b=clone(board);b[i]=stack.slice();const cleared=R.resolveInstant(b,i);const occupied=b.filter(s=>s.length).length;const value=cleared*1000+potential(b)-occupied*7+random()*6;return{i,b,cleared,value}}).sort((a,b)=>b.value-a.value);if(skill==='smart')return ranked[0];if(skill==='casual')return ranked[Math.floor(random()*Math.min(3,ranked.length))];return ranked[Math.floor(random()*ranked.length)]}

function run(seed,skill='smart',limit=1600){const random=rng(seed),board=Array.from({length:R.CELLS},()=>[]);let tray=[],moves=0,cleared=0; const progress=B.initialProgression();while(moves<limit&&!R.gameOver(board)){
  const elapsed=moves*5.5;
  B.unlock(progress,cleared,elapsed);
  if(!tray.length)for(let i=0;i<3;i++){const forcedBrand=B.nextIntro(progress);tray.push({stack:B.makeNextStack({board,...progress,elapsed,cleared,freeCells:board.filter(s=>!s.length).length,forcedBrand,excludedBrand:progress.presenting?.brand},random),intro:forcedBrand})}
  let best=null,bestSlot=0;for(let s=0;s<tray.length;s++){const c=choose(board,tray[s].stack,random,skill);if(c&&(!best||c.value>best.value)){best=c;bestSlot=s}}
  if(!best)break;for(let i=0;i<R.CELLS;i++)board[i]=best.b[i];cleared+=best.cleared;B.placedIntro(progress,tray[bestSlot].intro);tray.splice(bestSlot,1);moves++;
  if(R.gameOver(board))break;
  }
  return{moves,score:cleared*10,cleared,activeCount:progress.activeCount,free:board.filter(s=>!s.length).length,gameOver:R.gameOver(board)}
}
function percentile(a,p){const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor((s.length-1)*p))]}
for(const skill of ['random','casual','smart']){const rows=Array.from({length:Number(process.env.SIM_RUNS)||300},(_,i)=>run(1000+i*97,skill));const scores=rows.map(r=>r.score),moves=rows.map(r=>r.moves);console.log(JSON.stringify({skill,runs:rows.length,gameOver:rows.filter(r=>r.gameOver).length,allBrands:rows.filter(r=>r.activeCount===16).length,scoreP25:percentile(scores,.25),scoreMedian:percentile(scores,.5),scoreP75:percentile(scores,.75),movesMedian:percentile(moves,.5),maxScore:Math.max(...scores)}))}
