(function () {
  'use strict';
  const target = window.CAP_CONFIG?.target || 'web';
  let sdk, game, booted = false, readySent = false, playing = false, initializing, platformPaused = false;
  let adPending = false, lastAd = Date.now();
  const log = error => console.warn('Platform service unavailable:', error?.message || error);
  function sync() {
    if (!game || !sdk || !readySent) return;
    const state = game.status();
    const active = !game.creator && !state.homeVisible && !state.paused && !game.snapshot().over;
    if (active === playing) return;
    playing = active;
    try { sdk.features?.GameplayAPI?.[active ? 'start' : 'stop'](); } catch (error) { log(error); }
  }
  function sendReady() {
    if (!booted || !sdk || readySent) return;
    sdk.features?.LoadingAPI?.ready(); readySent = true; sync();
  }
  function init() {
    if (initializing) return initializing;
    initializing = (async () => {
      if (target !== 'yandex') return;
      if (!window.YaGames) await new Promise((resolve, reject) => {
        const script = document.createElement('script'); script.src = '/sdk.js'; script.async = true;
        script.onload = resolve; script.onerror = () => reject(new Error('Yandex Games SDK could not load.'));
        document.head.append(script);
      });
      sdk = await window.YaGames.init();
      const language = sdk.environment?.i18n?.lang || 'en';
      document.documentElement.lang = ['en'].includes(language) ? language : 'en';
      sdk.on?.('game_api_pause', () => { platformPaused = true; game?.externalPause('platform', true); });
      sdk.on?.('game_api_resume', () => { platformPaused = false; game?.externalPause('platform', false); });
      sendReady();
    })();
    return initializing;
  }
  function interstitial() {
    if (!sdk || !game || game.creator || adPending || Date.now() - lastAd < 180000 || !game.snapshot().over) return Promise.resolve(false);
    adPending = true; lastAd = Date.now(); game.externalPause('advertisement', true);
    return new Promise(resolve => {
      let settled = false;
      const finish = shown => {
        if (settled) return; settled = true; clearTimeout(timer);
        adPending = false; game.externalPause('advertisement', false); resolve(Boolean(shown));
      };
      // Failed requests cannot trap the player. Open adverts stay paused until
      // their real close callback rather than resuming on an arbitrary timer.
      const timer = setTimeout(() => finish(false), 12000);
      try {
        sdk.adv.showFullscreenAdv({ callbacks: {
          onOpen: () => { clearTimeout(timer); game.externalPause('advertisement', true); },
          onClose: shown => { game.externalPause('advertisement', false); finish(shown); },
          onError: () => { game.externalPause('advertisement', false); finish(false); }
        } });
      } catch (error) { log(error); finish(false); }
    });
  }
  window.CapPlatform = {
    target, init, interstitial,
    attach(value) { game = value; game.on(sync); game.externalPause('platform', platformPaused); sync(); },
    ready() { booted = true; sendReady(); }
  };
})();
