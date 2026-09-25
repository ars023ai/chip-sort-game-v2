// Pure endless-mode balance shared by the browser build and simulations.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CapBalance = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const BRAND_ORDER = [0,1,2,3,4,5,10,8,15,9,7,11,12,14,13]; // Red Bull (6) stays out of gameplay.
  const UNLOCK_CLEARS = [0,0,0,0,60,140,230,260,350,380,470,500,590,620,710];
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const randomInt = (rng,min,max) => min+Math.floor(rng()*(max-min+1));
  const activeBrands = count => BRAND_ORDER.slice(0,clamp(count,1,BRAND_ORDER.length));

  function difficulty(ctx){
    const free=ctx.freeCells??30,elapsed=ctx.elapsed||0,cleared=ctx.cleared||0,activeCount=ctx.activeCount||4;
    if(elapsed<180)return{progress:0,helpChance:.68,minSize:4,maxSize:6,maxColors:1,mixChance:0,threeChance:0,rescue:false};
    const core=clamp(((cleared-20)/690)*.78+((elapsed-180)/1800)*.22,0,1);
    const late=clamp((cleared-710)/900+(elapsed-1200)/5400,0,.7);
    const progress=clamp(core+late*.38,0,1.25),rescue=free<=5;
    let minSize=4,maxSize=6;
    if(progress>.18){minSize=3;maxSize=5}
    if(progress>.52){minSize=2;maxSize=4}
    if(progress>1.02){minSize=2;maxSize=3}
    const maxColors=activeCount<=6?2:(activeCount<9?2:3);
    return{
      progress, minSize, maxSize, maxColors, rescue,
      helpChance:rescue?.70:clamp(.62-progress*.36,.16,.62),
      mixChance:clamp(.08+progress*.52,.08,.68),
      threeChance:maxColors<3?0:clamp((progress-.43)*.58,0,.42)
    };
  }

  function usefulWeights(board,ids){
    const weights=new Map(ids.map(id=>[id,0]));
    for(const stack of board||[]){
      if(!stack?.length)continue;
      const top=stack[stack.length-1];
      if(!weights.has(top))continue;
      let run=0;for(let i=stack.length-1;i>=0&&stack[i]===top;i--)run++;
      weights.set(top,weights.get(top)+1+run*run+(run>=8?28:run>=6?13:0));
    }
    return weights;
  }
  function weightedPick(entries,rng){const total=entries.reduce((s,e)=>s+Math.max(0,e[1]),0);if(!total)return entries[Math.floor(rng()*entries.length)][0];let roll=rng()*total;for(const [v,w]of entries){roll-=Math.max(0,w);if(roll<=0)return v}return entries[entries.length-1][0]}
  function pickBrand(board,ids,rng,helpful,exclude=[]){
    const pool=ids.filter(id=>!exclude.includes(id));if(!pool.length)return ids[Math.floor(rng()*ids.length)];
    if(!helpful)return pool[Math.floor(rng()*pool.length)];
    const weights=usefulWeights(board,pool);return weightedPick(pool.map(id=>[id,1+(weights.get(id)||0)]),rng);
  }
  function splitBlocks(total,blocks,rng){const sizes=Array(blocks).fill(1);for(let n=blocks;n<total;n++)sizes[Math.floor(rng()*blocks)]++;return sizes}

  function makeNextStack(ctx,rng=Math.random){
    const d=difficulty(ctx),ids=activeBrands(ctx.activeCount||4);
    if(ctx.forcedBrand!=null){const count=randomInt(rng,4,6);return Array(count).fill(ctx.forcedBrand)}
    const total=randomInt(rng,d.minSize,d.maxSize),helpful=rng()<d.helpChance;
    let blocks=1;
    if(d.maxColors>=2&&rng()<d.mixChance)blocks=2;
    if(d.maxColors>=3&&blocks===2&&rng()<d.threeChance)blocks=3;
    blocks=Math.min(blocks,total);
    const sizes=splitBlocks(total,blocks,rng),colors=[];
    for(let i=0;i<blocks;i++)colors.push(pickBrand(ctx.board,ids,rng,helpful&&i===blocks-1,colors));
    const out=[];for(let i=0;i<blocks;i++)for(let n=0;n<sizes[i];n++)out.push(colors[i]);
    return out;
  }
  return{BRAND_ORDER,UNLOCK_CLEARS,activeBrands,difficulty,makeNextStack};
});
