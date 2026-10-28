/* =========================================================
   SCREENS
   ========================================================= */
function setScreen(html, clear) {
  const s = $('#screen'); s.innerHTML = html; s.classList.toggle('hidden', !html); s.classList.toggle('clear', !!clear);
  s.scrollTop = 0;
}
function starStr(n) { return '★'.repeat(n) + '☆'.repeat(3 - n); }
function levelUnlocked(n) { return SAVE.allUnlocked || n <= SAVE.maxLevel; }
const CONTROLS_HINT = isTouch
  ? 'Controls: drag the <b>joystick</b> to move • <b>⤒</b> jump • <b>✋</b> talk • swipe the screen to turn the camera'
  : 'Controls: <kbd>W A S D</kbd> / arrows move • <kbd>Space</kbd> jump • <kbd>E</kbd> talk • drag the mouse to turn the camera • scroll to zoom';

function titleScreen() {
  G.state = 'title';
  $('#hud').classList.add('hidden'); $('#touch').classList.add('hidden'); $('#prompt').classList.add('hidden'); $('#qwrap').classList.add('hidden');
  if (!G.L || G.level !== 1) { buildLevel(1); }
  const lv = n => { const i = LEVEL_INFO[n], s = SAVE.levels[n]; return `<button class="lvl-card l${n} ${levelUnlocked(n) ? '' : 'locked'}" data-lv="${n}">
    <div class="stars">${s ? starStr(s.stars) : ''}</div><div class="ln">Level ${n}</div><div class="lt">${i.name}</div><div class="ld">${i.icon} ${i.skill}<br>Reward: ${i.crystal}</div></button>`; };
  setScreen(`<div class="card">
    <h1 class="logo">Haunted Quest</h1>
    <div class="sub-logo">Embedded Questions</div>
    <p class="tagline">Ask it right • Say it right • Write it right — a Halloween magic adventure</p>
    <div class="row name-row">
      <label class="field">Name / nickname<input id="inName" maxlength="30" value="${esc(SAVE.name)}" placeholder="e.g. Mind" autocomplete="off"></label>
      <label class="field f-cls">Class<input id="inCls" maxlength="8" value="${esc(SAVE.cls)}" placeholder="M.5/1" autocomplete="off"></label>
      <label class="field f-no">No.<input id="inNo" maxlength="4" value="${esc(SAVE.no)}" placeholder="12" inputmode="numeric" autocomplete="off"></label>
    </div>
    <div class="menu-grid">${lv(1)}${lv(2)}${lv(3)}</div>
    <div class="row start-row" style="margin-top:14px;align-items:center">
      <button class="btn" id="btnStart" style="flex:2">🎃 Start the Adventure!</button>
      <label class="ai-toggle"><input type="checkbox" id="chkAI" ${G.useAI ? 'checked' : ''}> 🔮 Let AI create new questions every time</label>
    </div>
    <div class="row menu-row" style="margin-top:10px">
      <button class="btn purple small" id="btnWard">🧙 Outfits & Pets</button>
      <button class="btn blue small" id="btnRules2">📖 The 3 Magic Rules</button>
      <button class="btn ghost small" id="btnMy">📊 My Progress</button>
      <button class="btn ghost small hidden" id="btnTeacher">👩‍🏫 Teacher Dashboard</button>
    </div>
    <div class="feature-row">
      <div class="feature"><b>🎮</b>3D adventure: run, jump and dodge traps</div>
      <div class="feature"><b>🎤</b>Real speaking with a microphone + model audio</div>
      <div class="feature"><b>⌨️</b>Real typing: spelling and sentence building</div>
      <div class="feature"><b>🏆</b>Combos, coins, stars and level badges</div>
    </div>
    <p class="hint-line" style="text-align:center;margin:10px 0 0">${CONTROLS_HINT}</p>
  </div>`);
  const saveInfo = () => { SAVE.name = $('#inName').value.trim(); SAVE.cls = $('#inCls').value.trim(); SAVE.no = $('#inNo').value.trim(); persist(); };
  const go = n => {
    saveInfo(); ac();
    if (!SAVE.name) { $('#inName').focus(); $('#inName').style.borderColor = '#ff4d6d'; toast('✏️ Please enter your name first'); return; }
    if (!levelUnlocked(n)) { toast(`🔒 Finish Level ${n - 1} first`); return; }
    SFX.click(); introScreen(n);
  };
  document.querySelectorAll('.lvl-card').forEach(b => b.onclick = () => go(+b.dataset.lv));
  $('#btnStart').onclick = () => go(Math.min(SAVE.maxLevel, [1, 2, 3].find(n => !SAVE.levels[n]) || 1));
  $('#chkAI').onchange = e => { G.useAI = e.target.checked; SAVE.useAI = G.useAI; persist(); };
  $('#btnWard').onclick = () => { saveInfo(); wardrobeScreen(); };
  $('#btnRules2').onclick = () => rulesScreen(titleScreen);
  $('#btnMy').onclick = () => { saveInfo(); myResultsScreen(); };
  getCap('user').then(u => { try { if (u && u.isOwner && u.isOwner()) $('#btnTeacher') && $('#btnTeacher').classList.remove('hidden'); } catch (e) { } });
  $('#btnTeacher').onclick = teacherScreen;
}

