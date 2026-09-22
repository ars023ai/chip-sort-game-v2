// Visual-only loader. Keeps game.js and rules.js untouched.
(() => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'design-stage1.css?v=20260922a';
  document.head.appendChild(link);
})();
