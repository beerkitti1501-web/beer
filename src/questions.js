/* =========================================================
   QUESTION PANELS (the learning core)
   ========================================================= */
let Q = null; // {s, task}
const SKILL_OF = { speak: 'listen', blank: 'spell', type: 'spell', order: 'spell', mcq: 'gram', fix: 'gram', dialog: 'gram' };

function openQuestion(s) {
  G.state = 'question'; $('#prompt').classList.add('hidden');
  Q = { s, task: s.task };
  $('#qwrap').classList.remove('hidden');
  renderQuestion();
  const tk = s.task;
  if (tk.type === 'speak') playModel();
  if (tk.type === 'dialog') speak(tk.npc, { pitch: .7, rate: .9 });
}
function closeQuestion() {
  if (!Q) return;
  stopListening(); try { speechSynthesis.cancel(); } catch (e) { }
  const s = Q.s, solved = Q.task.solved; Q = null;
  $('#qwrap').classList.add('hidden'); $('#qpanel').innerHTML = '';
  G.state = 'play'; P.invuln = Math.max(P.invuln, 1.2);
  if (solved && !s.solved) stationSolved(s);
  updateHUD();
}
function header(tk) {
  const s = Q.s, i = LEVEL_INFO[G.level], idx = G.tasks.indexOf(tk) + 1;
  const typeName = { speak: tk.mode === 'repeat' ? 'Listen & repeat' : 'Listen → say it as an embedded question', blank: tk.mode === 'dictation' ? 'Listen & spell the missing word' : 'Fill in the blank', type: 'Type the full sentence', order: 'Build the sentence', mcq: 'Choose the right word', fix: 'Fix the word order', dialog: 'Role-play conversation' }[tk.type];
  return `<button class="close-x" id="qClose" title="Leave for now">✕</button>
    <div class="q-head"><div class="q-npc">${s.icon}</div><div class="q-title"><small>Level ${G.level} • Task ${idx}/${G.tasks.length} • ${typeName}</small><b>${esc(s.name)}</b></div></div>
    <div class="q-badges"><span class="badge ${G.src === 'ai' && tk.x.src === 'ai' ? 'ai' : ''}">${G.src === 'ai' && tk.x.src === 'ai' ? '🔮 Created by AI' : '📜 Auto-generated'}</span>
    ${G.streak >= 1 ? `<span class="badge">🔥 ${G.streak} correct in a row</span>` : ''}<span class="badge">Try ${tk.attempts + 1}</span></div>`;
}
function renderQuestion() {
  const tk = Q.task, css = LEVEL_INFO[G.level].css;
  let body = '';
  if (tk.type === 'speak') body = speakBody(tk);
  else if (tk.type === 'blank') body = blankBody(tk);
  else if (tk.type === 'type') body = typeBody(tk);
  else if (tk.type === 'order') body = orderBody(tk);
  else body = choiceBody(tk);
  $('#qpanel').innerHTML = `<div class="card ${css}">${header(tk)}${body}<div id="qfb"></div><div class="q-actions" id="qact"></div></div>`;
  $('#qClose').onclick = closeQuestion;
  bindQuestion(tk);
}

