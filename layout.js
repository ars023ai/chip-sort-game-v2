(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CapLayout = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function measure(width, height, { coach = false, safeTop = 0, safeBottom = 0, portrait = false, closeup = false, controls = true } = {}) {
    const mobile = !closeup && (portrait || (width <= 800 && height >= width));
    const top = mobile && controls ? safeTop + 60 : 0;
    const bottom = mobile && controls ? safeBottom + 16 + (coach ? 64 : 0) : 0;
    const usableHeight = Math.max(240, height - top - bottom);
    const stageWidth = closeup ? Math.min(width * 2, height * 1.9047) : Math.min(width - (mobile ? 8 : 0), usableHeight * (mobile ? 52 / 75 : 4 / 3));
    const stageHeight = stageWidth * (mobile ? 75 / 52 : 3 / 4);
    const unit = stageWidth / (mobile ? 52 : 100);
    return { mobile, top, bottom, stageWidth, stageHeight, unit };
  }
  return { measure };
});
