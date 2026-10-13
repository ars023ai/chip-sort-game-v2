(function () {
  'use strict';
  const R = window.CapRules, B = window.CapBalance, S = window.CapScenes, P = window.CapSession, L = window.CapLayout;
  if (!R || !B || !S || !P) throw new Error('Game modules could not load.');
  const $ = selector => document.querySelector(selector);
  const els = { grid: $('#grid'), tray: $('#tray'), score: $('#score'), best: $('#best'), time: $('#time'),
    scoreCard: $('#score-card'), hint: $('#hint'), overlay: $('#overlay'), modal: $('.modal'),
    title: $('#modal-title'), eyebrow: $('#modal-eyebrow'), body: $('#modal-body'), actions: $('#modal-actions'),
    banner: $('#banner'), bannerTitle: $('#banner-title'), bannerText: $('#banner-text'), chain: $('#chain-flash'), announcer: $('#announcer') };
  const creator = new URLSearchParams(location.search).get('creator') === '1';
  const savedOptions = P.read(P.OPTIONS_KEY, {});
  const options = { sound: savedOptions.sound !== false, tutorialDone: savedOptions.tutorialDone === true, motion: savedOptions.motion ?? !matchMedia('(prefers-reduced-motion: reduce)').matches };
  let best = Math.max(0, Math.min(1e12, Number(P.read(P.BEST_KEY, 0)) || 0));
  let session, random, selected = null, busy = false, pauseReasons = new Set(), lastTick = performance.now(), motionClock = 0;
  let controller = new AbortController(), lastStable, dialogKind = '', previousFocus = null, drag = null;
  let editing = creator, editPicked = { kind: 'board', index: 12 }, sceneMove = null, speed = 1, multiplier = 1;
  const animations = new Set(), listeners = new Set(), cells = [], slots = [];
  let chainCount = 0, bannerTimer = 0, suppressClick = false, homeVisible = false, lastRound = null;
  const audio = name => { window.CapAudio?.setEnabled(options.sound && !pauseReasons.size); window.CapAudio?.play(name, chainCount); };
  const announce = text => { els.announcer.textContent = text; };
  const emit = type => listeners.forEach(fn => fn(type));
  const seconds = () => Math.floor(session.elapsedMs / 1000);
  const timeText = sec => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const seed = () => { const value = new Uint32Array(1); crypto.getRandomValues(value); return value[0]; };
  const clone = value => S.clone(value);
  const abortError = () => new DOMException('Scene changed', 'AbortError');
  function assertLive(signal) { if (signal.aborted) throw abortError(); }
  function tick() {
    const now = performance.now();
    const delta = Math.max(0, now - lastTick);
    if (!pauseReasons.size) motionClock += delta * speed;
    if (session?.started && !session.over && !pauseReasons.size && !editing) session.elapsedMs += delta;
    lastTick = now;
  }
  function setPause(reason, paused) {
    tick();
    if (paused) pauseReasons.add(reason); else pauseReasons.delete(reason);
    for (const animation of animations) { if (pauseReasons.size) animation.pause(); else animation.play(); }
    emit('pause');
  }
  function cancelRun() {
    controller.abort();
    for (const animation of animations) animation.cancel();
    animations.clear();
    document.querySelectorAll('.flying,.ghost').forEach(node => node.remove());
    if (drag) drag.cleanup(); drag = null;
    cells.forEach(cell => cell.classList.remove('target'));
    controller = new AbortController(); busy = false; selected = null; chainCount = 0;
    emit('cancel');
  }
  function wait(ms, signal) {
    assertLive(signal); tick();
    const deadline = motionClock + ms;
    return new Promise((resolve, reject) => {
      let timer;
      const stop = () => { clearTimeout(timer); reject(abortError()); };
      signal.addEventListener('abort', stop, { once: true });
      const step = () => {
        if (signal.aborted) return;
        tick();
        const remaining = deadline - motionClock;
        if (remaining <= 0 && !pauseReasons.size) { signal.removeEventListener('abort', stop); resolve(); }
        else timer = setTimeout(step, pauseReasons.size ? 30 : Math.max(4, Math.min(30, remaining / speed)));
      };
      timer = setTimeout(step, 8);
    });
  }
  function cap(brand, extra = '') {
    const node = document.createElement('div'); node.className = `cap ${extra}`.trim();
    node.dataset.brand = brand; node.style.backgroundPosition = `${(brand % 5) * 25}% ${Math.floor(brand / 5) * (100 / 3)}%`;
    return node;
  }
  function visibleIndices(stack) {
    if (stack.length <= 12) return stack.map((_, i) => i);
    // Keep the top six and sample the lower tower so buried colors remain visible.
    const indices = Array.from({ length: 6 }, (_, i) => Math.floor(i * (stack.length - 7) / 5));
    return [...new Set([...indices, ...Array.from({ length: 6 }, (_, i) => stack.length - 6 + i)])];
  }
  function stackNode(stack) {
    const wrapper = document.createElement('div'); wrapper.className = 'stack';
    const indices = visibleIndices(stack), height = Math.min(11, Math.max(0, stack.length - 1)) / 11 * .16;
    indices.forEach((index, i) => {
      const node = cap(stack[index]); node.style.bottom = `calc(var(--cap) * ${indices.length > 1 ? i * height / (indices.length - 1) : 0})`;
      node.style.zIndex = i + 1; wrapper.append(node);
    });
    const count = document.createElement('span'); count.className = 'stack-count'; count.textContent = stack.length;
    wrapper.append(count); return wrapper;
  }
  function description(stack) {
    return stack.length ? `${stack.length} caps, ${S.NAMES[R.top(stack)]} on top, top group ${R.topRun(stack)}` : 'empty';
  }
  function renderBoard() {
    session.board.forEach((stack, index) => {
      const cell = cells[index], run = R.topRun(stack);
      cell.classList.toggle('empty', !stack.length); cell.classList.toggle('pulse8', run === 8); cell.classList.toggle('pulse9', run === 9);
      cell.classList.toggle('edit-picked', creator && editing && editPicked.kind === 'board' && editPicked.index === index);
      cell.classList.toggle('trigger-target', creator && sceneMove?.index === index && !stack.length);
      cell.setAttribute('aria-label', `Board cell ${index + 1}: ${description(stack)}`);
      cell.replaceChildren(...(stack.length ? [stackNode(stack)] : []));
    });
  }
  function renderTray() {
    session.tray.forEach((stack, index) => {
      const slot = slots[index]; slot.classList.toggle('selected', selected === index || (creator && editing && editPicked.kind === 'tray' && editPicked.index === index));
      slot.classList.toggle('empty', !stack.length);
      slot.setAttribute('aria-label', `Next stack ${index + 1}: ${description(stack)}`); slot.setAttribute('aria-pressed', String(selected === index));
      slot.replaceChildren(...(stack.length ? [stackNode(stack)] : []));
    });
  }
  function renderHud() {
    els.score.textContent = session.score.toLocaleString('en-US'); els.best.textContent = creator ? 'SCENE' : best.toLocaleString('en-US');
    els.time.textContent = timeText(seconds());
    const scoreDigits = String(session.score).length;
    const mobile = $('#app').classList.contains('mobile-game') || $('#app').classList.contains('compact-game');
    els.score.style.fontSize = `${mobile ? `max(${scoreDigits > 8 ? 10 : scoreDigits > 6 ? 14 : 20}px, ` : ''}calc(var(--u) * ${scoreDigits > 8 ? 1.55 : scoreDigits > 6 ? 1.95 : 2.5})${mobile ? ')' : ''}`;
    const bestDigits = String(best).length;
    els.best.style.fontSize = `${mobile && !creator ? `max(${bestDigits > 7 ? 10 : bestDigits > 5 ? 14 : 16}px, ` : ''}calc(var(--u) * ${creator ? 1.4 : bestDigits > 7 ? 1.2 : bestDigits > 5 ? 1.6 : 2.02})${mobile && !creator ? ')' : ''}`;
    els.hint.classList.toggle('done', session.moves > 2 || creator);
    if (session.moves <= 2 && !creator) els.hint.textContent = selected == null ? 'Pick a stack. Tap an empty cell.' : 'Matching tops merge. 10 or more clear.';
  }
  function render() { renderBoard(); renderTray(); renderHud(); renderCoach(); emit('render'); }
  function checkpoint() {
    tick(); session.rngState = random.getState(); lastStable = clone(session);
    if (!creator) {
      if (session.over) lastRound = { score: session.score, cleared: session.cleared, activeCount: session.activeCount };
      best = Math.max(best, session.score); P.write(P.BEST_KEY, best); P.write(P.SAVE_KEY, lastStable);
    }
  }
  function maybeUnlock() {
    if (creator) return;
    const brand = B.unlock(session, session.cleared, seconds());
    if (brand != null) { audio('unlock'); showBanner('NEW CAP UNLOCKED', S.NAMES[brand]); }
  }
  function refill() {
    if (session.tray.some(stack => stack.length) || creator) return;
    for (let i = 0; i < 3; i++) {
      const forcedBrand = B.nextIntro(session); session.introSlots[i] = forcedBrand;
      session.tray[i] = B.makeNextStack({ ...session, elapsed: seconds(), freeCells: session.board.filter(stack => !stack.length).length,
        forcedBrand, excludedBrand: session.presenting?.brand }, random);
    }
  }
  function reset(seedValue = seed(), guided = false, silent = false) {
    cancelRun(); closeDialog(); pauseReasons.delete('manual'); setPause('home', false); homeVisible = false; $('#home-screen').hidden = true; $('#play-area').inert = false; $('#game-toolbar').hidden = creator; editing = creator;
    session = P.create(seedValue); random = B.seededRandom(session.seed); sceneMove = null; lastTick = performance.now();
    refill(); if (guided && !creator) { session.tutorial = true; session.tray = [Array(5).fill(0), Array(5).fill(0), Array(5).fill(3)]; } checkpoint(); render(); if (!silent) audio('reset'); emit('reset'); resize();
  }
  function pointAt(index, length = session.board[index].length) {
    const box = cells[index].getBoundingClientRect(), size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cap'));
    // --cap is an expression. Measure a live cap to get its computed pixel width.
    const diameter = cells[index].querySelector('.cap')?.getBoundingClientRect().width || slots.find(slot => slot.querySelector('.cap'))?.querySelector('.cap').getBoundingClientRect().width || box.width * .76;
    const lift = Math.min(11, Math.max(0, length - 1)) / 11 * diameter * .16;
    return { x: box.left + box.width / 2, y: box.top + box.height * .58 - lift, size: diameter || size };
  }
  function topPoint(index) {
    const node = cells[index].querySelector('.cap:last-of-type');
    if (!node) return pointAt(index);
    const box = node.getBoundingClientRect(); return { x: box.left + box.width / 2, y: box.top + box.height / 2, size: box.width };
  }
  async function fly(brand, from, to, duration, intoScore, signal) {
    assertLive(signal);
    if (!options.motion) { await wait(30, signal); return; }
    const node = cap(brand, 'flying'), size = from.size;
    Object.assign(node.style, { left: `${from.x - size / 2}px`, top: `${from.y - size / 2}px`, width: `${size}px`, height: `${size}px` });
    document.body.append(node);
    const dx = to.x - from.x, dy = to.y - from.y;
    const frames = intoScore ? [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .58}px,${dy * .58}px) scale(.6)`, opacity: 1, offset: .58 },
      { transform: `translate(${dx}px,${dy}px) scale(.16)`, opacity: 0 }
    ] : [
      { transform: 'translate(0,0)', opacity: 1 },
      { transform: `translate(${dx * .5}px,${dy * .5 - size * .23}px)`, opacity: 1, offset: .5 },
      { transform: `translate(${dx}px,${dy}px)`, opacity: 1 }
    ];
    const animation = node.animate(frames, { duration, easing: 'cubic-bezier(.22,.7,.28,1)', fill: 'forwards' });
    animation.playbackRate = speed; animations.add(animation); if (pauseReasons.size) animation.pause();
    animation.finished.catch(() => {});
    const abort = () => animation.cancel(); signal.addEventListener('abort', abort, { once: true });
    try { await wait(duration, signal); assertLive(signal); }
    catch { assertLive(signal); }
    finally { animations.delete(animation); signal.removeEventListener('abort', abort); animation.cancel(); node.remove(); }
  }
  function scorePulse() { els.scoreCard.classList.remove('score-hit'); void els.scoreCard.offsetWidth; els.scoreCard.classList.add('score-hit'); }
  function chainFlash() {
    if (chainCount < 2) return;
    els.chain.textContent = `CHAIN ×${chainCount}`; els.chain.classList.remove('pop'); void els.chain.offsetWidth; els.chain.classList.add('pop');
  }
  async function playPlan(plan, signal) {
    for (const event of plan.events) {
      assertLive(signal);
      if (event.type === 'merge') {
        for (let k = 0; k < event.count; k++) {
          const from = topPoint(event.from), to = pointAt(event.to, session.board[event.to].length + 1);
          session.board[event.from].pop(); renderBoard(); audio('hop');
          await fly(event.brand, from, to, 135, false, signal);
          assertLive(signal); session.board[event.to].push(event.brand); renderBoard(); audio('merge');
        }
        if (R.topRun(session.board[event.to]) === 9) audio('near9');
        else if (R.topRun(session.board[event.to]) === 8) audio('near8');
      } else {
        chainCount++; audio(chainCount > 1 ? 'chain' : 'clear'); chainFlash();
        const flights = [];
        for (let k = 0; k < event.count; k++) {
          assertLive(signal);
          const from = topPoint(event.index), box = els.scoreCard.getBoundingClientRect();
          const scoreTarget = document.body.classList.contains('board-capture') ? { x: innerWidth / 2, y: -from.size } : { x: box.left + box.width / 2, y: box.top + box.height / 2 };
          session.board[event.index].pop(); renderBoard(); audio('fly');
          const flight = fly(event.brand, from, scoreTarget, 440, true, signal).then(() => {
            assertLive(signal); session.score += 10 * (creator ? multiplier : 1); session.cleared++;
            renderHud(); scorePulse(); audio('score');
          });
          // Attach rejection handling immediately, even while the next cap is waiting.
          flight.catch(() => {}); flights.push(flight);
          if (k < event.count - 1) await wait(options.motion ? 88 : 30, signal);
        }
        await Promise.all(flights); await wait(80, signal);
      }
    }
    assertLive(signal); session.board = plan.board.map(stack => stack.slice());
  }
  async function place(slot, index) {
    if (busy || pauseReasons.size || session.over || editing || !session.tray[slot]?.length) return false;
    if (session.board[index]?.length) { cells[index]?.classList.add('bad'); setTimeout(() => cells[index]?.classList.remove('bad'), 300); audio('bad'); return false; }
    if (!Number.isInteger(index) || index < 0 || index >= R.CELLS) return false;
    tick(); session.started = true; busy = true; selected = null; chainCount = 0;
    const signal = controller.signal, intro = session.introSlots[slot];
    session.board[index] = session.tray[slot].slice(); session.tray[slot] = []; session.introSlots[slot] = null;
    render(); audio('land'); emit('busy');
    try {
      const plan = R.planResolution(session.board, index);
      await wait(80, signal); await playPlan(plan, signal); assertLive(signal);
      session.moves++; B.placedIntro(session, intro); maybeUnlock(); refill();
      session.over = R.gameOver(session.board); if (creator) { tick(); session.started = false; } checkpoint(); render();
      if (session.over) { audio('gameover'); showGameOver(); }
      else if (creator) { announce(`Scene finished. ${chainCount} chains. Score ${session.score}.`); emit('complete'); }
      else announce(`Score ${session.score}. ${session.board.filter(stack => !stack.length).length} empty cells.`);
      return true;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(error); cancelRun(); session = clone(lastStable); random = B.seededRandom(session.seed, session.rngState); render();
        showBanner('MOVE RECOVERED', 'Your last completed move is safe.');
      }
      return false;
    } finally { if (!signal.aborted) { busy = false; emit('idle'); } }
  }
  function selectSlot(index) {
    if (editing) { editPicked = { kind: 'tray', index }; render(); emit('pick'); return; }
    if (busy || pauseReasons.size || session.over || !session.tray[index]?.length) return;
    selected = selected === index ? null : index; audio('select'); renderTray(); renderHud();
  }
  function build() {
    for (let index = 0; index < R.CELLS; index++) {
      const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'cell empty'; cell.dataset.i = index;
      cell.addEventListener('click', () => {
        if (editing) { editPicked = { kind: 'board', index }; render(); emit('pick'); }
        else if (selected != null) place(selected, index);
      }); cells.push(cell); els.grid.append(cell);
    }
    for (let index = 0; index < 3; index++) {
      const slot = document.createElement('button'); slot.type = 'button'; slot.className = 'tray-slot'; slot.dataset.slot = index;
      slot.addEventListener('click', () => { if (suppressClick) return; selectSlot(index); });
      slot.addEventListener('pointerdown', event => beginDrag(event, index)); slots.push(slot); els.tray.append(slot);
    }
  }
  function beginDrag(event, slot) {
    if (editing || busy || pauseReasons.size || session.over || !session.tray[slot].length || event.button > 0 || drag) return;
    const start = { x: event.clientX, y: event.clientY }, pointerId = event.pointerId;
    let ghost = null, moved = false;
    const at = (x, y) => { const cell = document.elementFromPoint(x, y)?.closest('.cell'); return cell ? Number(cell.dataset.i) : -1; };
    const cleanup = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel); ghost?.remove(); cells.forEach(cell => cell.classList.remove('target')); };
    const onMove = e => {
      if (e.pointerId !== pointerId) return;
      if (!moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
        moved = true; selected = null; ghost = document.createElement('div'); ghost.className = 'ghost'; ghost.append(stackNode(session.tray[slot])); document.body.append(ghost); audio('pickup'); renderTray();
      }
      if (!moved) return; e.preventDefault();
      ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
      const index = at(e.clientX, e.clientY); cells.forEach((cell, i) => cell.classList.toggle('target', i === index && !session.board[i].length));
    };
    const onUp = e => {
      if (e.pointerId !== pointerId) return;
      cleanup(); drag = null;
      if (moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 100); const index = at(e.clientX, e.clientY); if (index >= 0) place(slot, index); else audio('bad'); }
    };
    const onCancel = () => { cleanup(); drag = null; };
    drag = { cleanup }; window.addEventListener('pointermove', onMove, { passive: false }); window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onCancel);
  }
  function showBanner(title, text) {
    clearTimeout(bannerTimer); els.bannerTitle.textContent = title; els.bannerText.textContent = text;
    els.banner.classList.add('show'); bannerTimer = setTimeout(() => els.banner.classList.remove('show'), 2200); announce(`${title}. ${text}.`);
  }
  function button(text, className, action) {
    const node = document.createElement('button'); node.type = 'button'; node.className = className; node.textContent = text; node.addEventListener('click', action); return node;
  }
  function openDialog(kind, title, eyebrow, body, actions) {
    if (els.overlay.hidden) previousFocus = document.activeElement;
    dialogKind = kind; setPause('dialog', true); els.title.textContent = title; els.eyebrow.textContent = eyebrow;
    $('#close-modal').hidden = kind === 'over'; $('#home-screen').inert = true;
    els.body.replaceChildren(); if (typeof body === 'string') els.body.innerHTML = body; else els.body.append(body);
    els.actions.replaceChildren(...actions); els.overlay.hidden = false; els.modal.focus();
  }
  function closeDialog() {
    els.overlay.hidden = true; dialogKind = ''; $('#home-screen').inert = false; setPause('dialog', false); previousFocus?.focus?.();
  }
  function showGameOver() {
    const wasBest = session.score >= best && session.score > 0;
    openDialog('over', 'One more round?', wasBest ? 'A SCORE WORTH CHASING' : 'YOUR NEXT BEST IS WAITING',
      `<div class="result"><span>FINAL SCORE</span><strong>${session.score.toLocaleString('en-US')}</strong><small>${timeText(seconds())} · Best ${best.toLocaleString('en-US')}</small></div><div class="result-meta"><div><b>${session.cleared}</b><span>CAPS CLEARED</span></div><div><b>${session.activeCount}/16</b><span>BRANDS FOUND</span></div></div><p>Every cell is full. A fresh board, a new chance.</p>`,
      [button('Play again', 'primary', startNew), button('Main menu', 'secondary', showHome), button('How to play', 'secondary', howTo)]);
  }
  function optionsBody() {
    const container = document.createElement('div'); container.className = 'options';
    for (const [key, text] of [['sound', 'Sound effects'], ['motion', 'Cap animations']]) {
      const label = document.createElement('label'); label.className = 'option-row'; label.append(text);
      const input = document.createElement('input'); input.type = 'checkbox'; input.className = 'switch'; input.checked = options[key]; input.setAttribute('aria-label', text);
      input.addEventListener('change', () => { options[key] = input.checked; P.write(P.OPTIONS_KEY, options); }); label.append(input); container.append(label);
    }
    return container;
  }
  function settings() {
    const onMenu = homeVisible;
    openDialog('settings', onMenu ? 'Make yourself comfortable.' : 'Take a breather.', onMenu ? 'SETTINGS' : 'PAUSED', optionsBody(), [
      button(onMenu ? 'Back to menu' : 'Resume', 'primary', closeDialog), button('How to play', 'secondary', howTo),
      ...(!creator ? [button('Practice your first combination', 'secondary', () => confirmNew(true)), button('Main menu', 'secondary', showHome)] : []),
      button('Start a fresh game', 'secondary', () => confirmNew(false))]);
  }
  function confirmNew(practice = false) {
    openDialog('restart', 'A fresh start?', 'NEW GAME', '<p>Your best score stays. This round starts again from an empty board.</p>',
      [button(practice ? 'Start practice' : 'Start new game', 'primary', () => startNew(practice)), button('Keep this round', 'secondary', closeDialog)]);
  }
  function startNew(practice = false) {
    reset(seed(), !creator && (practice === true || !options.tutorialDone));
    if (!creator) slots[0].focus();
  }
  function howTo() {
    const rows = [
      ['1', 'Place a stack', 'Drag it onto an empty cell, or tap the stack and then the cell.'],
      ['2', 'Match the tops', 'Neighboring stacks with the same top cap gather together.'],
      ['3', 'Clear ten or more', 'Each cleared cap gives 10 points. Buried colors stay and can start another chain.']
    ];
    const content = document.createElement('div'); content.className = 'help-cards';
    for (const [number, title, text] of rows) {
      const row = document.createElement('div'); row.className = 'help-step';
      const n = document.createElement('b'); n.textContent = number;
      const copy = document.createElement('div'), h = document.createElement('strong'), p = document.createElement('p'); h.textContent = title; p.textContent = text; copy.append(h, p); row.append(n, copy); content.append(row);
    }
    const p = document.createElement('p'); p.textContent = 'Use all three Next stacks to get a fresh set. Keep an empty cell to stay in the game. There is no time limit.'; content.append(p);
    openDialog('help', 'Small moves. Big chains.', 'HOW TO PLAY', content,
      [button(session.over && !homeVisible ? 'Back to results' : homeVisible ? 'Back to menu' : 'Got it — let’s play', 'primary', session.over && !homeVisible ? showGameOver : closeDialog)]);
  }
  function showHome() {
    if (creator) return;
    closeDialog(); setPause('home', true); homeVisible = true; selected = null;
    $('#home-screen').hidden = false; $('#play-area').inert = true; $('#game-toolbar').hidden = true;
    const canContinue = session.started && !session.over;
    $('#home-best').textContent = best.toLocaleString('en-US');
    $('#home-continue').hidden = !canContinue;
    $('#home-play').textContent = canContinue ? 'New game' : 'Play';
    $('#home-play').className = canContinue ? 'secondary home-primary' : 'primary home-primary';
    $('#home-title').textContent = canContinue ? 'Your board is waiting.' : 'One more good move.';
    $('#home-eyebrow').textContent = canContinue ? 'PICK UP WHERE YOU LEFT OFF' : 'YOUR NEXT BEST STARTS HERE';
    const detail = $('#home-round'); detail.hidden = !canContinue && !lastRound;
    detail.textContent = canContinue ? `${session.score.toLocaleString('en-US')} points · ${timeText(seconds())} · ${session.activeCount}/16 caps found` : lastRound ? `Last round: ${lastRound.score.toLocaleString('en-US')} points · ${lastRound.activeCount}/16 caps found` : '';
    if (!busy) checkpoint(); else P.write(P.SAVE_KEY, lastStable);
    renderCoach(); resize(); (canContinue ? $('#home-continue') : $('#home-play')).focus();
  }
  function continueGame() {
    if (session.over) return;
    $('#home-screen').hidden = true; homeVisible = false; $('#play-area').inert = false; $('#game-toolbar').hidden = false;
    setPause('home', false); render(); resize(); slots.find((_, i) => session.tray[i].length)?.focus();
  }
  function renderCoach() {
    const show = !creator && session?.tutorial && !homeVisible && !session.over;
    const was = !$('#coach').hidden; $('#coach').hidden = !show;
    cells.forEach(cell => cell.classList.remove('guide-target')); slots.forEach(slot => slot.classList.remove('guide-target'));
    if (show) {
      const cleared = session.cleared > 0;
      $('#coach-title').textContent = cleared ? 'Nice. Your first clear!' : session.moves ? 'Bring them together' : 'Your first move';
      $('#coach-text').textContent = cleared ? 'Each cap gives 10 points. Keep room for the next set.' : session.moves ? 'Put matching caps next to each other.' : 'Tap a stack, then an empty cell.';
      $('#coach-skip').textContent = cleared ? 'Got it' : 'Skip';
      if (!cleared && !busy) {
        const anchor = session.board.findIndex(stack => R.top(stack) === 0), slot = session.tray.findIndex(stack => R.top(stack) === 0);
        if (slot >= 0) slots[slot].classList.add('guide-target');
        const targets = anchor >= 0 ? R.neighbors(anchor).filter(index => !session.board[index].length) : [12];
        targets.forEach(index => cells[index].classList.add('guide-target'));
      }
    }
    if (was !== show) resize();
  }
  function finishIntroduction() {
    options.tutorialDone = true; session.tutorial = false; P.write(P.OPTIONS_KEY, options);
    if (!busy) checkpoint(); renderCoach(); resize();
  }
  function about() {
    openDialog('about', 'Made for good moves.', 'CAP STACK SORT · 2.1',
      '<p>Built by ArsCorp. An endless puzzle with sixteen caps, a gentle start and a best score worth chasing.</p><p>Your round, best score and settings stay in this browser. This game has no account, advertising SDK or analytics SDK.</p><p><a class="dialog-link" href="privacy.html" target="_blank" rel="noopener">Privacy & support ↗</a></p>',
      [button('Back to menu', 'primary', closeDialog)]);
  }
  function loadScene(input) {
    const scene = S.validate(input); cancelRun(); closeDialog(); pauseReasons.delete('manual');
    session = P.create(scene.seed); session.board = clone(scene.board); session.tray = clone(scene.tray); session.score = scene.score;
    session.elapsedMs = scene.elapsed * 1000; session.activeCount = 16; random = B.seededRandom(scene.seed); sceneMove = clone(scene.move);
    session.started = false; session.over = false; editing = true; lastTick = performance.now(); checkpoint(); render(); emit('load');
  }
  function editStack(kind, index, stack) {
    if (!creator) return; S.validateStacks([stack], 1); cancelRun(); editing = true; setPause('manual', false);
    session[kind === 'board' ? 'board' : 'tray'][index] = stack.slice(); session.over = false;
    if (sceneMove && (session.board[sceneMove.index].length || !session.tray[sceneMove.slot].length)) sceneMove = null;
    checkpoint(); render();
  }
  function preparePlay() { if (!creator) return; editing = false; setPause('manual', false); render(); }
  build();
  if (creator) { $('#best-label').textContent = 'CREATOR'; document.body.classList.add('studio-mode'); reset(); }
  else {
    const saved = P.read(P.SAVE_KEY);
    try {
      if (!saved || !saved.started) throw new Error('Fresh round');
      session = P.validate(saved, S, B); random = B.seededRandom(session.seed, session.rngState); lastStable = clone(session);
      if (session.over) lastRound = { score: session.score, cleared: session.cleared, activeCount: session.activeCount };
      render();
    } catch { reset(seed(), false, true); }
    showHome();
  }
  $('#home-play').addEventListener('click', () => { if (session.started && !session.over) confirmNew(false); else startNew(); });
  $('#home-continue').addEventListener('click', continueGame);
  $('#home-help').addEventListener('click', howTo); $('#home-settings').addEventListener('click', settings); $('#home-about').addEventListener('click', about);
  $('#home-button').addEventListener('click', showHome); $('#pause-button').addEventListener('click', settings); $('#coach-skip').addEventListener('click', finishIntroduction);
  $('#settings').addEventListener('click', settings);
  $('#close-modal').addEventListener('click', () => { if (dialogKind === 'over') return; closeDialog(); });
  els.overlay.addEventListener('click', event => { if (event.target === els.overlay && dialogKind !== 'over') closeDialog(); });
  document.addEventListener('visibilitychange', () => { setPause('hidden', document.hidden); if (document.hidden && !creator && !busy) checkpoint(); });
  window.addEventListener('pagehide', () => { if (!creator) { tick(); if (!busy) checkpoint(); else P.write(P.SAVE_KEY, lastStable); } });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' && !els.overlay.hidden) {
      const focusable = [...els.modal.querySelectorAll('button,input,a')].filter(node => !node.disabled && !node.hidden);
      if (event.shiftKey && (document.activeElement === focusable[0] || document.activeElement === els.modal)) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
      return;
    }
    if (event.key === 'Escape') { if (!els.overlay.hidden && dialogKind !== 'over') closeDialog(); else { selected = null; renderTray(); emit('escape'); } return; }
    if (event.target.matches('input,textarea,select') || !els.overlay.hidden || homeVisible) return;
    if (/^[123]$/.test(event.key)) selectSlot(Number(event.key) - 1);
    if (event.code === 'Space' && !creator) { event.preventDefault(); settings(); }
  });
  setInterval(() => { tick(); renderHud(); }, 250);
  setInterval(() => { if (!creator && !busy && session.started && !pauseReasons.size) { maybeUnlock(); checkpoint(); } }, 5000);
  function resize() {
    if (!L) return;
    const app = $('#app'), box = app.getBoundingClientRect();
    const closeup = document.body.classList.contains('board-capture'), portrait = document.body.classList.contains('portrait-mode');
    const probe = getComputedStyle($('#safe-probe'));
    const metrics = L.measure(box.width, box.height, { coach: !$('#coach').hidden, portrait, closeup, controls: !creator,
      safeTop: parseFloat(probe.paddingTop) || 0, safeBottom: parseFloat(probe.paddingBottom) || 0 });
    app.classList.toggle('mobile-game', metrics.mobile);
    app.classList.toggle('compact-game', box.height <= 650);
    app.classList.toggle('coaching', !$('#coach').hidden);
    app.style.setProperty('--stage-width', `${metrics.stageWidth}px`);
    app.style.setProperty('--game-top', `${metrics.top}px`); app.style.setProperty('--game-bottom', `${metrics.bottom}px`);
    document.documentElement.style.setProperty('--u', `${metrics.unit}px`);
    renderHud();
  }
  window.addEventListener('offline', () => { $('#offline-toast').textContent = 'You’re offline. This loaded round can keep going.'; $('#offline-toast').hidden = false; setTimeout(() => { $('#offline-toast').hidden = true; }, 4500); });
  window.addEventListener('online', () => { $('#offline-toast').hidden = true; });
  new ResizeObserver(resize).observe($('#app')); window.addEventListener('resize', resize); resize();
  window.CapGame = { creator, on: fn => { listeners.add(fn); return () => listeners.delete(fn); },
    snapshot: () => clone(session), status: () => ({ homeVisible, busy, editing, paused: pauseReasons.size > 0, selected, chainCount, picked: { ...editPicked }, move: clone(sceneMove), speed, multiplier }),
    loadScene, editStack, preparePlay, place, returnHome: showHome, startNew, pick(kind, index) { editPicked = { kind, index }; render(); emit('pick'); },
    setMove(move) { sceneMove = move; render(); }, setEditing(value) { if (busy) return; editing = value; if (value && sceneMove && (session.board[sceneMove.index].length || !session.tray[sceneMove.slot].length)) sceneMove = null; setPause('manual', false); render(); },
    pause(value) { setPause('manual', value); }, setSpeed(value) { tick(); speed = value; animations.forEach(animation => { animation.playbackRate = speed; }); emit('speed'); },
    setMultiplier(value) { multiplier = value; }, setScore(value) { session.score = value; checkpoint(); renderHud(); },
    setSound(value) { options.sound = value; P.write(P.OPTIONS_KEY, options); }, showBanner, resize,
    exportScene(name) { const move = sceneMove && !session.board[sceneMove.index].length && session.tray[sceneMove.slot].length ? clone(sceneMove) : null; return S.validate({ version: 1, name, seed: session.seed, score: session.score, elapsed: seconds(), board: clone(session.board), tray: clone(session.tray), playback: { speed, multiplier }, move }); } };
})();