/* ---------- scoring ---------- */
function onCorrect(tk) {
  tk.attempts++; tk.solved = true;
  G.streak++; G.bestStreak = Math.max(G.bestStreak, G.streak);
  const mult = G.streak >= 3 ? 3 : G.streak === 2 ? 2 : 1;
  const base = tk.attempts === 1 ? 100 : tk.attempts === 2 ? 60 : 30;
  const pts = base * mult, coins = 5 + (mult - 1) * 4;
  G.score += pts; SAVE.coins += coins;
  if (tk.attempts === 1) G.firstTry++;
  const sk = SAVE.stats[SKILL_OF[tk.type]];
  if (tk.type !== 'speak' || tk.mode === 'transform') { sk.t++; if (tk.attempts === 1) sk.c++; }
  SFX.correct(); if (mult > 1) { setTimeout(() => { showCombo(mult); SFX.combo(); }, 250); }
  persist(); updateHUD();
  return `<div class="hint-line" style="margin-top:6px">+${pts} points${mult > 1 ? ` (Combo x${mult}!)` : ''} • +${coins} 🪙</div>`;
}
function onWrong(tk, issues) {
  tk.attempts++; G.streak = 0; SFX.wrong();
  (issues || []).forEach(k => { if (SAVE.stats.err[k] != null) SAVE.stats.err[k]++; });
  persist(); updateHUD();
}
function onReveal(tk) {
  tk.solved = true; tk.revealed = true; G.streak = 0;
  const sk = SAVE.stats[SKILL_OF[tk.type]]; if (tk.type !== 'speak' || tk.mode === 'transform') sk.t++;
  persist(); updateHUD();
}
function fb(cls, html) { $('#qfb').innerHTML = `<div class="feedback ${cls}">${html}</div>`; }
function actions(html) { $('#qact').innerHTML = html; }
function continueBtn(label = 'Continue ➜') { actions(`<button class="btn green" id="qNext">${label}</button>`); $('#qNext').onclick = closeQuestion; $('#qNext').focus(); }
function issueHtml(issues, extra = '') { return issues.map(k => ISSUE_TEXT[k] || '').filter(Boolean).join('<br>') + extra; }