function introScreen(n) {
  G.state = 'intro';
  if (G.level !== n || !G.L || G.L.used) buildLevel(n);
  G.L.used = true;
  const i = LEVEL_INFO[n];
  const tips = {
    1: '🎤 Answer by speaking into the microphone (if the mic is not available, type your answer or use your keyboard’s dictation button).<br>🔊 Replay the model audio as often as you like • 🐢 slow audio',
    2: '⌨️ Type the words and sentences yourself. The game checks <b>spelling, capital letters and the end mark ? / .</b><br>🔐 Every 2 correct answers open 1 gate',
    3: '🧪 Choose correct answers to add ingredients to the cauldron.<br>🧙‍♀️ Talk politely to the Guardian Witch using embedded questions'
  }[n];
  const traps = {
    1: '🎃 Rolling pumpkins (jump over them) • 👻 Purple red-eyed ghosts (walk around them)',
    2: '🗡️ Swinging axes (watch the timing) • ⚠️ Spikes (when the floor flashes red they are coming up — jump or wait)',
    3: '🔥 Fire pillars (a flashing ring means fire is coming) • 📕 Flying books (jump over them)'
  }[n];
  setScreen(`<div class="card ${i.css}" style="max-width:640px">
    <h2>Level ${n}: ${i.name}</h2>
    <p style="margin:0 0 6px;color:#ffe1a8"><b>${i.icon} ${i.skill}</b></p>
    <div class="rule">🎯 <b>Mission:</b> ${i.mission}</div>
    <div class="rule">💡 ${tips}</div>
    <div class="rule">⚠️ <b>Traps:</b> ${traps}</div>
    <div class="rule">🏆 <b>Reward:</b> ${i.crystal}${n === 3 ? ' + the Halloween Master badge' : ''} • Answer correctly in a row for <b>Combo x2, x3</b></div>
    <p class="hint-line">${CONTROLS_HINT}</p>
    <div class="row" style="margin-top:12px"><button class="btn ghost" id="bBack">← Back</button><button class="btn blue" id="bRule">📖 Rules</button><button class="btn" id="bGo" style="flex:2">Start Level! ▶</button></div>
  </div>`, true);
  $('#bBack').onclick = () => { G.L.used = true; titleScreen(); };
  $('#bRule').onclick = () => rulesScreen(() => introScreen(n));
  $('#bGo').onclick = () => { SFX.click(); beginLevel(n); };
}

