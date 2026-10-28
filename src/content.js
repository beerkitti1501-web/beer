'use strict';
/* =========================================================
   UTILITIES
   ========================================================= */
const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}

/* =========================================================
   PLATFORM CAPABILITIES (Claude artifact runtime) — optional
   ========================================================= */
const _caps = {};
function getCap(name) {
  if (!(name in _caps)) {
    try {
      _caps[name] = (window.claude && typeof window.claude.use === 'function')
        ? Promise.resolve(window.claude.use(name)).catch(() => null) : Promise.resolve(null);
    } catch (e) { _caps[name] = Promise.resolve(null); }
  }
  return _caps[name];
}

/* =========================================================
   SAVE DATA (local) + cloud sync
   ========================================================= */
const SAVE_KEY = 'haunted_quest_embedded_v1';
function newSave() {
  return {
    name: '', cls: '', no: '', coins: 0,
    unlocked: ['robe_purple', 'pet_cat'], outfit: 'robe_purple', pet: 'pet_cat',
    levels: {}, maxLevel: 1, badges: [], allUnlocked: false,
    stats: {
      speak: { n: 0, accSum: 0, pronSum: 0, pronN: 0, pass: 0 },
      listen: { c: 0, t: 0 }, spell: { c: 0, t: 0 }, gram: { c: 0, t: 0 },
      err: { order: 0, ifw: 0, wh: 0, caps: 0, punct: 0, spell: 0 }
    },
    history: []
  };
}
function loadSave() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { }
  const base = newSave();
  if (!d) return base;
  const s = Object.assign(base, d);
  s.stats = Object.assign(newSave().stats, d.stats || {});
  for (const k of ['speak', 'listen', 'spell', 'gram', 'err']) s.stats[k] = Object.assign(newSave().stats[k], (d.stats || {})[k] || {});
  return s;
}
let SAVE = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } }

function totalScore() { return Object.values(SAVE.levels).reduce((a, l) => a + (l.best || 0), 0); }
function pct(c, t) { return t ? Math.round(100 * c / t) : 0; }
function summaryObj() {
  const st = SAVE.stats;
  return {
    name: SAVE.name, cls: SAVE.cls, no: SAVE.no, total: totalScore(), coins: SAVE.coins,
    stars: Object.values(SAVE.levels).reduce((a, l) => a + (l.stars || 0), 0),
    levels: SAVE.levels, badges: SAVE.badges,
    speakAcc: st.speak.n ? Math.round(st.speak.accSum / st.speak.n) : 0,
    pronEst: st.speak.pronN ? +(st.speak.pronSum / st.speak.pronN).toFixed(1) : null,
    listening: pct(st.listen.c, st.listen.t), spelling: pct(st.spell.c, st.spell.t), grammar: pct(st.gram.c, st.gram.t),
    err: st.err, updated: Date.now()
  };
}
function resultText() {
  const s = summaryObj();
  const lv = n => { const l = SAVE.levels[n]; return l ? `${l.best} pts ${'★'.repeat(l.stars)}${'☆'.repeat(3 - l.stars)}` : 'not passed yet'; };
  return [
    `🎃 Haunted Quest — Embedded Questions`,
    `Name: ${s.name || '-'}  Class: ${s.cls || '-'}  No.: ${s.no || '-'}`,
    `Total score: ${s.total}  Stars: ${s.stars}/9`,
    `Level 1 (Listening & Speaking): ${lv(1)}`,
    `Level 2 (Spelling): ${lv(2)}`,
    `Level 3 (Grammar): ${lv(3)}`,
    `Spoken sentence accuracy: ${s.speakAcc}%` + (s.pronEst != null ? `  | Pronunciation (estimate): ${s.pronEst}/5` : ''),
    `Listening (first try): ${s.listening}%  | Spelling: ${s.spelling}%  | Grammar: ${s.grammar}%`,
    `Practice next: word order ${s.err.order}, if/whether ${s.err.ifw}, Wh-word ${s.err.wh}, capitals ${s.err.caps}, punctuation ${s.err.punct}, spelling ${s.err.spell}`,
    `Badges: ${s.badges.join(', ') || '-'}`,
    `Saved: ${new Date().toLocaleString('en-GB')}`
  ].join('\n');
}
let cloudState = 'unknown';
async function syncCloud() {
  try {
    const db = await getCap('db'); const user = await getCap('user');
    if (!db || !user) { cloudState = 'off'; return false; }
    const id = await user.id(); if (!id) { cloudState = 'off'; return false; }
    await db.doc('scores/' + id).set(JSON.parse(JSON.stringify(summaryObj())));
    cloudState = 'ok'; return true;
  } catch (e) { cloudState = 'off'; return false; }
}