/* ---------- SPEAK (Level 1) ---------- */
function playModel(slow) {
  const tk = Q && Q.task; if (!tk) return;
  const txt = tk.mode === 'repeat' ? tk.target : tk.x.d;
  speak(txt, { rate: slow ? .65 : .92, pitch: 1.25 });
}
function askAbout(x) {
  if (x.yn) return 'a <b>yes/no</b> answer';
  const e = x.e.toLowerCase();
  if (e.startsWith('what time')) return 'a <b>time</b>';
  if (e.startsWith('how old')) return 'an <b>age</b>';
  if (e.startsWith('how many') || e.startsWith('how much')) return 'an <b>amount</b>';
  return ({ where: 'a <b>place</b>', why: 'a <b>reason</b>', what: 'a <b>thing</b>', when: 'a <b>time</b>', how: 'a <b>way / method</b>', who: 'a <b>person</b>', which: 'a <b>choice</b>', whose: 'an <b>owner</b>' })[x.wh] || 'information';
}
function speakBody(tk) {
  const say = tk.mode === 'repeat'
    ? `<div class="q-say">👻 “Please help me! Say this sentence with me...”<div class="en">${esc(tk.target)}</div></div>
       <div class="q-instr">🎧 Listen to the model, then tap 🎤 and say the whole sentence clearly.</div>`
    : `<div class="q-say">👻 The ghost asks… <span id="dq" class="en" style="filter:blur(7px);transition:filter .3s">${esc(tk.x.d)}</span><div class="th">(Listen first — tap 👀 if you need to see it.)</div></div>
       <div class="q-instr">🎯 Say this question again as an <b>embedded question</b>, starting with: <b style="color:#fff;font-size:18px">“${esc(tk.frame)} …”</b></div>`;
  const micOK = !!SRClass && !micBlocked;
  return `${say}
    <div class="row btn-row"><button class="btn blue small" id="bPlay">🔊 Model audio</button><button class="btn ghost small" id="bSlow">🐢 Slow</button>${tk.mode === 'transform' ? '<button class="btn ghost small" id="bShow">👀 Show text</button>' : ''}</div>
    <div class="speak-zone">${micOK ? '<button class="mic-btn" id="bMic" title="Tap and speak">🎤</button>' : ''}<div style="flex:1;min-width:200px"><div class="live" id="live">${micOK ? 'Tap 🎤 and speak in English…' : ''}</div></div></div>
    ${micOK ? '' : `<div class="feedback info" id="micNote">🎙️ ${SRClass ? 'The microphone is blocked on this page' : 'This browser does not support speech recognition yet'} — <b>say the sentence out loud</b> and use your <b>keyboard’s microphone button</b> (phone / iPad), <kbd>Win</kbd>+<kbd>H</kbd> (Windows) or press <kbd>fn</kbd> twice (Mac) to turn your voice into text in the box below. For direct microphone checking, open the game from its GitHub Pages link in Chrome, Edge or Safari.</div>`}
    <div class="row input-row" style="margin-top:6px"><input class="type-input" id="spTxt" placeholder="${micOK ? 'Or type / dictate here' : 'Speak (dictate) or type your sentence here'}" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn small" id="bSpCheck">Check ✓</button></div>`;
}
function bindSpeak(tk) {
  $('#bPlay').onclick = () => playModel(false);
  $('#bSlow').onclick = () => playModel(true);
  if ($('#bShow')) $('#bShow').onclick = () => { $('#dq').style.filter = 'none'; };
  const mic = $('#bMic');
  if (mic) mic.onclick = async () => {
    if (mic.classList.contains('rec')) { stopListening(); return; }
    try { speechSynthesis.cancel(); } catch (e) { }
    mic.classList.add('rec'); $('#live').textContent = '🎙️ Listening… speak now';
    try {
      const r = await listenOnce(txt => { $('#live').textContent = '“' + txt + '”'; });
      mic.classList.remove('rec');
      if (!r) { $('#live').textContent = 'I didn’t hear anything. Tap 🎤 and try again.'; return; }
      $('#live').textContent = '“' + r.text + '”';
      evaluateSpeech(tk, r.text, r.conf, r.alts, 'mic');
    } catch (err) {
      mic.classList.remove('rec');
      if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture' || err === 'start-failed') {
        micBlocked = true;
        $('#live').innerHTML = '';
        mic.remove();
        $('#qfb').innerHTML = `<div class="feedback info">🎙️ The microphone can’t be used on this page (${esc(err)}) — say the sentence out loud and use your <b>keyboard’s microphone button</b> / <kbd>Win</kbd>+<kbd>H</kbd> to turn it into text in the box below, then tap “Check”.</div>`;
      } else if (err === 'network') { $('#live').textContent = 'Speech recognition needs an internet connection. Try again or type instead.'; }
      else $('#live').textContent = 'Something went wrong (' + err + '). Please try again.';
    }
  };
  const go = () => { const v = $('#spTxt').value.trim(); if (!v) return; evaluateSpeech(tk, v, null, null, 'text'); };
  $('#bSpCheck').onclick = go; $('#spTxt').onkeydown = e => { if (e.key === 'Enter') go(); };
}
function evaluateSpeech(tk, said, conf, alts, source) {
  if (tk.solved) return;
  // choose the recognition alternative closest to the target (the recognizer is unsure between them)
  let best = { text: said, conf };
  if (alts && alts.length > 1) { let ba = -1; alts.forEach(a => { const acc = alignWords(tk.target, a.text).acc; if (acc > ba) { ba = acc; best = { text: a.text, conf: (a.conf || conf) }; } }); }
  const al = alignWords(tk.target, best.text);
  const dg = diagnose(best.text, tk.x, tk.target);
  const structural = dg.issues.filter(k => k === 'order' || k === 'ifw' || k === 'wh');
  const pass = al.acc >= 80 && structural.length === 0;
  const pron = source === 'mic' && best.conf ? clamp(Math.round(best.conf * 5), 1, 5) : null;
  const st = SAVE.stats.speak; st.n++; st.accSum += al.acc; if (pron) { st.pronSum += pron; st.pronN++; } if (pass) st.pass++;
  const chips = `<div class="words">${al.out.map(o => `<span class="w ${o.k}">${esc(o.w)}</span>`).join('')}</div><div class="hint-line">🟩 correct • 🟥 missing / unclear • 🟨 extra word</div>`;
  const meter = `<div class="meter">
     <div><div class="lbl">📝 Sentence accuracy</div><div class="val">${al.acc}%</div><div class="bar"><i style="width:${al.acc}%"></i></div><div class="hint-line">${structural.length ? '⚠️ Word order / structure is not right yet' : '✔ Embedded question structure is correct'}</div></div>
     <div><div class="lbl">🗣️ Pronunciation (estimate)</div><div class="val">${pron ? '★'.repeat(pron) + '☆'.repeat(5 - pron) : '—'}</div><div class="hint-line">${pron ? 'Estimated from the speech recognizer’s confidence — not an exact pronunciation score' : 'No audio data (checked from text) — keep practising with the model audio'}</div></div></div>`;
  const tips = (source === 'mic' ? al.missed : []).map(w => PRON_TIPS[w.toLowerCase()]).filter(Boolean);
  const tipHtml = tips.length ? `<div style="margin-top:6px">🔈 <b>Words the system didn’t catch — maybe unclear:</b><br>${[...new Set(tips)].slice(0, 3).map(t => '• ' + esc(t)).join('<br>')}</div>` : (source === 'mic' && al.missed.length ? `<div style="margin-top:6px">🔈 Practise saying <b>${al.missed.slice(0, 4).map(esc).join(', ')}</b> more clearly, then try again.</div>` : '');
  if (pass) {
    if (tk.mode === 'transform' && tk.attempts === 0) { /* listening success counted in onCorrect */ }
    const pts = onCorrect(tk);
    fb('good', `🎉 <b>${pick(['Excellent!', 'Great speaking!', 'Perfect!', 'Well done!'])}</b> The ghost understands you!${chips}${meter}${tipHtml}${pts}<div style="margin-top:6px">${ruleFor(tk.x)}</div>`);
    continueBtn('Free the ghost ✨');
  } else {
    onWrong(tk, structural.length ? structural : (al.acc < 80 ? ['other'] : []));
    const msg = structural.length ? issueHtml(structural) : '👻 Some words are missing. Listen to the model again and speak more clearly (you need 80% or more).';
    const reveal = tk.attempts >= 2 ? `<div style="margin-top:8px">💡 <b>Model sentence:</b> <span style="font-size:18px">${esc(tk.target)}</span> <button class="btn blue small" id="bHear">🔊 Listen</button></div>` : '';
    fb('bad', `${msg}${chips}${meter}${tipHtml}${reveal}`);
    if ($('#bHear')) $('#bHear').onclick = () => speak(tk.target, { rate: .8, pitch: 1.2 });
    actions(tk.attempts >= 3 ? `<button class="btn ghost small" id="bSkip">Skip for now (0 points)</button>` : '');
    if ($('#bSkip')) $('#bSkip').onclick = () => { onReveal(tk); closeQuestion(); };
  }
}

