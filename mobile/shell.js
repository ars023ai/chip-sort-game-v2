import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
let appActive = true;
function pause(value) { window.CapGame?.externalPause('native', !value); }
App.addListener('appStateChange', ({ isActive }) => { appActive = isActive; pause(isActive); });
window.addEventListener('cap-game-ready', () => pause(appActive));
if (Capacitor.getPlatform() === 'android') App.addListener('backButton', () => {
  const game = window.CapGame;
  if (game && !game.status().homeVisible) game.returnHome();
  else App.exitApp();
});
