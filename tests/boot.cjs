const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname,'..'), html = fs.readFileSync(path.join(root,'index.html'),'utf8');
async function run(fail, target) {
 const dom = new JSDOM(html,{url:'https://game.example/',runScripts:'outside-only',pretendToBeVisual:true}), w=dom.window;
 w.matchMedia=()=>({matches:false});w.ResizeObserver=class{observe(){}};w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.Element.prototype.getBoundingClientRect=function(){return{x:0,y:0,left:0,top:0,width:1024,height:768}};
 w.localStorage.setItem('cap-stack-sort-v2-best','456');
 if(target){w.CAP_CONFIG={target,creator:false};w.history.replaceState(null,'','?creator=1');w.YaGames={init:async()=>({features:{LoadingAPI:{ready(){w.readyCount=(w.readyCount||0)+1}},GameplayAPI:{start(){},stop(){}}},on(){}})};}
 w.document.querySelector('#game-styles').dataset[fail === 'styles.css' ? 'failed' : 'loaded']='true';
 for(const script of w.document.querySelectorAll('script:not([src])'))w.eval(script.textContent);
 const append=w.document.body.append.bind(w.document.body), requested=[];
 w.document.body.append=function(node){append(node); if(node.tagName!=='SCRIPT')return;const file=new URL(node.src).pathname.split('/').pop();requested.push(file);Promise.resolve().then(()=>{if(fail===file){node.onerror();return;}try{w.eval(fs.readFileSync(path.join(root,file),'utf8'));node.onload();}catch(error){w.dispatchEvent(new w.ErrorEvent('error',{error}));}})};
 w.Image=class {set src(value){Promise.resolve().then(()=>value===fail?this.onerror():this.onload())}decode(){return Promise.resolve()}};
 w.eval(fs.readFileSync(path.join(root,'boot.js'),'utf8'));
 for(let i=0;i<30;i++)await Promise.resolve();
 if(fail){assert.equal(w.document.querySelector('#boot-screen').hidden,false);assert.equal(w.document.querySelector('#boot-retry').hidden,false);assert.equal(w.document.querySelector('#boot-title').textContent,'The board could not load.');assert.equal(w.localStorage.getItem('cap-stack-sort-v2-best'),'456');}
 else{assert.equal(w.document.querySelector('#boot-screen').hidden,true);assert.equal(w.document.querySelector('#boot-progress').value,100);assert.equal(w.document.querySelector('#home-screen').hidden,false);assert.equal(w.CapGame.status().homeVisible,true);assert(requested.indexOf('game.js')>requested.indexOf('layout.js'));}
 if(target && !fail){assert.equal(w.CapGame.creator,false);assert(!requested.includes('studio.js'));assert.equal(w.readyCount,1);assert.equal(w.document.querySelector('#studio').hidden,true);}
 dom.window.close();
}
(async()=>{await run();await run(undefined,'yandex');await run('styles.css');await run('balance.js');await run('assets/master-caps-red-rull-v1.webp');console.log('PASS: real loader dependencies, full progress, stylesheet/script/image failure and preserved records');})().catch(error=>{console.error(error);process.exitCode=1});