function rulesScreen(back) {
  const prevState = G.state; if (G.state === 'play') G.state = 'paused';
  setScreen(`<div class="card" style="max-width:720px">
    <button class="close-x" id="rx">✕</button>
    <h2>📖 The Spell Book: Embedded Questions</h2>
    <p style="margin-top:0">An embedded question is <b>a question inside another sentence</b>, for example after <i>Do you know…, Could you tell me…, I wonder…, I don't know…</i> — so be extra careful with word order.</p>
    <div class="rule"><b>Rule 1: Use statement word order</b> (subject + verb) and drop do / does / did<br>
      <span class="ok">✔ Could you tell me where he lives?</span><br><span class="no">✘ Could you tell me where does he live?</span></div>
    <div class="rule"><b>Rule 2: Choose the Wh-word that matches the meaning</b><br>
      <span class="ok">I wonder where she went.</span> (place) • <span class="ok">Do you know why he is crying?</span> (reason)<br>
      <small>where = place • why = reason • what = thing • when = time • how = way • who = person • which = choice • whose = owner</small></div>
    <div class="rule"><b>Rule 3: Use if / whether for yes/no questions</b><br>
      <span class="ok">I don't know if she is coming.</span><br><span class="ok">Could you tell me whether he passed the exam?</span></div>
    <div class="rule"><b>Punctuation tip</b> — look at the main sentence: <i>Do you know / Could you tell me …</i> → ends with <b>?</b> • <i>I wonder / I don't know / I'm not sure …</i> → ends with <b>.</b></div>
    <div class="rule"><b>Change the verb for the tense:</b> Where <u>did</u> she <u>go</u>? → where she <b>went</b> • What <u>does</u> it <u>mean</u>? → what it <b>means</b> • Is she coming? → if she <b>is</b> coming</div>
    <div class="row" style="margin-top:10px"><button class="btn" id="rOk">Got it! ✨</button></div>
  </div>`);
  const done = () => { if (prevState === 'play') { setScreen(''); G.state = 'play'; } else (back || titleScreen)(); };
  $('#rx').onclick = done; $('#rOk').onclick = done;
}

function pauseMenu() {
  G.state = 'paused'; $('#prompt').classList.add('hidden');
  setScreen(`<div class="card" style="max-width:420px;text-align:center">
    <h2>⏸ Paused</h2>
    <div style="display:grid;gap:10px">
      <button class="btn" id="pRes">▶ Resume</button>
      <button class="btn blue" id="pRule">📖 Magic Rules</button>
      <button class="btn purple" id="pRe">🔄 Restart Level (new questions)</button>
      <button class="btn ghost" id="pHome">🏠 Main Menu</button>
    </div></div>`);
  $('#pRes').onclick = () => { setScreen(''); G.state = 'play'; P.invuln = 1; };
  $('#pRule').onclick = () => rulesScreen(pauseMenu);
  $('#pRe').onclick = () => { G.L.used = true; introScreen(G.level); };
  $('#pHome').onclick = () => { G.L.used = true; titleScreen(); };
}

function showLevelResult() {
  G.state = 'result'; $('#prompt').classList.add('hidden');
  const r = G.lastResult, i = LEVEL_INFO[r.n], sec = Math.round((performance.now() - G.timeStart) / 1000);
  setScreen(`<div class="card ${i.css}" style="max-width:560px;text-align:center">
    <h2>🎉 Level ${r.n} Complete!</h2>
    <div class="stars-big" style="color:#ffc83d">${starStr(r.stars)}</div>
    <p style="font-size:18px;margin:4px 0">You earned the <b>💎 ${i.crystal}</b></p>
    <div class="meter">
      <div><div class="lbl">Score</div><div class="val">⭐ ${G.score}</div><div class="hint-line">includes heart bonus +${r.lifeBonus}</div></div>
      <div><div class="lbl">Correct on first try</div><div class="val">${G.firstTry}/${G.tasks.length}</div><div class="hint-line">Best combo x${Math.min(3, Math.max(1, G.bestStreak))} (${G.bestStreak} in a row)</div></div>
      <div><div class="lbl">Coins this round</div><div class="val">🪙 ${G.coinsRun}</div></div>
      <div><div class="lbl">Time</div><div class="val">⏱ ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}</div></div>
    </div>
    <p class="hint-line">${G.src === 'ai' ? '🔮 This round’s questions were created by AI' : '📜 This round’s questions came from the spell book'}${cloudState === 'ok' ? ' • ☁️ Score saved online' : ' • 💾 Saved on this device'}</p>
    <div class="row" style="margin-top:8px">
      <button class="btn ghost" id="rHome">🏠 Menu</button>
      <button class="btn purple" id="rAgain">🔄 Play Again</button>
      ${r.n < 3 ? '<button class="btn" id="rNext" style="flex:1.6">Next Level ➜</button>' : ''}
    </div></div>`);
  $('#rHome').onclick = () => { G.L.used = true; titleScreen(); };
  $('#rAgain').onclick = () => { G.L.used = true; introScreen(r.n); };
  if ($('#rNext')) $('#rNext').onclick = () => { G.L.used = true; introScreen(r.n + 1); };
}