/* =========================================================
   AUDIO — synth SFX + ambient music + TTS
   ========================================================= */
let AC = null, muted = false, musicTimer = null;
function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => { });
  return AC;
}
function tone(freq, dur, type = 'sine', vol = .12, slide = 0, delay = 0) {
  const a = ac(); if (!a || muted) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
}
const SFX = {
  coin() { tone(988, .07, 'square', .05); tone(1319, .14, 'square', .05, 0, .06); },
  jump() { tone(320, .18, 'triangle', .09, 280); },
  correct() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .11, 0, i * .08)); },
  wrong() { tone(240, .28, 'sawtooth', .06, -90); tone(180, .3, 'sawtooth', .05, -60, .12); },
  hit() { tone(170, .3, 'square', .09, -110); },
  gem() { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, .35, 'sine', .11, 0, i * .1)); },
  door() { tone(80, .9, 'sawtooth', .06, 50); },
  combo() { [659, 880, 1175, 1568].forEach((f, i) => tone(f, .12, 'square', .06, 0, i * .05)); },
  boo() { tone(520, .6, 'sine', .07, -320); },
  click() { tone(660, .05, 'square', .04); }
};
function startMusic() {
  if (musicTimer) return;
  const notes = [220, 261.6, 329.6, 311.1, 220, 261.6, 349.2, 329.6];
  let i = 0;
  musicTimer = setInterval(() => {
    if (muted) return;
    const f = notes[i % notes.length];
    tone(f, 1.1, 'sine', .025); tone(f / 2, 1.6, 'triangle', .02);
    if (i % 4 === 0) tone(f * 2, .4, 'sine', .012, 0, .3);
    i++;
  }, 600);
}
let _voices = [];
function loadVoices() { try { _voices = speechSynthesis.getVoices(); } catch (e) { } }
try { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; } catch (e) { }
function enVoice() {
  const en = _voices.filter(v => /^en(-|_)/i.test(v.lang));
  return en.find(v => /en-US/i.test(v.lang) && /Google|Samantha|Aria|Jenny|Natural/i.test(v.name)) || en.find(v => /en-US/i.test(v.lang)) || en[0] || null;
}
function speak(text, opts = {}) {
  return new Promise(res => {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US'; u.rate = opts.rate || .92; u.pitch = opts.pitch || 1.0;
      const v = enVoice(); if (v) u.voice = v;
      u.onend = res; u.onerror = res;
      speechSynthesis.speak(u);
      setTimeout(res, 9000);
    } catch (e) { res(); }
  });
}

/* =========================================================
   SPEECH RECOGNITION (Speech-to-Text)
   ========================================================= */
const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition || null;
let micBlocked = false, currentRec = null;
function listenOnce(onInterim) {
  return new Promise((resolve, reject) => {
    if (!SRClass) return reject('unsupported');
    let r;
    try { r = new SRClass(); } catch (e) { return reject('unsupported'); }
    r.lang = 'en-US'; r.interimResults = true; r.maxAlternatives = 4; r.continuous = false;
    let finals = [], err = null;
    r.onresult = e => {
      let txt = ''; finals = [];
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        txt += res[0].transcript;
        if (res.isFinal) finals.push(res);
      }
      onInterim && onInterim(txt);
    };
    r.onerror = e => { err = e.error || 'error'; };
    r.onend = () => {
      currentRec = null;
      if (err && err !== 'no-speech' && err !== 'aborted') return reject(err);
      if (!finals.length) return resolve(null);
      // join finals; collect alternatives of the last/only segment
      const text = finals.map(f => f[0].transcript).join(' ').trim();
      const confs = finals.map(f => f[0].confidence).filter(c => typeof c === 'number' && c > 0);
      const conf = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : null;
      const alts = finals.length === 1 ? Array.from(finals[0]).map(a => ({ text: a.transcript, conf: a.confidence })) : [{ text, conf }];
      resolve({ text, conf, alts });
    };
    try { r.start(); currentRec = r; } catch (e) { reject('start-failed'); }
  });
}
function stopListening() { try { currentRec && currentRec.stop(); } catch (e) { } }