/* ---------- BLANK (Level 2) ---------- */
function blankBody(tk) {
  const f = tk.full, i = f.toLowerCase().indexOf(tk.answer.toLowerCase(), tk.frame.length);
  const before = f.slice(0, i), after = f.slice(i + tk.answer.length);
  const len = tk.answer.length;
  const instr = tk.mode === 'dictation'
    ? `🎧 Listen to the sentence, then <b>type the missing word</b> with the correct spelling (${len} letters).`
    : `✍️ Type the missing word. Hint: the hidden question asks for ${askAbout(tk.x)}.`;
  return `<div class="q-say">👻 “Spell it right and the lock will open!”</div>
    <div class="q-instr">${instr}</div>
    <div class="big-sentence">${esc(before)}<input class="blank-input" id="bIn" maxlength="20" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${'_ '.repeat(len).trim()}">${esc(after)}</div>
    <div class="row btn-row"><button class="btn blue small" id="bHearS">🔊 Hear sentence</button>${tk.mode === 'dictation' ? '<button class="btn ghost small" id="bHearW">🔊 Hear the word</button>' : ''}<button class="btn small" id="bChk">Check ✓</button></div>
    <p class="hint-line" id="bHint"></p>`;
}
function bindBlank(tk) {
  $('#bHearS').onclick = () => speak(tk.full, { rate: .85 });
  if ($('#bHearW')) $('#bHearW').onclick = () => speak(tk.answer, { rate: .7 });
  const inp = $('#bIn'); if (!isTouch) setTimeout(() => inp.focus(), 80);
  const go = () => {
    if (tk.solved) return;
    const v = inp.value.trim().toLowerCase(); if (!v) return;
    if (tk.accept.includes(v)) {
      inp.style.borderColor = '#3fd27a'; inp.disabled = true;
      const pts = onCorrect(tk);
      fb('good', `🎉 Correct! <b>${esc(tk.full)}</b>${pts}<div style="margin-top:6px">${tk.mode === 'word' ? ruleFor(tk.x) : `📝 Spelling: <b>${tk.answer.split('').join('-')}</b>`}</div>`);
      speak(tk.full, { rate: .9 }); continueBtn('Unlock 🔓');
    } else {
      const d = Math.min(...tk.accept.map(a => lev(v, a)));
      const near = d <= 2 && v.length > 2;
      const issues = near ? ['spell'] : (tk.mode === 'word' ? [tk.x.yn ? 'ifw' : 'wh'] : ['spell']);
      onWrong(tk, issues);
      inp.style.borderColor = '#ff4d6d';
      let hint = near ? `👻 So close! ${d} letter${d > 1 ? 's are' : ' is'} wrong. Check the spelling again.` : issueHtml(issues);
      if (tk.attempts >= 1) $('#bHint').innerHTML = `💡 Hint: it starts with “<b>${tk.answer[0]}</b>” and has ${tk.answer.length} letters.`;
      if (tk.attempts >= 3) hint += `<br>📖 Answer: <b>${esc(tk.answer)}</b> — type it to continue.`;
      fb('bad', hint);
    }
  };
  $('#bChk').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
}