function finale() {
  G.state = 'final'; $('#prompt').classList.add('hidden');
  if (!SAVE.badges.includes('Halloween Master')) SAVE.badges.push('Halloween Master');
  ['robe_gold', 'pet_owl'].forEach(k => !SAVE.unlocked.includes(k) && SAVE.unlocked.push(k));
  persist(); syncCloud();
  SFX.gem(); setTimeout(SFX.correct, 600);
  for (let k = 0; k < 5; k++) setTimeout(() => burst(P.pos.clone().add(new V3(rand(-2, 2), 2 + rand(0, 2), rand(-2, 2))), pick([0x4be1ff, 0xb26bff, 0xff9a2e, 0xffd94a]), 90, 6), k * 350);
  P.anim = { mode: 'celebrate', timer: 4 };
  const s = summaryObj();
  setScreen(`<div class="card orange" style="max-width:620px">
    <div class="cert">
      <div style="font-size:46px">🏆🎃🧙‍♀️</div>
      <h2 style="font-size:34px;margin:4px 0">HALLOWEEN MASTER</h2>
      <p style="margin:2px 0">This badge is proudly awarded to</p>
      <p style="font-size:28px;font-weight:700;margin:4px 0;color:#fff">${esc(SAVE.name || 'Witch Apprentice')}</p>
      <p style="margin:2px 0">${esc(SAVE.cls ? 'Class ' + SAVE.cls : '')} ${esc(SAVE.no ? '• No. ' + SAVE.no : '')}</p>
      <p>for collecting all 3 Magic Question Gems 💎💎💎 and freeing the castle from the curse!</p>
      <div class="meter">
        <div><div class="lbl">Total score (best of each level)</div><div class="val">⭐ ${s.total}</div></div>
        <div><div class="lbl">Total stars</div><div class="val">${s.stars}/9</div></div>
      </div>
      <p class="hint-line">🎁 Unlocked: the <b>Halloween Master</b> outfit and the <b>Wise Owl 🦉</b> pet!</p>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn blue" id="fCopy">📋 Copy My Results (for the teacher)</button>
      <button class="btn purple" id="fWard">🧙 Try the New Outfit</button>
      <button class="btn" id="fHome">🏠 Main Menu</button>
    </div></div>`);
  $('#fCopy').onclick = () => copyText(resultText());
  $('#fWard').onclick = () => { G.L.used = true; wardrobeScreen(); };
  $('#fHome').onclick = () => { G.L.used = true; titleScreen(); };
}

function copyText(txt) {
  const done = () => toast('📋 Copied! Paste it to your teacher in LINE / Google Classroom', 3000);
  try { navigator.clipboard.writeText(txt).then(done, () => fallbackCopy(txt)); } catch (e) { fallbackCopy(txt); }
}
function fallbackCopy(txt) {
  setScreen(`<div class="card" style="max-width:600px"><h2>📋 Copy this text</h2><textarea id="cpTxt" style="width:100%;height:240px;font-size:14px;border-radius:12px;padding:10px" readonly>${esc(txt)}</textarea><div class="row" style="margin-top:8px"><button class="btn" id="cpOk">Close</button></div></div>`);
  const ta = $('#cpTxt'); ta.focus(); ta.select();
  $('#cpOk').onclick = titleScreen;
}