/* =========================================================
   EMBEDDED-QUESTION CONTENT
   d = direct question, e = embedded clause, yn = yes/no question
   ========================================================= */
const BANK = [
  { d: "Where does the old witch live?", e: "where the old witch lives" },
  { d: "Why is the little ghost crying?", e: "why the little ghost is crying" },
  { d: "What time does the party start?", e: "what time the party starts" },
  { d: "How did the black cat escape?", e: "how the black cat escaped" },
  { d: "When will the moon rise?", e: "when the moon will rise" },
  { d: "Where did she hide the pumpkin?", e: "where she hid the pumpkin" },
  { d: "What is the witch cooking?", e: "what the witch is cooking" },
  { d: "Why did he run away?", e: "why he ran away" },
  { d: "Where is the secret door?", e: "where the secret door is" },
  { d: "What does this spell mean?", e: "what this spell means" },
  { d: "How old is the castle?", e: "how old the castle is" },
  { d: "Which potion should she drink?", e: "which potion she should drink" },
  { d: "Where can we find the key?", e: "where we can find the key" },
  { d: "Who is that tall man?", e: "who that tall man is" },
  { d: "What did the ghost say?", e: "what the ghost said" },
  { d: "Why are the lights flickering?", e: "why the lights are flickering" },
  { d: "How does the spell work?", e: "how the spell works" },
  { d: "When did the bats arrive?", e: "when the bats arrived" },
  { d: "Whose broom is this?", e: "whose broom this is" },
  { d: "Where does he live?", e: "where he lives" },
  { d: "Why is he crying?", e: "why he is crying" },
  { d: "Where did she go?", e: "where she went" },
  { d: "Is the ghost friendly?", e: "the ghost is friendly", yn: true },
  { d: "Does the black cat like pumpkins?", e: "the black cat likes pumpkins", yn: true },
  { d: "Did he pass the exam?", e: "he passed the exam", yn: true },
  { d: "Is she coming to the party?", e: "she is coming to the party", yn: true },
  { d: "Can the witch fly at night?", e: "the witch can fly at night", yn: true },
  { d: "Will the door open?", e: "the door will open", yn: true },
  { d: "Are the zombies awake?", e: "the zombies are awake", yn: true },
  { d: "Did the bats leave the tower?", e: "the bats left the tower", yn: true },
  { d: "Was the castle empty last night?", e: "the castle was empty last night", yn: true },
  { d: "Do ghosts eat candy?", e: "ghosts eat candy", yn: true },
  { d: "Is she coming?", e: "she is coming", yn: true }
];
const Q_FRAMES = ["Do you know", "Could you tell me", "Can you tell me", "Do you have any idea"];
const S_FRAMES = ["I wonder", "I don't know", "I'm not sure", "I'd like to know", "Nobody knows"];
const isQFrame = f => Q_FRAMES.includes(f);
const WH_WORDS = ['where', 'why', 'what', 'when', 'how', 'who', 'which', 'whose'];

const CONTR = { "don't": "do not", "doesn't": "does not", "didn't": "did not", "i'm": "i am", "i'd": "i would", "can't": "cannot", "won't": "will not", "isn't": "is not", "aren't": "are not", "it's": "it is", "what's": "what is", "where's": "where is", "who's": "who is", "he's": "he is", "she's": "she is", "that's": "that is", "there's": "there is", "wasn't": "was not", "haven't": "have not", "hasn't": "has not", "couldn't": "could not", "you're": "you are", "we're": "we are", "they're": "they are", "i've": "i have", "can not": "cannot" };
function tokens(s) {
  s = String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^a-z0-9' ]+/g, ' ');
  const out = [];
  s.split(/\s+/).filter(Boolean).forEach(w => {
    w = w.replace(/^'+|'+$/g, ''); if (!w) return;
    const c = CONTR[w]; if (c) out.push(...c.split(' ')); else out.push(w);
  });
  return out;
}
const norm = s => tokens(s).join(' ');
const canon = s => tokens(s).map(w => w === 'whether' ? 'if' : w).join(' ');
const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);

