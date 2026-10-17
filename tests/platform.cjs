const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
function harness(target='yandex', deferred=false) {
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://game.example/',runScripts:'outside-only'}),w=dom.window;
 let now=0, initCalls=0, readyCalls=0, starts=0, stops=0, advert, home=true, over=false;
 const events={}, pauses=new Set(),listeners=[],timers=new Map(); let timerId=0;
 w.CAP_CONFIG={target}; w.Date.now=()=>now;
 w.setTimeout=fn=>{timers.set(++timerId,fn);return timerId};w.clearTimeout=id=>timers.delete(id);
 const sdk={environment:{i18n:{lang:'ru'}},features:{LoadingAPI:{ready(){readyCalls++}},GameplayAPI:{start(){starts++},stop(){stops++}}},on(name,fn){events[name]=fn},adv:{showFullscreenAdv({callbacks}){advert=callbacks}}};
 if(!deferred)w.YaGames={async init(){initCalls++;return sdk}};
 const G={creator:false,on(fn){listeners.push(fn)},status(){return{homeVisible:home,paused:pauses.size>0}},snapshot(){return{over}},externalPause(reason,value){if(value)pauses.add(reason);else pauses.delete(reason);listeners.forEach(fn=>fn())}};
 w.eval(fs.readFileSync(path.join(__dirname,'../platform.js'),'utf8'));
 return {w,api:w.CapPlatform,sdk,G,events,pauses,timers,callbacks:()=>advert,advance(ms){now+=ms},home(v){home=v;listeners.forEach(fn=>fn())},over(v){over=v;listeners.forEach(fn=>fn())},stats:()=>({initCalls,readyCalls,starts,stops}),close:()=>dom.window.close()};
}
(async()=>{
 const h=harness();await Promise.all([h.api.init(),h.api.init()]);assert.equal(h.stats().initCalls,1);
 h.api.attach(h.G);assert.equal(h.stats().readyCalls,0,'no Game Ready before real loader completes');
 h.api.ready();h.api.ready();assert.equal(h.stats().readyCalls,1);assert.equal(h.stats().starts,0,'menu is not gameplay');
 h.home(false);assert.equal(h.stats().starts,1);h.events.game_api_pause();assert(h.pauses.has('platform'));assert.equal(h.stats().stops,1);
 h.G.externalPause('manual',true);h.events.game_api_resume();assert(h.pauses.has('manual'));assert.equal(h.stats().starts,1,'platform resume preserves independent pause');
 h.G.externalPause('manual',false);assert.equal(h.stats().starts,2);
 h.over(true);assert.equal(await h.api.interstitial(),false,'no ad during first three minutes');h.advance(180001);
 const ad=h.api.interstitial();assert(h.pauses.has('advertisement'));assert.equal(await h.api.interstitial(),false,'no overlapping requests');
 h.callbacks().onOpen();assert.equal(h.timers.size,0);h.G.externalPause('manual',true);h.callbacks().onClose(true);assert.equal(await ad,true);assert(h.pauses.has('manual'));assert(!h.pauses.has('advertisement'));
 assert.equal(await h.api.interstitial(),false,'cooldown remains after an ad');h.advance(180001);
 const fail=h.api.interstitial();h.callbacks().onError(new Error('No fill'));h.callbacks().onClose(false);assert.equal(await fail,false);assert(!h.pauses.has('advertisement'));
 h.advance(180001);const lost=h.api.interstitial();[...h.timers.values()].forEach(fn=>fn());assert.equal(await lost,false);assert(!h.pauses.has('advertisement'));
 h.callbacks().onOpen();assert(h.pauses.has('advertisement'),'a late real ad still pauses the game');h.callbacks().onClose(true);assert(!h.pauses.has('advertisement'),'late close cannot leave a permanent pause');h.close();
 const early=harness();await early.api.init();early.events.game_api_pause();early.api.attach(early.G);assert(early.pauses.has('platform'),'pause before game attachment is retained');early.close();
 const d=harness('yandex',true),p=d.api.init();const script=d.w.document.querySelector('script');assert.equal(new URL(script.src).pathname,'/sdk.js');d.w.YaGames={init:async()=>d.sdk};script.onload();await p;d.close();
 const failure=harness('yandex',true),bad=failure.api.init();failure.w.document.querySelector('script').onerror();await assert.rejects(bad,/could not load/);failure.close();
 for(const target of ['web','mobile']){const w=harness(target);await w.api.init();w.api.attach(w.G);w.api.ready();assert.equal(w.stats().initCalls,0);assert.equal(w.w.document.querySelectorAll('script').length,0);assert.equal(await w.api.interstitial(),false);w.close();}
 console.log('PASS: SDK loading, once-only readiness, gameplay events, pause composition, ad gating/cooldown/error/late callbacks, no SDK in web/mobile');
})().catch(error=>{console.error(error);process.exitCode=1});