/* ---------- TYPE SENTENCE (Level 2) ---------- */
function typeBody(tk) {
  return `<div class="q-say">👻 “Write the magic words <i>exactly</i> right — capital letters and punctuation too!”</div>
    <div class="q-instr">✍️ Change this question into an embedded question and <b>type the whole sentence</b> (capital letter + correct end mark).</div>
    <div class="big-sentence" style="font-size:19px">❓ ${esc(tk.x.d)}<br>➜ Start with: <span style="color:#ffc83d">${esc(tk.frame)} …</span></div>
    <input class="type-input" id="tIn" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Type the full sentence here">
    <div class="row btn-row" style="margin-top:8px"><button class="btn small" id="tChk">Check ✓</button></div>`;
}
function bindType(tk) {
  const inp = $('#tIn'); if (!isTouch) setTimeout(() => inp.focus(), 80);
  const go = () => {
    if (tk.solved) return;
    const v = inp.value.trim().replace(/\s+/g, ' ').replace(/[’‘]/g, "'"); if (!v) return;
    const contentOK = canon(v) === canon(tk.target);
    if (contentOK) {
      const capsOK = /^[A-Z]/.test(v) && !/\bi\b/.test(v.replace(/^I\b/, ''));
      const endOK = v.slice(-1) === tk.target.slice(-1);
      if (capsOK && endOK) {
        const pts = onCorrect(tk); inp.disabled = true; inp.style.borderColor = '#3fd27a';
        fb('good', `🎉 Perfect! <b>${esc(v)}</b>${pts}<div style="margin-top:6px">${ruleFor(tk.x)}<br>✒️ ${punctRule(tk.frame)}</div>`);
        continueBtn('Unlock 🔓');
      } else {
        const iss = []; if (!capsOK) iss.push('caps'); if (!endOK) iss.push('punct');
        onWrong(tk, iss);
        fb('bad', `✅ Your word order and spelling are correct! But you still need to fix:<br>${issueHtml(iss)}${!endOK ? `<br>👉 ${punctRule(tk.frame)}` : ''}`);
      }
    } else {
      const dg = diagnose(v, tk.x, tk.target); onWrong(tk, dg.issues);
      let extra = '';
      if (dg.spell && dg.spell.length) extra += `<br>🔤 Check: ${dg.spell.map(([a]) => `<b>“${esc(a)}”</b>`).join(', ')}`;
      if (tk.attempts >= 3) extra += `<br>📖 Answer: <b>${esc(tk.target)}</b> — type it to continue.`;
      else if (tk.attempts >= 2) extra += `<br>💡 Hint: ${esc(tk.frame)} <b>${esc(embed(tk.x, 'if').split(' ').slice(0, 2).join(' '))}</b> …`;
      fb('bad', issueHtml(dg.issues, extra));
    }
  };
  $('#tChk').onclick = go; inp.onkeydown = e => { if (e.key === 'Enter') go(); };
}

