(function () {
  'use strict';
  let enabled = true, suspended = false, captureDestination = null;
  function audioCtx(){if(!enabled)return null;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{const ctx=audioCtx.ctx||(audioCtx.ctx=new AC());if(ctx.state==='suspended')ctx.resume();return ctx}catch{return null}}
  function tone(freq,dur=.06,gain=.025,type='triangle',delay=0,endFreq=freq){const ctx=audioCtx();if(!ctx)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(40,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(40,endFreq),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(ctx.destination);if(captureDestination)g.connect(captureDestination);o.start(t);o.stop(t+dur+.015)}
  function noise(dur=.05,gain=.012,delay=0,highpass=900){const ctx=audioCtx();if(!ctx)return;const length=Math.max(1,Math.floor(ctx.sampleRate*dur)),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain(),t=ctx.currentTime+delay;filter.type='highpass';filter.frequency.value=highpass;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.buffer=buffer;src.connect(filter);filter.connect(g);g.connect(ctx.destination);if(captureDestination)g.connect(captureDestination);src.start(t)}
  function sfx(name,pitch=0){if(!enabled || suspended)return;const r=()=>Math.random()*18-9;switch(name){
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

  window.CapAudio = { startCapture() { const ctx = audioCtx(); if (!ctx) return null; captureDestination = ctx.createMediaStreamDestination(); return captureDestination.stream; }, endCapture() { captureDestination = null; }, play: sfx, setEnabled(value) { enabled = value; }, setSuspended(value) {
    suspended = value;
    const ctx = audioCtx.ctx;
    if (ctx && ctx.state !== 'closed') { try { const task = value ? ctx.suspend() : ctx.resume(); task?.catch?.(() => {}); } catch {} }
  } };
})();