function prepItem(it, src) {
  const x = Object.assign({}, it);
  x.src = src || 'bank';
  x.e = x.e.replace(/[.?!]+\s*$/, '').trim();
  const dl = x.d.replace(/\?\s*$/, '').trim();
  x.dl = dl.charAt(0).toLowerCase() + dl.slice(1);
  x.wh = x.yn ? null : x.e.split(' ')[0].toLowerCase();
  x.wrong = x.yn ? 'if ' + x.dl : x.dl;
  x.subj = !x.yn && canon(x.dl) === canon(x.e);
  return x;
}
function embed(x, conj) { return x.yn ? (conj || 'if') + ' ' + x.e : x.e; }
function sentence(x, frame, conj) { return frame + ' ' + embed(x, conj) + (isQFrame(frame) ? '?' : '.'); }
function wrongSentence(x, frame) { return frame + ' ' + x.wrong + (isQFrame(frame) ? '?' : '.'); }
function ruleFor(x) {
  if (x.yn) return `Rule 3 🔮 A yes/no question (“${x.d}”) → use <b>if / whether</b> + subject + verb: “<b>${embed(x, 'if')}</b>” or “<b>${embed(x, 'whether')}</b>”`;
  if (x.subj) return `Rule 2 🔮 Choose the Wh-word that matches the meaning: “${x.d}” → “<b>${x.wh}</b>”`;
  return `Rule 1 🔮 After the Wh-word, use statement word order (subject + verb): “<b>${x.e}</b>” ✔ not “<s>${x.wrong}</s>” ✘`;
}
function punctRule(frame) {
  return isQFrame(frame)
    ? `The main sentence is a question (“${frame} …”), so it ends with <b>?</b>`
    : `The main sentence is a statement (“${frame} …”), so it ends with <b>.</b> — not ?`;
}

/* diagnose a free answer (spoken or typed) — returns list of issues */
function diagnose(answer, x, target) {
  const a = canon(answer), t = canon(target);
  const issues = [];
  if (a === t) return { ok: true, issues };
  const aw = a.split(' '), tw = t.split(' ');
  if (!x.subj && a.includes(canon(x.dl))) issues.push('order');
  else if (!x.subj && /\b(do|does|did)\b/.test(a) && !/\b(do|does|did)\b/.test(canon(x.e)) && a.replace(/^(do you know|do you have any idea)/, '').match(/\b(do|does|did)\b/)) issues.push('order');
  if (x.yn && !/\b(if|whether)\b/.test(norm(answer))) issues.push('ifw');
  if (!x.yn && x.wh && !aw.includes(x.wh)) issues.push('wh');
  // spelling: target words not present that have a close neighbour
  const misses = tw.filter(w => !aw.includes(w));
  const extras = aw.filter(w => !tw.includes(w));
  const spell = [];
  misses.forEach(m => { const near = extras.find(e => lev(e, m) <= Math.max(1, Math.floor(m.length / 4)) && e !== m); if (near) spell.push([near, m]); });
  if (spell.length && !issues.includes('order')) issues.push('spell');
  if (!issues.length) issues.push('other');
  return { ok: false, issues, spell, misses, extras };
}
const ISSUE_TEXT = {
  order: '👻 Remember: <b>subject comes before the verb.</b> In an embedded question use subject + verb and drop do / does / did.',
  ifw: '👻 This is a yes/no question — it needs <b>if</b> or <b>whether</b>.',
  wh: '👻 Check your <b>Wh-word</b> — does it match what the original question asks?',
  spell: '👻 A word is <b>misspelled</b>. Check the letters again.',
  caps: '👻 Start the sentence with a <b>capital letter</b>.',
  punct: '👻 Check the <b>end punctuation</b>: main sentence is a question → ? / a statement → .',
  other: '👻 Not quite yet. Read or listen to the task again and try once more.'
};