/* ---------- ORDER WORDS (Level 2) ---------- */
function orderBody(tk) {
  return `<div class="q-say">👻 “The magic words are all mixed up! Put them in order.”</div>
    <div class="q-instr">🧩 Tap the words to build a correct embedded question sentence. The hidden question asks for ${askAbout(tk.x)}.</div>
    <div class="tiles answer" id="oAns"></div>
    <div class="tiles" id="oPool">${tk.shuffled.map((w, i) => `<button class="tile" data-i="${i}">${esc(w)}</button>`).join('')}</div>
    <div class="row btn-row"><button class="btn ghost small" id="oReset">↺ Reset</button><button class="btn small" id="oChk">Check ✓</button></div>`;
}
function bindOrder(tk) {
  const ans = [];
  const draw = () => {
    $('#oAns').innerHTML = ans.map((i, k) => `<button class="tile ans" data-k="${k}">${esc(tk.shuffled[i])}</button>`).join('');
    document.querySelectorAll('#oPool .tile').forEach(b => b.classList.toggle('used', ans.includes(+b.dataset.i)));
    document.querySelectorAll('#oAns .tile').forEach(b => b.onclick = () => { if (tk.solved) return; ans.splice(+b.dataset.k, 1); SFX.click(); draw(); });
  };
  document.querySelectorAll('#oPool .tile').forEach(b => b.onclick = () => { if (tk.solved) return; const i = +b.dataset.i; if (!ans.includes(i)) { ans.push(i); SFX.click(); draw(); } });
  $('#oReset').onclick = () => { if (tk.solved) return; ans.length = 0; draw(); };
  $('#oChk').onclick = () => {
    if (tk.solved) return;
    if (ans.length < tk.toks.length) { fb('info', '🧩 Use all the words first.'); return; }
    const built = ans.map(i => tk.shuffled[i]).join(' ').replace(/ ([?.])$/, '$1');
    if (built === tk.target) {
      const pts = onCorrect(tk); fb('good', `🎉 Correct! <b>${esc(tk.target)}</b>${pts}<div style="margin-top:6px">${ruleFor(tk.x)}</div>`); speak(tk.target, { rate: .9 }); continueBtn('Unlock 🔓');
    } else {
      const dg = diagnose(built, tk.x, tk.target);
      let iss = dg.issues.filter(k => k !== 'spell');
      if (canon(built) === canon(tk.target)) iss = ['punct'];
      if (!iss.length) iss = ['other'];
      onWrong(tk, iss);
      let extra = '';
      if (tk.attempts >= 2) extra = `<br>💡 Hint: start with “<b>${esc(tk.toks.slice(0, tk.frame.split(' ').length + 1).join(' '))}</b> …”`;
      if (tk.attempts >= 3) extra = `<br>📖 Answer: <b>${esc(tk.target)}</b> — build it to continue.`;
      fb('bad', issueHtml(iss, extra));
    }
  };
  draw();
}