function wardrobeScreen() {
  G.state = 'title';
  const item = (key, o, kind) => {
    const owned = SAVE.unlocked.includes(key), on = (kind === 'robe' ? SAVE.outfit : SAVE.pet) === key;
    const lock = o.badge && !owned ? `🏅 Unlocks with the ${o.badge} badge` : (!owned ? `🪙 ${o.cost}` : (on ? 'Wearing ✓' : 'Tap to use'));
    const vis = kind === 'robe' ? `<div class="swatch" style="background:linear-gradient(135deg,#${o.robe.toString(16).padStart(6, '0')} 60%,#${o.hat.toString(16).padStart(6, '0')} 60%)"></div>` : `<div style="font-size:40px">${o.icon}</div>`;
    return `<button class="shop-item ${on ? 'on' : ''}" data-k="${key}" data-kind="${kind}">${vis}<div><b>${o.name}</b></div><div class="hint-line">${lock}</div></button>`;
  };
  setScreen(`<div class="card purple" style="max-width:720px">
    <button class="close-x" id="wx">✕</button>
    <h2>🧙 Outfits & Pets</h2>
    <p style="margin-top:0">Your coins: <b>🪙 ${SAVE.coins}</b> — collect coins in the levels and answer correctly for bonuses (combos give more!)</p>
    <h3>Robes</h3><div class="shop">${Object.entries(OUTFITS).map(([k, o]) => item(k, o, 'robe')).join('')}</div>
    <h3>Pets</h3><div class="shop">${Object.entries(PETS).map(([k, o]) => item(k, o, 'pet')).join('')}</div>
  </div>`);
  $('#wx').onclick = titleScreen;
  document.querySelectorAll('.shop-item').forEach(b => b.onclick = () => {
    const k = b.dataset.k, kind = b.dataset.kind, o = kind === 'robe' ? OUTFITS[k] : PETS[k];
    if (!SAVE.unlocked.includes(k)) {
      if (o.badge) { toast(`🏅 You need the ${o.badge} badge first`); return; }
      if (SAVE.coins < o.cost) { toast(`🪙 Not enough coins (you need ${o.cost})`); SFX.wrong(); return; }
      SAVE.coins -= o.cost; SAVE.unlocked.push(k); SFX.gem(); toast(`🎉 Unlocked ${o.name}!`);
    }
    if (kind === 'robe') { SAVE.outfit = k; setOutfit(witch, k); }
    else { scene.remove(petObj.g); setPet(k); scene.add(petObj.g); petObj.g.position.copy(P.pos); }
    persist(); SFX.click(); wardrobeScreen();
  });
}

function myResultsScreen() {
  const s = summaryObj();
  const row = n => { const l = SAVE.levels[n], i = LEVEL_INFO[n]; return `<tr><td>Level ${n}<br><small>${i.skill}</small></td><td>${l ? l.best : '-'}</td><td>${l ? starStr(l.stars) : '-'}</td><td>${l ? l.plays : 0}</td></tr>`; };
  setScreen(`<div class="card blue" style="max-width:680px">
    <button class="close-x" id="mx">✕</button>
    <h2>📊 ${esc(SAVE.name ? SAVE.name + '’s' : 'My')} Progress</h2>
    <div style="overflow:auto"><table class="t"><tr><th>Level</th><th>Best score</th><th>Stars</th><th>Plays</th></tr>${row(1)}${row(2)}${row(3)}</table></div>
    <div class="meter">
      <div><div class="lbl">🎤 Spoken sentence accuracy</div><div class="val">${s.speakAcc}%</div><div class="bar"><i style="width:${s.speakAcc}%"></i></div></div>
      <div><div class="lbl">🗣️ Pronunciation (estimate)</div><div class="val">${s.pronEst != null ? s.pronEst + '/5' : '—'}</div><div class="hint-line">Estimated from the speech recognizer’s confidence</div></div>
      <div><div class="lbl">👂 Listening (correct on first try)</div><div class="val">${s.listening}%</div><div class="bar"><i style="width:${s.listening}%"></i></div></div>
      <div><div class="lbl">⌨️ Spelling & writing</div><div class="val">${s.spelling}%</div><div class="bar"><i style="width:${s.spelling}%"></i></div></div>
      <div><div class="lbl">🧪 Grammar</div><div class="val">${s.grammar}%</div><div class="bar"><i style="width:${s.grammar}%"></i></div></div>
      <div><div class="lbl">🏅 Badges</div><div style="font-size:14px">${s.badges.join(' • ') || '-'}</div></div>
    </div>
    <h3>What to practise next (number of mistakes)</h3>
    <p style="margin:0">Word order (Rule 1): <b>${s.err.order}</b> • Wh-word (Rule 2): <b>${s.err.wh}</b> • if/whether (Rule 3): <b>${s.err.ifw}</b><br>Capital letters: <b>${s.err.caps}</b> • End mark ? / .: <b>${s.err.punct}</b> • Spelling: <b>${s.err.spell}</b></p>
    <div class="row" style="margin-top:12px"><button class="btn blue" id="mCopy">📋 Copy My Results (for the teacher)</button><button class="btn ghost" id="mReset">🗑 Clear data on this device</button></div>
    <p class="hint-line">Progress is saved in this browser${cloudState === 'ok' ? ' and in the game database ☁️' : ''} • Copy your results and send them to your teacher any way you like.</p>
  </div>`);
  $('#mx').onclick = titleScreen;
  $('#mCopy').onclick = () => copyText(resultText());
  $('#mReset').onclick = () => {
    const b = $('#mReset'); if (b.dataset.c) { const nm = { name: SAVE.name, cls: SAVE.cls, no: SAVE.no }; SAVE = Object.assign(newSave(), nm); persist(); setOutfit(witch, SAVE.outfit); toast('Data cleared'); titleScreen(); }
    else { b.dataset.c = 1; b.textContent = '⚠️ Tap again to confirm'; }
  };
}

