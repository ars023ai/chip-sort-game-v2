(function () {
  'use strict';
  const G = window.CapGame, S = window.CapScenes, P = window.CapSession;
  if (!G?.creator) return;
  const $ = selector => document.querySelector(selector), studio = $('#studio');
  const SAVES_KEY = 'cap-stack-sort-scenes-v1';
  let template, copiedStack = null, undo = [], sceneName = 'Soda cascade', refreshing = false;
  studio.hidden = false;
  studio.innerHTML = `
    <div class="eyebrow">CAP STACK SORT / CREATOR</div>
    <h2>Make a great move.</h2>
    <p class="subtitle">Build the moment. Hit play. Get the shot.</p>
    <section class="studio-section">
      <div class="section-title">01 / SCENE <span class="chip">LOCAL STUDIO</span></div>
      <label for="scene-name">Scene name</label><input id="scene-name" maxlength="80" value="Soda cascade">
      <div class="field-row"><div><label for="preset">Starting scene</label><select id="preset"><option value="spark">First spark · 3 chains</option><option value="cascade" selected>Soda cascade · 5 chains</option><option value="finale">Full pour · 6 chains</option></select></div><div><label for="scene-seed">Seed</label><input id="scene-seed" type="number" min="0" max="4294967295" value="2026"></div></div>
      <div class="button-row"><button class="secondary small" id="generate">Generate scene</button><button class="secondary small" id="empty-scene">Empty board</button></div>
    </section>
    <section class="studio-section">
      <div class="section-title">02 / DIRECT</div>
      <button class="primary" id="play-scene">▶ Play the trigger</button>
      <div class="button-row"><button class="secondary" id="repeat-scene">↻ Repeat take</button><button class="secondary" id="pause-scene">Pause</button><button class="secondary" id="rewind-scene">Rewind</button></div>
      <div class="field-row"><div><label for="scene-score">Starting score</label><input id="scene-score" type="number" min="0" max="1000000000" value="1240"></div><div><label for="scene-speed">Animation speed</label><select id="scene-speed"><option value="0.5">0.5× · slow</option><option value="1" selected>1× · real time</option><option value="1.5">1.5×</option><option value="2">2× · fast</option></select></div></div>
      <label class="option-row"><span>Super Score · 10×</span><input class="switch" id="super-score" type="checkbox"></label>
      <label class="option-row"><span>Sound effects</span><input class="switch" id="studio-sound" type="checkbox" checked></label>
      <div class="status-line" id="studio-status" role="status">One stack unlocks five real chain reactions.</div>
    </section>
    <section class="studio-section">
      <div class="section-title">03 / BUILD</div>
      <label class="editor-toggle"><span>Edit board & Next stacks</span><input class="switch" id="edit-mode" type="checkbox" checked></label>
      <div class="mini-board" id="mini-board" aria-label="Scene board editor"></div>
      <div class="tray-tabs" id="tray-tabs"></div>
      <div class="editor-caption" id="editor-caption">Cell 13</div><div class="layers" id="layers"></div>
      <p>Layers below run from bottom to top.</p>
      <div class="field-row"><div><label for="layer-brand">Brand</label><select id="layer-brand"></select></div><div><label for="layer-count">Caps</label><input id="layer-count" type="number" min="1" max="25" value="4"></div></div>
      <div class="button-row"><button class="secondary small" id="add-layer">+ Add top layer</button><button class="secondary small" id="clear-stack">Clear stack</button></div>
      <div class="button-row"><button class="secondary small" id="copy-stack">Copy</button><button class="secondary small" id="paste-stack">Paste</button><button class="secondary small" id="undo-edit">Undo</button></div>
      <div class="field-row"><div><label for="trigger-slot">Trigger Next stack</label><select id="trigger-slot"><option value="0">Next 1</option><option value="1">Next 2</option><option value="2">Next 3</option></select></div><div><label for="trigger-cell">Trigger cell (1–30)</label><input id="trigger-cell" type="number" min="1" max="30" value="13"></div></div>
      <button class="secondary small" id="set-trigger" style="width:100%;margin-top:10px">Use this trigger</button>
    </section>
    <section class="studio-section">
      <div class="section-title">04 / CAPTURE</div>
      <label for="capture-format">Composition</label><select id="capture-format"><option value="full">Full tabletop</option><option value="portrait">Portrait · Reels / TikTok</option><option value="board">Board close-up</option></select>
      <div class="button-row"><button class="secondary" id="clean-capture">Clean capture</button><button class="secondary" id="capture-play">Capture & play</button></div>
      <p>Settings disappear. Press Esc to return. Use your screen recorder to capture the take.</p>
    </section>
    <section class="studio-section">
      <div class="section-title">05 / KEEP IT</div>
      <div class="studio-actions"><button class="secondary small" id="save-scene">Save in browser</button><button class="secondary small" id="export-scene">Download JSON</button><button class="secondary small wide" id="copy-link">Copy scene link</button></div>
      <label for="saved-scenes" style="margin-top:12px">Saved scenes</label><select id="saved-scenes"><option value="">No saved scenes yet</option></select>
      <button class="secondary small" id="load-saved" style="width:100%;margin-top:8px">Load saved scene</button>
      <details style="margin-top:14px"><summary style="font-size:11px;color:#aebda1;cursor:pointer">Import or paste JSON</summary><label for="scene-json" style="margin-top:10px">Scene JSON</label><textarea id="scene-json" placeholder="Paste an exported scene here" spellcheck="false"></textarea><div class="button-row"><button class="secondary small" id="import-json">Import JSON</button><button class="secondary small" id="import-file">Choose file</button></div></details>
      <input id="scene-file" type="file" accept="application/json,.json" hidden>
    </section>
    <div class="studio-footer">Creator scenes never change your game’s BEST.<br><a href="./">Back to the game ↗</a></div>`;
  const mini = [];
  for (let i = 0; i < 30; i++) {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'mini-cell'; node.dataset.i = i;
    node.addEventListener('click', () => pick('board', i)); $('#mini-board').append(node); mini.push(node);
  }
  const tabs = [];
  for (let i = 0; i < 3; i++) {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'tray-tab'; node.textContent = `Next ${i + 1}`;
    node.addEventListener('click', () => pick('tray', i)); $('#tray-tabs').append(node); tabs.push(node);
  }
  S.NAMES.forEach((name, i) => { const option = document.createElement('option'); option.value = i; option.textContent = name; $('#layer-brand').append(option); });
  function status(text, error = false) { $('#studio-status').textContent = text; $('#studio-status').classList.toggle('error', error); }
  function safely(fn) { try { return fn(); } catch (error) { status(error.message, true); return null; } }
  function remember() { undo.push(S.clone(template)); if (undo.length > 30) undo.shift(); }
  function currentName() { return $('#scene-name').value.trim() || 'Untitled scene'; }
  function keep() { template = G.exportScene(currentName()); sceneName = template.name; }
  function load(input, resetUndo = true) {
    const scene = S.validate(input); if (resetUndo) undo = [];
    template = S.clone(scene); sceneName = scene.name; G.loadScene(scene);
    G.setSpeed(scene.playback.speed); G.setMultiplier(scene.playback.multiplier);
    $('#scene-speed').value = scene.playback.speed; $('#super-score').checked = scene.playback.multiplier === 10;
    $('#scene-name').value = scene.name; $('#scene-score').value = scene.score; $('#scene-seed').value = scene.seed;
    if (scene.move) { $('#trigger-slot').value = scene.move.slot; $('#trigger-cell').value = scene.move.index + 1; }
    $('#edit-mode').checked = true; refresh(); layers();
    status(scene.move ? 'Ready. Play the trigger or edit any stack.' : 'Pick a Next stack and an empty trigger cell.');
  }
  function pick(kind, index) {
    if (G.status().busy) return; G.setEditing(true); $('#edit-mode').checked = true; G.pick(kind, index);
  }
  function refresh() {
    if (refreshing) return; refreshing = true;
    const state = G.snapshot(), st = G.status();
    mini.forEach((node, i) => {
      const stack = state.board[i], top = stack.at(-1); node.textContent = stack.length || '·';
      node.classList.toggle('filled', stack.length > 0); node.classList.toggle('active', st.picked.kind === 'board' && st.picked.index === i);
      node.classList.toggle('marked', st.move?.index === i); node.style.setProperty('--brand-color', S.COLORS[top] || '#19251c');
      node.setAttribute('aria-label', `Edit cell ${i + 1}, ${stack.length} caps${top != null ? `, ${S.NAMES[top]} on top` : ''}`);
    });
    tabs.forEach((node, i) => { node.textContent = `Next ${i + 1} · ${state.tray[i].length}`; node.classList.toggle('active', st.picked.kind === 'tray' && st.picked.index === i); });
    $('#edit-mode').checked = st.editing; $('#edit-mode').disabled = st.busy;
    $('#pause-scene').disabled = !st.busy; $('#pause-scene').textContent = st.paused ? 'Resume' : 'Pause';
    $('#play-scene').disabled = st.busy || !st.move; $('#undo-edit').disabled = !undo.length || st.busy;
    for (const id of ['add-layer', 'clear-stack', 'copy-stack', 'paste-stack', 'set-trigger', 'scene-score', 'save-scene', 'export-scene', 'copy-link']) $('#'+id).disabled = st.busy;
    refreshing = false;
  }
  function layers() {
    const st = G.status(), state = G.snapshot(), picked = st.picked;
    const stack = state[picked.kind === 'board' ? 'board' : 'tray'][picked.index], list = $('#layers'); list.replaceChildren();
    $('#editor-caption').textContent = picked.kind === 'board' ? `Cell ${picked.index + 1} · row ${Math.floor(picked.index / 5) + 1}, column ${picked.index % 5 + 1}` : `Next stack ${picked.index + 1}`;
    const blocks = S.blocks(stack);
    if (!blocks.length) { const empty = document.createElement('div'); empty.className = 'empty-label'; empty.textContent = 'Empty. Add a top layer to begin.'; list.append(empty); }
    blocks.forEach((block, i) => {
      const row = document.createElement('div'); row.className = 'layer'; row.style.setProperty('--brand-color', S.COLORS[block.brand]);
      const dot = document.createElement('span'); dot.className = 'color-dot';
      const name = document.createElement('span'); name.className = 'layer-name'; name.textContent = `${S.NAMES[block.brand]} × ${block.count}`;
      const tag = document.createElement('span'); tag.className = 'layer-tag'; tag.textContent = i === blocks.length - 1 ? 'TOP' : i === 0 ? 'BASE' : '';
      row.append(dot, name, tag);
      const change = action => {
        if (G.status().busy) return; const copy = S.clone(blocks); action(copy); applyStack(copy.flatMap(b => Array(b.count).fill(b.brand)));
      };
      const up = document.createElement('button'); up.textContent = '↑'; up.title = 'Move layer toward the top'; up.setAttribute('aria-label', `Move ${S.NAMES[block.brand]} layer toward the top`); up.disabled = i === blocks.length - 1;
      up.addEventListener('click', () => change(copy => { [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]]; }));
      const down = document.createElement('button'); down.textContent = '↓'; down.title = 'Move layer toward the bottom'; down.setAttribute('aria-label', `Move ${S.NAMES[block.brand]} layer toward the bottom`); down.disabled = i === 0;
      down.addEventListener('click', () => change(copy => { [copy[i], copy[i - 1]] = [copy[i - 1], copy[i]]; }));
      const remove = document.createElement('button'); remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${S.NAMES[block.brand]} layer`); remove.addEventListener('click', () => change(copy => copy.splice(i, 1)));
      row.append(down, up, remove); list.append(row);
    });
  }
  function applyStack(stack) {
    safely(() => {
      if (G.status().busy) return; S.validateStacks([stack], 1); remember(); const pick = G.status().picked;
      G.editStack(pick.kind, pick.index, stack); keep(); layers(); refresh(); status('Stack updated. Your scene is ready to save.');
    });
  }
  async function play(repeat = false) {
    try {
      if (G.status().busy && !repeat) return;
      if (repeat || !G.status().editing) { G.loadScene(template); }
      else keep();
      const move = template.move; if (!move) throw new Error('Set a trigger Next stack and an empty target cell first.');
      G.preparePlay(); refresh(); status('Rolling. Real merges and real clears.');
      const done = await G.place(move.slot, move.index);
      if (done) status(`${G.status().chainCount} chain reactions. Score ${G.snapshot().score.toLocaleString('en-US')}. Repeat for the same take.`);
      refresh();
    } catch (error) { status(error.message, true); }
  }
  function capture(value) {
    document.body.classList.toggle('capture-mode', value);
    document.body.classList.toggle('portrait-mode', value && $('#capture-format').value === 'portrait');
    document.body.classList.toggle('board-capture', value && $('#capture-format').value === 'board');
    $('#capture-exit').hidden = !value; G.resize();
  }
  function library() {
    const records = P.read(SAVES_KEY, []);
    return Array.isArray(records) ? records.slice(0, 30).filter(record => { try { S.validate(record); return true; } catch { return false; } }) : [];
  }
  function savedOptions() {
    const select = $('#saved-scenes'); select.replaceChildren(); const records = library();
    if (!records.length) { const option = document.createElement('option'); option.value = ''; option.textContent = 'No saved scenes yet'; select.append(option); }
    records.forEach((scene, i) => { const option = document.createElement('option'); option.value = i; option.textContent = scene.name; select.append(option); });
    $('#load-saved').disabled = !records.length;
  }
  function sceneForSaving() { if (G.status().editing) keep(); const { speed, multiplier } = G.status(); return S.validate({ ...template, name: currentName(), playback: { speed, multiplier } }); }
  $('#generate').addEventListener('click', () => safely(() => {
    const value = Number($('#scene-seed').value); if (!Number.isInteger(value) || value < 0 || value > 0xFFFFFFFF) throw new Error('Seed must be between 0 and 4294967295.');
    load(S.preset($('#preset').value, value));
  }));
  $('#empty-scene').addEventListener('click', () => load({ version: 1, name: 'Untitled scene', seed: 2026, score: 0, elapsed: 0, board: Array.from({ length: 30 }, () => []), tray: [[], [], []], move: null }));
  $('#play-scene').addEventListener('click', () => play()); $('#repeat-scene').addEventListener('click', () => play(true));
  $('#rewind-scene').addEventListener('click', () => load(template, false));
  $('#pause-scene').addEventListener('click', () => { G.pause(!G.status().paused); refresh(); });
  $('#scene-speed').addEventListener('change', event => G.setSpeed(Number(event.target.value)));
  $('#super-score').addEventListener('change', event => { G.setMultiplier(event.target.checked ? 10 : 1); status(event.target.checked ? 'Super Score on. This take awards 10× scene points.' : 'Real score on. 10 points per cleared cap.'); });
  $('#studio-sound').checked = P.read(P.OPTIONS_KEY, {}).sound !== false;
  $('#studio-sound').addEventListener('change', event => G.setSound(event.target.checked));
  $('#scene-score').addEventListener('change', () => safely(() => {
    const value = Number($('#scene-score').value); if (!Number.isInteger(value) || value < 0 || value > 1e9) throw new Error('Use a score between 0 and 1,000,000,000.');
    if (!G.status().editing) G.loadScene(template); remember(); G.setScore(value); keep(); refresh();
  }));
  $('#edit-mode').addEventListener('change', event => { G.setEditing(event.target.checked); if (event.target.checked) { keep(); layers(); } });
  $('#add-layer').addEventListener('click', () => safely(() => {
    const count = Number($('#layer-count').value), brand = Number($('#layer-brand').value), picked = G.status().picked;
    if (!Number.isInteger(count) || count < 1 || count > 25) throw new Error('Choose between 1 and 25 caps.');
    const stack = G.snapshot()[picked.kind === 'board' ? 'board' : 'tray'][picked.index]; applyStack([...stack, ...Array(count).fill(brand)]);
  }));
  $('#clear-stack').addEventListener('click', () => applyStack([]));
  $('#copy-stack').addEventListener('click', () => { const picked = G.status().picked; copiedStack = G.snapshot()[picked.kind === 'board' ? 'board' : 'tray'][picked.index]; status('Stack copied. Pick another cell or Next slot to paste.'); });
  $('#paste-stack').addEventListener('click', () => { if (copiedStack) applyStack(copiedStack); else status('Copy a stack first.', true); });
  $('#undo-edit').addEventListener('click', () => { if (undo.length) load(undo.pop(), false); });
  $('#set-trigger').addEventListener('click', () => safely(() => {
    const move = { slot: Number($('#trigger-slot').value), index: Number($('#trigger-cell').value) - 1 }, snapshot = G.snapshot();
    S.validate({ ...template, board: snapshot.board, tray: snapshot.tray, move }); remember(); G.setMove(move); keep(); refresh(); status(`Trigger ready: Next ${move.slot + 1} → cell ${move.index + 1}.`);
  }));
  $('#clean-capture').addEventListener('click', () => capture(true));
  $('#capture-play').addEventListener('click', () => { capture(true); play(true); });
  $('#capture-exit').addEventListener('click', () => capture(false));
  $('#save-scene').addEventListener('click', () => safely(() => {
    const scene = sceneForSaving(), records = library().filter(record => record.name !== scene.name); records.unshift(scene);
    if (!P.write(SAVES_KEY, records.slice(0, 30))) throw new Error('Browser storage is unavailable. Download JSON to keep this scene.');
    savedOptions(); status('Scene saved in this browser. Download JSON for a portable copy.');
  }));
  $('#load-saved').addEventListener('click', () => safely(() => { const scene = library()[Number($('#saved-scenes').value)]; if (scene) load(scene); }));
  $('#export-scene').addEventListener('click', () => safely(() => {
    const scene = sceneForSaving(), blob = new Blob([JSON.stringify(scene, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = (scene.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cap-scene') + '.json';
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); status('Scene exported. Import this JSON to replay it anywhere.');
  }));
  $('#copy-link').addEventListener('click', async () => {
    try {
      const scene = sceneForSaving(), url = new URL(location.href); url.search = '?creator=1'; url.hash = `scene=${S.encode(scene)}`;
      if (url.href.length > 24000) throw new Error('This scene is too large for a link. Download JSON instead.');
      await navigator.clipboard.writeText(url.href); status('Scene link copied. It includes the complete board and trigger.');
    } catch (error) { status(error.message || 'Copy failed. Export JSON instead.', true); }
  });
  $('#import-json').addEventListener('click', () => safely(() => { const text = $('#scene-json').value; if (text.length > 100000) throw new Error('Scene JSON is too large.'); load(JSON.parse(text)); }));
  $('#import-file').addEventListener('click', () => $('#scene-file').click());
  $('#scene-file').addEventListener('change', async event => {
    try { const file = event.target.files[0]; if (!file) return; if (file.size > 100000) throw new Error('Scene file is too large.'); load(JSON.parse(await file.text())); }
    catch (error) { status(error.message, true); } finally { event.target.value = ''; }
  });
  G.on(event => { refresh(); if (['pick', 'load', 'reset'].includes(event)) layers(); if (event === 'escape') capture(false); });
  savedOptions();
  try {
    const hash = new URLSearchParams(location.hash.slice(1)), encoded = hash.get('scene');
    load(encoded ? S.decode(encoded) : S.preset('cascade', 2026));
  } catch (error) { load(S.preset('cascade', 2026)); status(`Could not load scene: ${error.message}`, true); }
})();
