// Pure game rules shared by the browser build and CI.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CapRules = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const ROWS = 6, COLS = 5, CELLS = ROWS * COLS, CLEAR_AT = 10;
  const top = stack => stack && stack.length ? stack[stack.length - 1] : null;
  const topRun = stack => {
    if (!stack || !stack.length) return 0;
    const brand = top(stack); let n = 0;
    for (let i = stack.length - 1; i >= 0 && stack[i] === brand; i--) n++;
    return n;
  };
  const neighbors = idx => {
    const r = Math.floor(idx / COLS), c = idx % COLS, out = [];
    if (r > 0) out.push(idx - COLS);
    if (r < ROWS - 1) out.push(idx + COLS);
    if (c > 0) out.push(idx - 1);
    if (c < COLS - 1) out.push(idx + 1);
    return out;
  };
  const component = (board, start) => {
    const brand = top(board[start]); if (brand == null) return [];
    const seen = new Set([start]), q = [start], out = [];
    while (q.length) {
      const i = q.shift(); out.push(i);
      for (const n of neighbors(i)) if (!seen.has(n) && top(board[n]) === brand) { seen.add(n); q.push(n); }
    }
    return out;
  };
  const clearTop = stack => {
    const n = topRun(stack); if (n < CLEAR_AT) return 0;
    stack.splice(stack.length - n, n); return n;
  };
  const gatherInstant = (board, target) => {
    const comp = component(board, target); if (comp.length < 2) return 0;
    const brand = top(board[target]); let moved = 0;
    for (const src of comp) {
      if (src === target) continue;
      const n = topRun(board[src]);
      board[src].splice(board[src].length - n, n);
      for (let k = 0; k < n; k++) board[target].push(brand);
      moved += n;
    }
    return moved;
  };
  const resolveInstant = (board, start) => {
    const result = planResolution(board, start);
    for (let i = 0; i < CELLS; i++) board[i] = result.board[i];
    return result.cleared;
  };
  const gameOver = board => board.every(s => s && s.length > 0);
  // The renderer plays this exact plan, so simulations use identical decisions.
  const planResolution = (input, start) => {
    const board = input.map(stack => stack.slice()), events = [];
    let anchor = start, cleared = 0, guard = 0;
    while (guard++ < 10000) {
      const canResolve = i => top(board[i]) != null && (component(board, i).length > 1 || topRun(board[i]) >= CLEAR_AT);
      if (anchor == null || !canResolve(anchor)) anchor = board.findIndex((_, i) => canResolve(i));
      if (anchor < 0) return { board, events, cleared };
      const brand = top(board[anchor]);
      for (const src of component(board, anchor)) {
        if (src === anchor) continue;
        const count = topRun(board[src]);
        board[src].splice(board[src].length - count, count);
        board[anchor].push(...Array(count).fill(brand));
        events.push({ type: 'merge', from: src, to: anchor, brand, count });
      }
      const count = clearTop(board[anchor]);
      if (count) { events.push({ type: 'clear', index: anchor, brand, count }); cleared += count; }
      anchor = null;
    }
    throw new Error('Resolution did not converge');
  };
  return { ROWS, COLS, CELLS, CLEAR_AT, top, topRun, neighbors, component, clearTop, gatherInstant, resolveInstant, gameOver, planResolution };
});