async function teacherScreen() {
  setScreen(`<div class="card" style="max-width:900px"><button class="close-x" id="tx">✕</button><h2>👩‍🏫 Teacher Dashboard</h2><p id="tBody">Loading...</p></div>`);
  $('#tx').onclick = titleScreen;
  const db = await getCap('db');
  if (!db) { $('#tBody').innerHTML = 'The database is not available in this view.'; return; }
  try {
    const snap = await db.collection('scores').limit(500).get();
    const rows = snap.docs.map(d => d.data()).filter(Boolean).sort((a, b) => (String(a.cls).localeCompare(String(b.cls))) || ((+a.no || 0) - (+b.no || 0)));
    if (!rows.length) { $('#tBody').innerHTML = 'No results in the database yet. (Students who cannot save online can tap “Copy My Results” and send them to you.)'; return; }
    const topErr = e => { if (!e) return '-'; const names = { order: 'Word order', wh: 'Wh-word', ifw: 'if/whether', caps: 'Capitals', punct: 'Punctuation', spell: 'Spelling' }; const k = Object.keys(names).sort((a, b) => (e[b] || 0) - (e[a] || 0))[0]; return e[k] ? `${names[k]} (${e[k]})` : '-'; };
    const lv = (r, n) => r.levels && r.levels[n] ? `${r.levels[n].best} ${'★'.repeat(r.levels[n].stars)}` : '-';
    $('#tBody').outerHTML = `<div style="overflow:auto"><table class="t"><tr><th>Class</th><th>No.</th><th>Name</th><th>Total</th><th>L1</th><th>L2</th><th>L3</th><th>Speaking %</th><th>Pron.</th><th>Spelling %</th><th>Grammar %</th><th>Needs practice</th></tr>
      ${rows.map(r => `<tr><td>${esc(r.cls || '')}</td><td>${esc(r.no || '')}</td><td>${esc(r.name || '')}</td><td>${r.total || 0}</td><td>${lv(r, 1)}</td><td>${lv(r, 2)}</td><td>${lv(r, 3)}</td><td>${r.speakAcc || 0}</td><td>${r.pronEst ?? '-'}</td><td>${r.spelling || 0}</td><td>${r.grammar || 0}</td><td>${topErr(r.err)}</td></tr>`).join('')}</table></div>
      <div class="row" style="margin-top:10px"><button class="btn blue" id="tCsv">📋 Copy as CSV (paste into Excel / Sheets)</button></div>`;
    $('#tCsv').onclick = () => copyText(['class,no,name,total,L1,L2,L3,speak_acc,pron_est,spelling,grammar,err_order,err_wh,err_ifw,err_caps,err_punct,err_spell']
      .concat(rows.map(r => [r.cls, r.no, r.name, r.total, r.levels?.[1]?.best ?? '', r.levels?.[2]?.best ?? '', r.levels?.[3]?.best ?? '', r.speakAcc, r.pronEst ?? '', r.spelling, r.grammar, r.err?.order, r.err?.wh, r.err?.ifw, r.err?.caps, r.err?.punct, r.err?.spell].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))).join('\n'));
  } catch (e) { $('#tBody').innerHTML = 'Could not load data: ' + esc(e.code || e.message || e); }
}
