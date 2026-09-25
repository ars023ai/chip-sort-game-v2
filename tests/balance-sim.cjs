const R=require('../rules.js');
const B=require('../balance.js');

function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)|0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
const clone=b=>b.map(s=>s.slice());
function potential(board){let v=0;for(let i=0;i<R.CELLS;i++){if(!board[i].length)continue;const run=R.topRun(board[i]);v+=Math.min(run,9)*2;for(const n of R.neighbors(i))if(n>i&&R.top(board[n])===R.top(board[i]))v+=8}return v}
function choose(board,stack,random,skill){const empty=[];for(let i=0;i<R.CELLS;i++)if(!board[i].length)empty.push(i);if(!empty.length)return null;const ranked=empty.map(i=>{const b=clone(board);b[i]=stack.slice();const cleared=R.resolveInstant(b,i);const occupied=b.filter(s=>s.length).length;const value=cleared*1000+potential(b)-occupied*7+random()*6;return{i,b,cleared,value}}).sort((a,b)=>b.value-a.value);if(skill==='smart')return ranked[0];if(skill==='casual')return ranked[Math.floor(random()*Math.min(3,ranked.length))];return ranked[Math.floor(random()*ranked.length)]}

function run(seed,skill='smart',limit=1600){const random=rng(seed),board=Array.from({length:R.CELLS},()=>[]);let tray=[],moves=0,cleared=0,activeCount=4,introQueue=[];while(moves<limit&&!R.gameOver(board)){
  const elapsed=moves*5.5;
  if(elapsed>=180)while(activeCount<B.BRAND_ORDER.length&&cleared>=B.UNLOCK_CLEARS[activeCount]){const brand=B.BRAND_ORDER[activeCount++];introQueue.push(brand,brand,brand)}
  if(!tray.length)for(let i=0;i<3;i++){const forcedBrand=introQueue.length?introQueue.shift():null;tray.push(B.makeNextStack({board,activeCount,elapsed,cleared,freeCells:board.filter(s=>!s.length).length,forcedBrand},random))}
  let best=null,bestSlot=0;for(let s=0;s<tray.length;s++){const c=choose(board,tray[s],random,skill);if(c&&(!best||c.value>best.value)){best=c;bestSlot=s}}
  if(!best)break;for(let i=0;i<R.CELLS;i++)board[i]=best.b[i];cleared+=best.cleared;tray.splice(bestSlot,1);moves++;
  if(R.gameOver(board))break;
  }
  return{moves,score:cleared*10,cleared,activeCount,free:board.filter(s=>!s.length).length,gameOver:R.gameOver(board)}
}
function percentile(a,p){const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor((s.length-1)*p))]}
for(const skill of ['random','casual','smart']){const rows=Array.from({length:300},(_,i)=>run(1000+i*97,skill));const scores=rows.map(r=>r.score),moves=rows.map(r=>r.moves);console.log(JSON.stringify({skill,runs:rows.length,gameOver:rows.filter(r=>r.gameOver).length,scoreP25:percentile(scores,.25),scoreMedian:percentile(scores,.5),scoreP75:percentile(scores,.75),movesMedian:percentile(moves,.5),maxScore:Math.max(...scores)}))}
