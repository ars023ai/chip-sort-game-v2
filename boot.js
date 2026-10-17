(function () {
  'use strict';
  const VERSION = '2.2.0', $ = id => document.getElementById(id);
  const modules = ['rules.js', 'balance.js', 'scenes.js', 'session.js', 'layout.js', 'sound.js', 'platform.js'];
  const assets = ['assets/master-caps-red-rull-v1.webp', 'assets/reference-approved-b-v4.webp'];
  const query = new URLSearchParams(location.search), preview = query.get('preview');
  if (['phone', 'small', 'tablet', 'landscape', 'pressPortrait', 'pressLandscape'].includes(preview)) { document.body.classList.add('device-preview'); $('app').dataset.preview = preview; }
  let done = 0, timeout, failed = false;
  const total = modules.length + assets.length + 3;
  const progress = () => { $('boot-progress').value = Math.round(++done / total * 100); };
  const loadStyles = () => new Promise((resolve, reject) => {
    const link = $('game-styles');
    const loaded = () => { progress(); resolve(); };
    if (link.dataset.failed === 'true') reject(new Error('Game styles did not load.'));
    else if (link.sheet || link.dataset.loaded === 'true') loaded();
    else { link.addEventListener('load', loaded, { once: true }); link.addEventListener('error', () => reject(new Error('Game styles did not load.')), { once: true }); }
  });
  const loadScript = file => new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = `${file}?v=${VERSION}`; script.async = false;
    script.onload = () => { progress(); resolve(); }; script.onerror = () => reject(new Error('A game module did not load.'));
    document.body.append(script);
  });
  const loadImage = url => new Promise((resolve, reject) => {
    const image = new Image(); image.onload = async () => { if (image.decode) await image.decode().catch(() => {}); progress(); resolve(); };
    image.onerror = () => reject(new Error('A game image did not load.')); image.src = url;
  });
  const failure = () => { if (failed) return; failed = true; clearTimeout(timeout); window.capLoadError(); };
  window.addEventListener('error', failure, { once: true });
  $('boot-retry').addEventListener('click', () => location.reload());
  timeout = setTimeout(failure, 20000);
  (async () => {
    try {
      await Promise.all([loadStyles(), ...modules.map(loadScript), ...assets.map(loadImage)]);
      if (failed) return;
      $('boot-text').textContent = 'Opening your game…';
      await window.CapPlatform.init();
      await loadScript('game.js');
      if (window.CAP_CONFIG?.creator !== false) await loadScript('studio.js');
      if (failed || !window.CapGame) throw new Error('Game initialization failed.');
      clearTimeout(timeout); window.removeEventListener('error', failure);
      $('boot-progress').value = 100; $('boot-screen').hidden = true;
      window.CapGame.resize();
      window.CapPlatform.ready();
      window.dispatchEvent(new Event('cap-game-ready'));
    } catch { failure(); }
  })();
})();