/* word alignment (LCS) for spoken feedback */
function alignWords(target, said) {
  const t = tokens(target).map(w => w === 'whether' ? 'if' : w), s = tokens(said).map(w => w === 'whether' ? 'if' : w);
  const tOrig = tokens(target);
  const m = t.length, n = s.length, L = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) L[i][j] = t[i] === s[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < m && j < n) {
    if (t[i] === s[j]) { out.push({ w: tOrig[i], k: 'ok' }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ w: tOrig[i], k: 'miss' }); i++; }
    else { out.push({ w: s[j], k: 'extra' }); j++; }
  }
  while (i < m) out.push({ w: tOrig[i++], k: 'miss' });
  while (j < n) out.push({ w: s[j++], k: 'extra' });
  const matched = out.filter(o => o.k === 'ok').length, extra = out.filter(o => o.k === 'extra').length;
  return { out, acc: m ? Math.round(100 * matched / (m + extra)) : 0, missed: out.filter(o => o.k === 'miss').map(o => o.w) };
}
const PRON_TIPS = {
  whether: '“whether” /ˈweð.ər/ — touch your tongue to your top teeth for “th”', the: '“the” /ðə/ — tongue between the teeth, not “duh”',
  lives: '“lives” /lɪvz/ — finish with a clear “z” sound', could: '“could” /kʊd/ — the “l” is silent', know: '“know” /noʊ/ — the “k” is silent',
  where: '“where” /wer/ — round your lips for “w”', why: '“why” /waɪ/ — round your lips for “w”', what: '“what” /wʌt/ — soft “t” at the end',
  wonder: '“wonder” /ˈwʌn.dər/ — the vowel sounds like “uh”', witch: '“witch” /wɪtʃ/ — end with “ch”', castle: '“castle” /ˈkæs.əl/ — the “t” is silent',
  passed: '“passed” /pæst/ — “-ed” sounds like “t”', escaped: '“escaped” /ɪˈskeɪpt/ — “-ed” sounds like “t”', arrived: '“arrived” /əˈraɪvd/ — “-ed” sounds like “d”',
  tell: '“tell” /tel/ — finish with a clear “l”', is: '“is” /ɪz/ — ends with a “z” sound', ghost: '“ghost” /ɡoʊst/ — say the “st” at the end',
  idea: '“idea” /aɪˈdɪə/ — stress the second syllable', friendly: '“friendly” /ˈfrend.li/ — blend “fr” together', crying: '“crying” /ˈkraɪ.ɪŋ/ — blend “kr” together'
};

/* =========================================================
   TASK GENERATION (local procedural "spell book")
   ========================================================= */