/* ---------- CHOICE (Level 3: mcq, fix, dialog) ---------- */
function choiceBody(tk) {
  let top = '';
  if (tk.type === 'mcq') top = `<div class="q-say">🧪 “Choose the right word to add this ingredient to the potion!”</div>
    <div class="q-instr">🔮 Choose the correct word. Hint: the hidden question asks for ${askAbout(tk.x)}.</div>
    <div class="big-sentence">${esc(tk.blanked).replace('____', '<span style="color:#ffc83d">_____</span>')}</div>`;
  else if (tk.type === 'fix') top = `<div class="q-say">🧪 “This spell is broken! Which sentence fixes it?”</div>
    <div class="big-sentence" style="color:#ff9aab">✘ ${esc(tk.wrong)}</div>
    <div class="q-instr">🛠️ The sentence above has the wrong word order. Which option fixes it best? (Original question: “${esc(tk.x.d)}”)</div>`;
  else top = `<div class="q-say">${Q.s.kind === 'mirror' ? '🪞' : '🧙‍♀️'} <span class="en">“${esc(tk.npc)}”</span> <button class="btn ghost small" id="cHear" style="padding:4px 10px">🔊</button></div>
    <div class="q-instr">💬 You want to ask: <b>“${esc(tk.x.d)}”</b> — choose the sentence that is <b>polite and grammatically correct</b>.</div>`;
  return `${top}<div class="opts">${tk.opts.map((o, i) => `<button class="opt" data-i="${i}">${String.fromCharCode(65 + i)}. ${esc(o)}</button>`).join('')}</div>`;
}
function bindChoice(tk) {
  if ($('#cHear')) $('#cHear').onclick = () => speak(tk.npc, { pitch: .7, rate: .9 });
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (tk.solved) return;
    const o = tk.opts[+b.dataset.i];
    if (o === tk.answer) {
      b.classList.add('right'); document.querySelectorAll('.opt').forEach(x => x.disabled = true);
      const pts = onCorrect(tk);
      let more = '';
      if (tk.type === 'mcq') more = `<b>${esc(tk.full)}</b>`;
      if (tk.type === 'dialog') { more = `${Q.s.kind === 'mirror' ? '🪞' : '🧙‍♀️'} “${esc(tk.reply)}”`; speak(tk.reply, { pitch: .7, rate: .9 }); }
      else speak(tk.type === 'mcq' ? tk.full : tk.answer, { rate: .9 });
      fb('good', `🎉 Correct! ${more}${pts}<div style="margin-top:6px">${ruleFor(tk.x)}${tk.type === 'fix' ? '<br>✒️ ' + punctRule(tk.frame) : ''}</div>`);
      continueBtn(tk.type === 'dialog' ? 'Thank you! ➜' : 'Add the ingredient 🧪');
    } else {
      b.classList.add('wrong'); b.disabled = true;
      let iss;
      if (tk.type === 'mcq') iss = [tk.x.yn ? 'ifw' : 'wh'];
      else if (o.slice(-1) !== tk.answer.slice(-1) && canon(o) === canon(tk.answer)) iss = ['punct'];
      else if (canon(o).includes(canon(tk.x.dl)) || /^tell me/i.test(o)) iss = ['order'];
      else iss = [tk.x.yn ? 'ifw' : 'wh'];
      onWrong(tk, iss);
      let extra = '';
      if (iss[0] === 'punct') extra = `<br>👉 ${punctRule(tk.frame)}`;
      if (/ that /.test(o) && tk.type === 'mcq') extra = '<br>👉 “that” introduces a fact, not a question — use a Wh-word or if / whether.';
      if (/^tell me/i.test(o)) extra += '<br>👉 “Tell me …!” is a command — it isn’t polite, and the word order is wrong.';
      fb('bad', issueHtml(iss, extra));
    }
  });
}

function bindQuestion(tk) {
  if (tk.type === 'speak') bindSpeak(tk);
  else if (tk.type === 'blank') bindBlank(tk);
  else if (tk.type === 'type') bindType(tk);
  else if (tk.type === 'order') bindOrder(tk);
  else bindChoice(tk);
  if (tk.solved) continueBtn();
}

/* =========================================================
   BOOT
   ========================================================= */
function boot() {
  if (!window.THREE) { document.body.innerHTML = '<div style="padding:30px;color:#fff;font-family:sans-serif">Could not load the 3D engine. Please check your internet connection and refresh.</div>'; return; }
  initThree(); createPlayer(); setupPointer();
  $('#btnRules').onclick = () => { if (G.state === 'play') rulesScreen(); };
  $('#btnPause').onclick = () => { if (G.state === 'play') pauseMenu(); };
  $('#btnSound').onclick = () => { muted = !muted; $('#btnSound').textContent = muted ? '🔇' : '🔊'; if (muted) try { speechSynthesis.cancel(); } catch (e) { } };
  document.addEventListener('pointerdown', () => ac(), { once: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play') pauseMenu(); });
  buildLevel(1);
  titleScreen();
  loop();
}
boot();
