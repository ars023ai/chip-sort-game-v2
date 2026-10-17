(function () {
  'use strict';
  const G = window.CapGame;
  if (!G?.creator) return;
  const $ = selector => document.querySelector(selector);
  const section = $('#capture-format').closest('.studio-section');
  const action = document.createElement('button'); action.className = 'primary'; action.id = 'record-clip'; action.style.marginTop = '12px';
  const note = document.createElement('p'); note.textContent = 'Download a clip with game sound. Keep this tab open. Esc cancels.';
  section.append(action, note);
  const mime = window.MediaRecorder && ['video/mp4;codecs=avc1.42001E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type => MediaRecorder.isTypeSupported(type));
  const extension = mime?.startsWith('video/mp4') ? 'mp4' : 'webm';
  action.textContent = mime ? `Record & download ${extension.toUpperCase()}` : 'Video export unavailable';
  if (!mime || !HTMLCanvasElement.prototype.captureStream) { action.disabled = true; note.textContent = 'Use your screen recorder in this browser.'; return; }
  let recording = false, cancel = false, stopAt = Infinity;
  const refresh = () => { action.disabled = recording || G.status().busy || !G.status().move; };
  G.on(refresh); refresh();
  const loadImage = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('A capture image could not load.')); image.src = src; });
  const resources = Promise.all([loadImage('assets/reference-approved-b-v4.webp'), loadImage('assets/master-caps-red-rull-v1.webp')]);
  function text(ctx, node, stroke = false) {
    const css = getComputedStyle(node), r = node.getBoundingClientRect(), alpha = Number(css.opacity);
    if (!r.width || !r.height || alpha <= 0 || css.visibility === 'hidden') return;
    ctx.save(); ctx.globalAlpha = alpha; ctx.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = css.color;
    if ('letterSpacing' in ctx) ctx.letterSpacing = css.letterSpacing;
    if (stroke) { ctx.lineWidth = 3; ctx.strokeStyle = '#5b351e'; ctx.strokeText(node.textContent, r.x + r.width/2, r.y + r.height/2); }
    ctx.fillText(node.textContent, r.x + r.width/2, r.y + r.height/2); ctx.restore();
  }
  function paint(canvas, background, atlas, portrait) {
    const ctx = canvas.getContext('2d'), app = $('#app').getBoundingClientRect(), scene = $('#scene').getBoundingClientRect();
    const view = portrait ? app : { x: 0, y: 0, width: innerWidth, height: innerHeight };
    const scale = Math.min(canvas.width/view.width, canvas.height/view.height);
    ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle = '#17211c'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.translate((canvas.width-view.width*scale)/2-view.x*scale,(canvas.height-view.height*scale)/2-view.y*scale); ctx.scale(scale,scale);
    ctx.save(); ctx.beginPath(); ctx.rect(app.x,app.y,app.width,app.height); ctx.clip();
    const css = getComputedStyle($('#scene')), parts = css.backgroundSize.split(' ');
    const bw = scene.width*(parseFloat(parts[0])||100)/100, bh = scene.height*(parseFloat(parts[1])||100)/100;
    ctx.save();ctx.beginPath();ctx.rect(scene.x,scene.y,scene.width,scene.height);ctx.clip();
    ctx.drawImage(background,scene.x+(scene.width-bw)/2,scene.y+(scene.height-bh)/2,bw,bh);ctx.restore();
    if ($('#app').classList.contains('mobile-game')) {
      const r = $('.hud').getBoundingClientRect(), gradient=ctx.createLinearGradient(0,r.y,0,r.bottom);gradient.addColorStop(0,'#414642');gradient.addColorStop(1,'#2a2e2c');ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(r.x,r.y,r.width,r.height,8);ctx.fill();ctx.strokeStyle='#babca940';ctx.lineWidth=1;ctx.stroke();
    }
    for (const node of document.querySelectorAll('.cap')) {
      const r=node.getBoundingClientRect(), c=getComputedStyle(node), brand=Number(node.dataset.brand);
      if(!r.width||!r.height||c.visibility==='hidden'||Number(c.opacity)<=0)continue;
      ctx.save();ctx.globalAlpha=Number(c.opacity);ctx.fillStyle=c.getPropertyValue('--side').trim()||'#56351f';ctx.beginPath();ctx.ellipse(r.x+r.width/2,r.y+r.height/2+1.5,r.width/2,r.height/2,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.ellipse(r.x+r.width/2,r.y+r.height/2,r.width/2,r.height/2,0,0,Math.PI*2);ctx.clip();ctx.filter='saturate(1.08) contrast(1.05)';
      ctx.drawImage(atlas,(brand%5)*atlas.width/5,Math.floor(brand/5)*atlas.height/4,atlas.width/5,atlas.height/4,r.x,r.y,r.width,r.height);ctx.restore();
    }
    for(const node of document.querySelectorAll('.stack-count')) {const r=node.getBoundingClientRect(),c=getComputedStyle(node);if(!r.width||!r.height)continue;ctx.fillStyle=c.backgroundColor;ctx.beginPath();ctx.ellipse(r.x+r.width/2,r.y+r.height/2,r.width/2,r.height/2,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=c.borderTopColor;ctx.lineWidth=1;ctx.stroke();text(ctx,node);}
    for(const node of document.querySelectorAll('.hud-card span,.hud-card b'))text(ctx,node);
    const timeBar=$('.time-card i'),tr=timeBar.getBoundingClientRect();ctx.fillStyle=getComputedStyle(timeBar).backgroundColor;ctx.fillRect(tr.x,tr.y,tr.width,tr.height);
    text(ctx,$('#chain-flash'),true);ctx.restore();
    ctx.setTransform(1,0,0,1,0,0);
  }
  G.on(event => { if (recording && event === 'complete') stopAt = performance.now()+800; });
  document.addEventListener('keydown', event => { if (recording && event.key === 'Escape') cancel = true; });
  document.addEventListener('visibilitychange', () => { if (recording && document.hidden) cancel = true; });
  action.addEventListener('click', async () => {
    if (recording || G.status().busy || !G.status().move) return;
    recording = true; cancel = false; stopAt = Infinity; action.disabled = true;
    let stream, audioStream, frame, recorder, indicator;
    try {
      audioStream = window.CapAudio?.startCapture?.();
      const [background, atlas] = await resources;
      $('#rewind-scene').click(); $('#clean-capture').click();
      const portrait = $('#capture-format').value === 'portrait', canvas = document.createElement('canvas');
      canvas.width = portrait ? 720 : 1280; canvas.height = portrait ? 1280 : 720;
      paint(canvas,background,atlas,portrait); stream = canvas.captureStream(30);
      for(const track of audioStream?.getAudioTracks() || [])stream.addTrack(track);
      recorder = new MediaRecorder(stream,{ mimeType:mime, videoBitsPerSecond:6000000 });
      const chunks = [], finished = new Promise((resolve,reject) => { recorder.ondataavailable = event => { if(event.data.size)chunks.push(event.data); };recorder.onstop=resolve;recorder.onerror=event=>reject(event.error||new Error('Video encoding failed.')); });
      indicator = document.createElement('div');indicator.textContent='Recording clip… Esc to cancel';indicator.style.cssText='position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:600;padding:10px 16px;border-radius:9px;background:#24392ef0;color:#ffe6a1;font:12px Arial;pointer-events:none';document.body.append(indicator);
      recorder.start(250); const began = performance.now();
      const draw = () => {
        if(cancel || performance.now()>stopAt || performance.now()-began>27000){if(recorder.state!=='inactive')recorder.stop();return;}
        paint(canvas,background,atlas,portrait);frame=requestAnimationFrame(draw);
      };
      frame=requestAnimationFrame(draw); $('#repeat-scene').click(); await finished;
      if(cancel)throw new Error('Recording cancelled. Keep the game tab open for the whole take.');
      const blob=new Blob(chunks,{type:mime.split(';')[0]}),url=URL.createObjectURL(blob),link=document.createElement('a');
      link.href=url;link.download='cap-stack-sort-'+(portrait?'portrait':'landscape')+'-'+Date.now()+'.'+extension;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
      $('#studio-status').textContent=`Clip downloaded (${extension.toUpperCase()}). It uses the live game, current speed and scene score settings.`;
    } catch(error) { $('#studio-status').textContent=error.message||'Recording failed. Use your screen recorder.'; }
    finally {
      cancelAnimationFrame(frame); if(recorder?.state==='recording')recorder.stop(); stream?.getTracks().forEach(track=>track.stop());window.CapAudio?.endCapture?.();indicator?.remove();$('#capture-exit').click();recording=false;action.disabled=false;
    }
  });
})();