function takeFrom(pool, filter) {
  const i = pool.findIndex(filter || (() => true));
  if (i >= 0) return pool.splice(i, 1)[0];
  const cand = BANK.filter(b => !filter || filter(prepItem(b)));
  return prepItem(pick(cand.length ? cand : BANK));
}
function genLevelTasks(level, items) {
  const pool = shuffle(items);
  const T = [];
  const anyFrame = () => Math.random() < .55 ? pick(Q_FRAMES) : pick(S_FRAMES);
  const conj = () => pick(['if', 'whether']);
  if (level === 1) {
    const plan = shuffle(['repeat', 'transform', 'transform-yn', 'repeat', 'transform']);
    plan.forEach(p => {
      const yn = p === 'transform-yn';
      const x = takeFrom(pool, yn ? (i => i.yn) : (i => !i.yn && !i.subj));
      const frame = anyFrame(), c = conj();
      if (p === 'repeat') T.push({ type: 'speak', mode: 'repeat', x, frame, target: sentence(x, frame, c) });
      else T.push({ type: 'speak', mode: 'transform', x, frame, target: sentence(x, frame, 'if') });
    });
  } else if (level === 2) {
    // blank (wh/if), dictation, type x2, order x2
    let x = takeFrom(pool); let f = anyFrame(), c = conj();
    const full = sentence(x, f, c), key = x.yn ? c : x.wh;
    T.push({ type: 'blank', x, frame: f, full, answer: key, accept: x.yn ? ['if', 'whether'] : [key], mode: 'word' });
    x = takeFrom(pool); f = anyFrame(); c = conj();
    const full2 = sentence(x, f, c);
    const words = full2.replace(/[?.]/g, '').split(' ');
    const cands = words.filter(w => /^[a-z]+$/i.test(w) && w.length >= 5 && !Q_FRAMES.concat(S_FRAMES).join(' ').toLowerCase().split(' ').includes(w.toLowerCase()));
    const long = cands.sort((a, b) => b.length - a.length)[0] || words[words.length - 1];
    T.push({ type: 'blank', x, frame: f, full: full2, answer: long, accept: [long.toLowerCase()], mode: 'dictation' });
    for (let k = 0; k < 2; k++) {
      x = takeFrom(pool, i => k === 1 ? i.yn : !i.yn); f = k === 0 ? pick(Q_FRAMES) : pick(S_FRAMES);
      T.push({ type: 'type', x, frame: f, target: sentence(x, f, 'if') });
    }
    for (let k = 0; k < 2; k++) {
      x = takeFrom(pool); f = anyFrame(); c = conj();
      const tgt = sentence(x, f, c);
      const toks = tgt.replace(/([?.])$/, ' $1').split(' ');
      let sh = shuffle(toks), guard = 0; while (sh.join(' ') === toks.join(' ') && guard++ < 10) sh = shuffle(toks);
      T.push({ type: 'order', x, frame: f, target: tgt, toks, shuffled: sh });
    }
    T.splice(0, T.length, ...[T[0], T[2], T[4], T[1], T[3], T[5]]);
  } else {
    // mcq x2, fix x2, dialog x2
    for (let k = 0; k < 2; k++) {
      const x = takeFrom(pool, i => k === 1 ? i.yn : !i.yn); const f = anyFrame(), c = conj();
      const full = sentence(x, f, c), key = x.yn ? c : x.wh;
      const blanked = f + ' ____ ' + (x.yn ? x.e : x.e.split(' ').slice(1).join(' ')) + (isQFrame(f) ? '?' : '.');
      let dist = x.yn ? shuffle(['where', 'what', 'why', 'when', 'how']).slice(0, 3)
        : shuffle(WH_WORDS.filter(w => w !== x.wh && !(x.wh === 'what' && w === 'which') && !(x.wh === 'which' && w === 'what'))).slice(0, 2).concat(['that']);
      const opts = shuffle([key].concat(dist));
      T.push({ type: 'mcq', x, frame: f, full, blanked, opts, answer: key });
    }
    for (let k = 0; k < 2; k++) {
      const x = takeFrom(pool, i => !i.subj && (k === 1 ? i.yn : !i.yn)); const f = k === 0 ? pick(Q_FRAMES) : pick(S_FRAMES);
      const right = sentence(x, f, 'if');
      const badPunct = f + ' ' + embed(x, 'if') + (isQFrame(f) ? '.' : '?');
      const badWord = x.yn ? f + ' ' + (x.wrong.replace(/^if /, 'whether ')) + (isQFrame(f) ? '?' : '.') : f + ' ' + pick(WH_WORDS.filter(w => w !== x.wh && w !== 'whose' && w !== 'which')) + ' ' + x.e.split(' ').slice(x.wh === 'what' && x.e.startsWith('what time') ? 2 : 1).join(' ') + (isQFrame(f) ? '?' : '.');
      const opts = shuffle([right, badPunct, badWord]);
      T.push({ type: 'fix', x, frame: f, wrong: wrongSentence(x, f), opts, answer: right });
    }
    const npcLines = [
      "Who dares to enter my chamber? Ask me properly, little witch!",
      "Hmm... a young apprentice. What do you wish to know?",
      "Speak politely, and maybe I will help you.",
      "My potion is almost ready. Do you have a question for me?"
    ];
    const replies = ["Such a polite question! The answer is in my spell book.", "Well asked! You may add the next ingredient.", "Perfect English! The cauldron glows brighter.", "Excellent! I will tell you everything."];
    for (let k = 0; k < 2; k++) {
      const x = takeFrom(pool, i => !i.subj && (k === 1 ? i.yn : !i.yn));
      const f = pick(['Excuse me, could you tell me', 'Excuse me, do you know', 'Sorry, can you tell me']);
      const right = f + ' ' + embed(x, 'if') + '?';
      const bad1 = f + ' ' + x.wrong + '?';
      const bad2 = x.yn ? f + ' ' + x.dl + '?' : 'Tell me ' + x.dl + '!';
      T.push({ type: 'dialog', x, frame: f, npc: npcLines[k * 2 + Math.floor(Math.random() * 2)], opts: shuffle([right, bad1, bad2]), answer: right, reply: pick(replies) });
    }
  }
  T.forEach(t => { t.attempts = 0; t.solved = false; });
  return T;
}

/* =========================================================
   AI GENERATION (Claude via the page's "sample" capability)
   ========================================================= */
const AI_LOG = { used: false, lastError: '' };
function validAI(it) {
  if (!it || typeof it.d !== 'string' || typeof it.e !== 'string') return false;
  const d = it.d.trim(), e = it.e.trim().replace(/[.]+$/, '');
  if (!/\?$/.test(d) || /\?/.test(e)) return false;
  const dw = d.split(/\s+/).length; if (dw < 3 || dw > 12) return false;
  const yn = !!it.yn;
  const first = d.split(' ')[0].toLowerCase();
  if (yn) {
    if (!['is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'has', 'have', 'may'].includes(first)) return false;
    if (/^(if|whether)\b/i.test(e)) return false;
  } else {
    if (!WH_WORDS.includes(first)) return false;
    if (e.split(' ')[0].toLowerCase() !== first) return false;
  }
  const p = prepItem({ d, e, yn });
  if (p.subj) return false;
  if (/\b(you|i)\b/i.test(d)) return false;
  return true;
}
async function aiGenerateItems(level, timeoutMs = 25000) {
  const sample = await getCap('sample');
  if (!sample) { AI_LOG.lastError = 'unavailable'; return null; }
  const theme = ['a haunted forest with lost ghosts, owls and glowing mushrooms', 'a spooky castle with gates, towers, bats and portraits', "a witch's chamber with potions, a cauldron, spell books and a black cat"][level - 1];
  const prompt = `You write practice items for Thai Grade 11 (Mathayom 5) students learning English EMBEDDED QUESTIONS in a Halloween adventure game. Setting for this level: ${theme}.
Return ONLY JSON of the form {"items":[ ... ]} with exactly 12 items. Each item:
{"d": a direct question, "e": the same question as an embedded clause (start lowercase, normal statement word order, no question mark, do/does/did removed and the main verb conjugated for tense/person), "yn": true for a yes/no question else false}
Rules:
- 8 wh-questions (mix where/why/what/when/how/which/whose and tenses: present simple, past simple, present continuous, can/will/should, verb to be) and 4 yes/no questions.
- For yes/no items "e" must NOT contain if/whether (the game adds it).
- No subject questions (where the wh-word is the subject, e.g. "Who opened the door?").
- Do not use the words "you" or "I". 4–9 words per question, CEFR B1, spooky but friendly.
Examples:
{"d":"Where does the old witch live?","e":"where the old witch lives","yn":false}
{"d":"Why are the bats flying?","e":"why the bats are flying","yn":false}
{"d":"Did he pass the exam?","e":"he passed the exam","yn":true}
Variety seed: ${Math.random().toString(36).slice(2, 8)}`;
  try {
    let val;
    if (typeof sample.json === 'function') val = await withTimeout(sample.json(prompt, { modelTier: 'quick', cache: false }), timeoutMs);
    else { const r = await withTimeout(sample(prompt, { modelTier: 'quick', cache: false }), timeoutMs); val = JSON.parse((r.text.match(/\{[\s\S]*\}/) || ['{}'])[0]); }
    const arr = (val && Array.isArray(val.items)) ? val.items : (Array.isArray(val) ? val : []);
    const good = arr.filter(validAI).map(it => prepItem({ d: it.d.trim(), e: it.e.trim(), yn: !!it.yn }, 'ai'));
    if (good.length < 6) { AI_LOG.lastError = 'too few valid'; return null; }
    AI_LOG.used = true;
    return good;
  } catch (e) { AI_LOG.lastError = (e && (e.code || e.message)) || 'error'; return null; }
}
async function buildTasksForLevel(level, useAI) {
  let items = null;
  if (useAI) items = await aiGenerateItems(level);
  const bank = BANK.map(b => prepItem(b));
  let src = 'bank';
  let pool;
  if (items && items.length) {
    src = 'ai';
    // ensure enough yes/no and wh variety by topping up from bank
    const yn = items.filter(i => i.yn).length;
    pool = items.concat(shuffle(bank.filter(b => yn < 3 ? b.yn : !b.yn)).slice(0, 3));
  } else pool = bank;
  return { tasks: genLevelTasks(level, pool), src };
}
