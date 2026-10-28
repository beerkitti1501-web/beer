/* =========================================================
   GAME STATE, PLAYER, LOOP
   ========================================================= */
const V3 = THREE.Vector3;
const G = { state: 'boot', level: 1, L: null, tasks: [], src: 'bank', score: 0, lives: 5, maxLives: 5, streak: 0, bestStreak: 0, firstTry: 0, coinsRun: 0, gemSpawned: false, gemObj: null, gemTaken: false, doorDone: false, finaleReady: false, useAI: true, timeStart: 0 };
const P = { pos: new V3(), vy: 0, onGround: true, face: Math.PI, anim: { mode: 'idle', timer: 0 }, invuln: 0, knock: new V3(), checkpoint: new V3() };
let witch, boo, petObj, petKind;
let camYaw = 0, camPitch = .36, camDist = 6.8;
const keys = {}; let jumpQueued = false; const joy = { x: 0, y: 0, active: false };
let isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && !(window.matchMedia && matchMedia('(pointer: fine)').matches));
addEventListener('touchstart', () => { if (!isTouch) { isTouch = true; if (G.state === 'play') $('#touch').classList.remove('hidden'); } }, { passive: true });
if (SAVE.useAI === false) G.useAI = false;

/* ---------- HUD / messages ---------- */
let booTimer = null;
function booSay(html, ms = 4200) {
  $('#booText').innerHTML = html; $('#boo').classList.remove('hidden');
  clearTimeout(booTimer); booTimer = setTimeout(() => $('#boo').classList.add('hidden'), ms);
}
let toastTimer = null;
function toast(html, ms = 2200) { const t = $('#toast'); t.innerHTML = html; t.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), ms); }
function showCombo(m) { const c = $('#combo'); c.textContent = `COMBO x${m}!`; c.classList.remove('hidden'); c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; setTimeout(() => c.classList.add('hidden'), 950); }
function updateHUD() {
  const info = LEVEL_INFO[G.level];
  $('#hudLevel').textContent = 'Level ' + G.level;
  $('#hudScore').textContent = G.score;
  $('#hudCoins').textContent = SAVE.coins;
  $('#hudLives').innerHTML = Array.from({ length: G.maxLives }, (_, i) => i < G.lives ? '💜' : '🖤').join('');
  const solved = G.tasks.filter(t => t.solved).length, n = G.tasks.length;
  let obj = `${info.icon} ${info.th}: tasks ${solved}/${n}`;
  if (G.gemSpawned && !G.gemTaken) obj = `💎 Collect the ${info.crystal}!`;
  if (G.level === 3 && G.gemTaken) obj = '🚪 Walk through the magic door!';
  $('#hudObjective').innerHTML = obj;
  $('#hudProgress').innerHTML = G.tasks.map(t => t.solved ? '✅' : '⬜').join(' ') + (G.streak >= 2 ? `  🔥 Combo x${Math.min(3, G.streak)}` : '');
  const gems = [1, 2, 3].map(i => !!SAVE.levels[i] || (i === G.level && G.gemTaken));
  document.querySelectorAll('.gem').forEach((el, i) => el.classList.toggle('on', gems[i]));
}

/* ---------- player & companions ---------- */
function createPlayer() {
  witch = makeWitch(OUTFITS[SAVE.outfit] || {}); setOutfit(witch, SAVE.outfit);
  boo = makeGhost(0xffffff, { hat: true }); boo.g.scale.setScalar(.45);
  setPet(SAVE.pet);
}
function setPet(kind) {
  petKind = kind;
  if (kind === 'pet_bat') petObj = makeBat();
  else if (kind === 'pet_pumpkin') { const g = new THREE.Group(); g.add(makePumpkin(.25, true, false)); petObj = { g }; }
  else if (kind === 'pet_owl') petObj = makeOwl();
  else petObj = makeCat();
}
function addPlayerToScene() {
  scene.add(witch.g); scene.add(boo.g); scene.add(petObj.g);
  witch.g.position.copy(P.pos);
  boo.g.position.copy(P.pos).add(new V3(-1, 1.6, 1)); petObj.g.position.copy(P.pos).add(new V3(1, 0, 1));
}

/* ---------- input ---------- */
addEventListener('keydown', e => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') { if (e.key === 'Escape') closeQuestion(); return; }
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); jumpQueued = true; }
  if (e.code === 'KeyE' || e.code === 'Enter') interact();
  if (e.code === 'Escape') { if (G.state === 'question') closeQuestion(); else if (G.state === 'play') pauseMenu(); }
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function setupPointer() {
  const cv = renderer.domElement; let drag = null;
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { cv.setPointerCapture(e.pointerId); } catch (_) { } });
  cv.addEventListener('pointermove', e => { if (!drag || drag.id !== e.pointerId) return; camYaw -= (e.clientX - drag.x) * .006; camPitch = clamp(camPitch + (e.clientY - drag.y) * .003, .12, .95); drag.x = e.clientX; drag.y = e.clientY; });
  const end = () => { drag = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { camDist = clamp(camDist + e.deltaY * .005, 4, 10); }, { passive: true });
  const jz = $('#joy'), kn = $('#joyKnob');
  const jmove = e => { const r = jz.getBoundingClientRect(); let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const d = Math.hypot(dx, dy), m = 45; if (d > m) { dx *= m / d; dy *= m / d; } joy.x = dx / m; joy.y = -dy / m; kn.style.transform = `translate(${dx}px,${dy}px)`; };
  jz.addEventListener('pointerdown', e => { joy.active = true; try { jz.setPointerCapture(e.pointerId); } catch (_) { } jmove(e); });
  jz.addEventListener('pointermove', e => { if (joy.active) jmove(e); });
  const jend = () => { joy.active = false; joy.x = joy.y = 0; kn.style.transform = ''; };
  jz.addEventListener('pointerup', jend); jz.addEventListener('pointercancel', jend);
  $('#tJump').addEventListener('pointerdown', e => { e.preventDefault(); jumpQueued = true; });
  $('#tAct').addEventListener('pointerdown', e => { e.preventDefault(); interact(); });
  $('#prompt').addEventListener('click', interact);
}

/* ---------- level flow ---------- */
function buildLevel(n) {
  G.level = n;
  G.L = n === 1 ? buildForest() : n === 2 ? buildCastle() : buildChamber();
  P.pos.copy(G.L.spawn); P.checkpoint.copy(G.L.spawn); P.vy = 0; P.face = Math.PI; camYaw = 0;
  if (n === 3) { P.face = Math.PI; }
  addPlayerToScene();
  camera.position.set(P.pos.x, P.pos.y + 3, P.pos.z + 7);
}
function resetRun() {
  G.score = 0; G.lives = G.maxLives; G.streak = 0; G.bestStreak = 0; G.firstTry = 0; G.coinsRun = 0;
  G.gemSpawned = false; G.gemObj = null; G.gemTaken = false; G.doorDone = false; G.finaleReady = false; G.timeStart = performance.now();
}
async function beginLevel(n) {
  resetRun();
  $('#loading').classList.remove('hidden');
  $('#loadingText').innerHTML = G.useAI ? '🔮 The witch is brewing new questions with AI...<br><small style="opacity:.7">If you are asked for permission, tap Allow.</small><br><button class="btn ghost small" id="skipAI" style="margin-top:12px">Skip → use the spell book</button>' : '📜 Picking random questions from the spell book...';
  let skip; const skipP = new Promise(r => skip = r);
  const sb = $('#skipAI'); if (sb) sb.onclick = () => skip(null);
  let res = await Promise.race([buildTasksForLevel(n, G.useAI), skipP]);
  if (!res) res = await buildTasksForLevel(n, false);
  G.tasks = res.tasks; G.src = res.src;
  $('#loading').classList.add('hidden');
  if (G.useAI && res.src !== 'ai') toast('📜 Using questions from the spell book (auto-generated)');
  if (res.src === 'ai') toast('🔮 AI created a fresh set of questions!');
  // assign tasks to stations
  G.L.stations.forEach((s, i) => { s.task = G.tasks[i]; s.solved = false; s.idx = i; });
  setScreen(''); $('#screen').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  if (isTouch) $('#touch').classList.remove('hidden');
  G.state = 'play'; P.invuln = 1.5;
  updateHUD();
  const firstMsg = { 1: 'Little ghosts are lost in the forest! Walk to a ghost with a <b>!</b> and ' + (isTouch ? 'tap ✋' : 'press <kbd>E</kbd>') + ' to talk 👻', 2: 'The castle gates are locked! Help the gate ghosts spell correctly to unlock them 🔐 Watch out for spikes and axes!', 3: "This is the Witch's Chamber! Collect ingredients from the 4 potion stands and talk to the witch and the mirror spirit 🧪 Watch out for fire and flying books!" }[n];
  booSay(firstMsg, 6500);
  startMusic();
}

/* ---------- interaction ---------- */
function nearestStation() {
  if (!G.L) return null; let best = null, bd = 2.6;
  G.L.stations.forEach(s => { if (s.solved) return; const d = Math.hypot(P.pos.x - s.pos.x, P.pos.z - s.pos.z); if (d < bd) { bd = d; best = s; } });
  return best;
}
function interact() {
  if (G.state !== 'play') return;
  const s = nearestStation(); if (s) openQuestion(s);
}

/* ---------- hurt / respawn ---------- */
const OUCH = ['Eek! Be careful! 😱', 'Yikes! Try jumping over it' + (isTouch ? '!' : ' (Space)'), 'Ouch! Watch the trap timing first.', 'Boo! That was scary 👻'];
function hurt() {
  if (P.invuln > 0 || G.state !== 'play') return;
  G.lives--; P.invuln = 1.6; P.anim = { mode: 'scared', timer: .9 }; SFX.hit(); SFX.boo();
  P.knock.set(Math.sin(camYaw), 0, Math.cos(camYaw)).multiplyScalar(7); P.vy = 4; P.onGround = false;
  G.streak = 0;
  if (G.lives <= 0) {
    G.lives = G.maxLives; G.score = Math.max(0, G.score - 50);
    setTimeout(() => { P.pos.copy(P.checkpoint); P.knock.set(0, 0, 0); booSay('Out of hearts! Back to the last checkpoint (−50 points) 💜', 3500); }, 500);
  } else booSay(pick(OUCH), 2500);
  updateHUD();
}

/* ---------- physics ---------- */
function resolveCollisions() {
  const L = G.L, p = P.pos, pr = .38;
  for (const c of L.colliders) {
    if (c.gate && c.gate.open) continue;
    if (c.doorBlock && L.door && L.door.open) continue;
    if (c.t === 'c') {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), mn = c.r + pr;
      if (d < mn && d > 1e-5) { p.x = c.x + dx / d * mn; p.z = c.z + dz / d * mn; }
    } else {
      const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1); const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < pr) {
        if (d > 1e-5) { p.x = cx + dx / d * pr; p.z = cz + dz / d * pr; }
        else { const toMin = p.z - c.z0, toMax = c.z1 - p.z; p.z = toMin < toMax ? c.z0 - pr : c.z1 + pr; }
      }
    }
  }
  if (L.round) { const d = Math.hypot(p.x, p.z); if (d > L.round) { p.x *= L.round / d; p.z *= L.round / d; } }
  else { p.x = clamp(p.x, L.bounds.x0, L.bounds.x1); p.z = clamp(p.z, L.bounds.z0, L.bounds.z1); }
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
function updatePlayer(dt, t) {
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz += 1; if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1;
  ix += joy.x; iz += joy.y;
  const len = Math.hypot(ix, iz); if (len > 1) { ix /= len; iz /= len; }
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix;
  const speed = P.anim.mode === 'scared' ? 2.5 : 6.3;
  P.pos.x += (mx * speed + P.knock.x) * dt; P.pos.z += (mz * speed + P.knock.z) * dt;
  P.knock.multiplyScalar(Math.max(0, 1 - dt * 6));
  if (jumpQueued && P.onGround) { P.vy = 7.4; P.onGround = false; SFX.jump(); }
  jumpQueued = false;
  P.vy -= 20 * dt; P.pos.y += P.vy * dt;
  if (P.pos.y <= 0) { P.pos.y = 0; P.vy = 0; P.onGround = true; }
  resolveCollisions();
  const moving = Math.hypot(mx, mz) > .08;
  if (moving) P.face = lerpAngle(P.face, Math.atan2(mx, mz), Math.min(1, dt * 12));
  if (P.anim.timer > 0) { P.anim.timer -= dt; if (P.anim.timer <= 0) P.anim.mode = 'idle'; }
  if (P.anim.timer <= 0) P.anim.mode = !P.onGround ? 'air' : moving ? 'run' : 'idle';
  if (P.invuln > 0) P.invuln -= dt;
  witch.g.position.copy(P.pos); witch.g.rotation.y = P.face;
  witch.g.visible = !(P.invuln > 0 && Math.floor(t * 12) % 2 === 0 && P.anim.mode !== 'scared');
}
function updateCompanions(dt, t, still) {
  const c = Math.cos(P.face), s = Math.sin(P.face);
  const off = (x, z) => new V3(P.pos.x + x * c + z * s, 0, P.pos.z - x * s + z * c);
  const bt = off(.95, -.7); bt.y = P.pos.y + 1.75 + Math.sin(t * 2.2) * .12;
  boo.g.position.lerp(bt, Math.min(1, dt * 3)); boo.g.rotation.y = lerpAngle(boo.g.rotation.y, P.face, dt * 3);
  boo.arms.forEach((a, i) => a.position.y = .3 + Math.sin(t * 4 + i * 3) * .06);
  const pt = off(-.85, -.9); const pg = petObj.g;
  const prev = pg.position.clone();
  if (petKind === 'pet_bat' || petKind === 'pet_owl') { pt.y = P.pos.y + 1.1 + Math.sin(t * 3) * .15; pg.position.lerp(pt, Math.min(1, dt * 3.5)); const f = Math.sin(t * (petKind === 'pet_bat' ? 22 : 10)); petObj.wl.rotation.y = f * .7; petObj.wr.rotation.y = -f * .7; if (petKind === 'pet_owl') { petObj.wl.rotation.z = f * .5; petObj.wr.rotation.z = -f * .5; } }
  else { pt.y = 0; pg.position.lerp(pt, Math.min(1, dt * 4)); const v = prev.distanceTo(pg.position) / Math.max(dt, 1e-4); if (petKind === 'pet_pumpkin') pg.position.y = Math.abs(Math.sin(t * 8)) * .35 * Math.min(1, v / 2 + .2); else { pg.position.y = P.pos.y > .3 ? P.pos.y * .5 : 0; if (petObj.tail) petObj.tail.rotation.x = Math.sin(t * 3) * .3 - .2; if (petObj.legs) petObj.legs.forEach((l, i) => l.rotation.x = Math.sin(t * 14 + i * Math.PI) * Math.min(.7, v * .15)); } }
  const mvx = pg.position.x - prev.x, mvz = pg.position.z - prev.z;
  if (Math.hypot(mvx, mvz) > .005) pg.rotation.y = lerpAngle(pg.rotation.y, Math.atan2(mvx, mvz), dt * 8);
}
function updateCamera(dt, title) {
  const tgt = title ? new V3(0, 2, G.L && G.L.round ? 0 : -16) : new V3(P.pos.x, P.pos.y * .6 + 1.3, P.pos.z);
  let yaw = camYaw, pit = camPitch, dist = camDist;
  if (title) { yaw = performance.now() * .00008; pit = .25; dist = 16; }
  const des = new V3(tgt.x + Math.sin(yaw) * Math.cos(pit) * dist, tgt.y + Math.sin(pit) * dist, tgt.z + Math.cos(yaw) * Math.cos(pit) * dist);
  if (G.level === 2 && !title) des.x = clamp(des.x, -6.9, 6.9);
  if (G.L && G.L.round) { const d = Math.hypot(des.x, des.z), m = 17; if (d > m) { des.x *= m / d; des.z *= m / d; } }
  camera.position.lerp(des, 1 - Math.exp(-dt * (title ? 1.5 : 7)));
  camera.lookAt(tgt);
  if (G.L && G.L.sun) { const s = G.L.sun; s.position.set(tgt.x + 10, 22, tgt.z + 8); s.target.position.set(tgt.x, 0, tgt.z); }
}

/* ---------- world update ---------- */
function updateWorld(dt, t) {
  const L = G.L; if (!L) return;
  torches.forEach(o => { const k = 1 + Math.sin(t * 15 + o.ph) * .12 + Math.sin(t * 23 + o.ph) * .08; o.f.scale.set(1, k, 1); o.gl.material.opacity = .55 + (k - 1) * 1.5; });
  updateFireflies(t); updateBursts(dt);
  L.traps.forEach(tr => { tr.update(t); if (G.state === 'play' && tr.hit(P.pos)) hurt(); });
  L.coins.forEach(c => {
    if (c.taken) { if (c.g.visible) { c.g.position.y += dt * 4; c.g.scale.multiplyScalar(.9); if (c.g.scale.x < .05) c.g.visible = false; } return; }
    c.g.rotation.y += dt * 3;
    if (G.state === 'play' && Math.hypot(P.pos.x - c.g.position.x, P.pos.z - c.g.position.z) < .9 && Math.abs(P.pos.y + .8 - c.g.position.y) < 1.3) {
      c.taken = true; SAVE.coins++; G.coinsRun++; G.score += 10; SFX.coin(); updateHUD();
    }
  });
  L.stations.forEach((s, i) => {
    const npc = s.npc;
    if (s.kind === 'ghost' || s.kind === 'mirror') {
      if (s.freed) { npc.g.position.y += dt * 1.6; npc.g.rotation.y += dt * 4; npc.mat.opacity = Math.max(0, npc.mat.opacity - dt * .25); if (npc.mat.opacity <= 0) npc.g.visible = false; }
      else if (s.kind === 'ghost') { npc.g.position.y = .6 + Math.sin(t * 2 + i) * .13; const d = Math.hypot(P.pos.x - s.pos.x, P.pos.z - s.pos.z); if (d < 8) npc.g.rotation.y = lerpAngle(npc.g.rotation.y, Math.atan2(P.pos.x - s.pos.x, P.pos.z - s.pos.z), dt * 4); }
      else npc.g.position.y = 1.3 + Math.sin(t * 2) * .08;
    } else if (s.kind === 'pedestal') {
      if (!s.flying) { npc.bottle.position.y = 1.1 + Math.sin(t * 2 + i) * .08; npc.bottle.rotation.y += dt; }
    } else if (s.kind === 'witch') {
      animWitch(npc, { mode: s.solved ? 'celebrate' : 'idle', timer: t }, t, dt);
      if (!s.solved) npc.g.rotation.y = lerpAngle(npc.g.rotation.y, Math.atan2(P.pos.x - s.pos.x, P.pos.z - s.pos.z), dt * 2);
    }
    if (s.marker) { s.marker.position.y = (s.kind === 'witch' ? 3.4 : s.kind === 'mirror' ? 3.6 : 2.5) + Math.sin(t * 3 + i) * .12; }
  });
  // flying bottles to cauldron
  L.stations.forEach(s => {
    if (!s.flying) return; s.flyT += dt / 1.4; const b = s.npc.bottle; const k = Math.min(1, s.flyT);
    const from = s.flyFrom, to = new V3(0, 2.6, 0); const pos = from.clone().lerp(to, k); pos.y += Math.sin(k * Math.PI) * 4;
    b.parent && b.parent !== scene && (scene.attach(b)); b.position.copy(pos); b.rotation.z += dt * 8;
    if (k >= 1) { s.flying = false; b.visible = false; burst(new V3(0, 2.6, 0), s.color, 50, 4); L.cauldron.liquidMat.color.setHex(s.color); L.cauldron.liquidMat.emissive.setHex(s.color); L.cauldron.cl.color.setHex(s.color); L.cauldron.cglow.material.color.setHex(s.color); SFX.coin(); }
  });
  if (L.cauldron) {
    L.cauldron.fire.forEach((f, i) => f.scale.y = 1 + Math.sin(t * 18 + i) * .25);
    if (Math.random() < dt * 6) { const b = mesh(new THREE.SphereGeometry(rand(.06, .14), 8, 6), new THREE.MeshBasicMaterial({ color: L.cauldron.liquidMat.color.clone().offsetHSL(0, 0, .2), transparent: true, opacity: .9 }), rand(-.8, .8), 2.35, rand(-.8, .8), scene, false); L.cauldron.bubbles.push({ b, v: rand(.5, 1.2) }); }
    for (let k = L.cauldron.bubbles.length - 1; k >= 0; k--) { const o = L.cauldron.bubbles[k]; o.b.position.y += o.v * dt; o.b.material.opacity -= dt * .8; if (o.b.material.opacity <= 0) { scene.remove(o.b); o.b.geometry.dispose(); L.cauldron.bubbles.splice(k, 1); } }
  }
  if (L.gates) L.gates.forEach(g => { if (g.open && g.openT < 1) { g.openT = Math.min(1, g.openT + dt / 1.6); g.bars.position.y = g.openT * 5.8; } });
  if (L.door && L.door.open && L.door.openT < 1) { L.door.openT = Math.min(1, L.door.openT + dt / 2); L.door.leaves[0].rotation.y = L.door.openT * 1.6; L.door.leaves[1].rotation.y = -L.door.openT * 1.6; }
  // gem
  if (G.gemObj && !G.gemTaken) {
    const gm = G.gemObj; gm.rotation.y += dt * 2;
    if (gm.userData.rise != null && gm.userData.rise < 1) { gm.userData.rise = Math.min(1, gm.userData.rise + dt / 2); gm.position.lerpVectors(gm.userData.from, L.gemPos, gm.userData.rise); }
    else gm.position.y = L.gemPos.y + Math.sin(t * 2) * .2;
    if (G.state === 'play' && Math.hypot(P.pos.x - gm.position.x, P.pos.z - gm.position.z) < 1.3) collectGem();
  }
  if (G.level === 3 && G.finaleReady && G.state === 'play' && Math.hypot(P.pos.x, P.pos.z + 16) < 2.2) finale();
  // proximity prompt
  if (G.state === 'play') {
    const s = nearestStation(); const pr = $('#prompt');
    if (s) { pr.innerHTML = `${isTouch ? '✋ Tap' : '<kbd>E</kbd>'} Talk to ${esc(s.name)}`; pr.classList.remove('hidden'); } else pr.classList.add('hidden');
  }
}

/* ---------- station solved & level end ---------- */
function stationSolved(s) {
  s.solved = true; const L = G.L;
  if (s.marker) { scene.remove(s.marker); s.marker = textSprite('✓', { bg: '#26b866', color: '#fff', size: 150, scale: .8 }); s.marker.position.copy(s.pos).add(new V3(0, 2.5, 0)); scene.add(s.marker); }
  burst(s.pos.clone().add(new V3(0, 1.2, 0)), G.level === 1 ? 0x9ff2ff : G.level === 2 ? 0xd9a8ff : 0xffc070, 60, 5);
  P.anim = { mode: 'celebrate', timer: 1.6 };
  P.checkpoint.copy(s.pos).add(new V3(s.pos.x > 0 ? -1.6 : 1.6, 0, 0));
  if (s.kind === 'ghost' && G.level === 1) { s.freed = true; s.npc.mouth.scale.set(1.4, .5, .4); }
  if (s.kind === 'mirror') s.freed = true;
  if (s.kind === 'pedestal') { s.flying = true; s.flyT = 0; s.flyFrom = s.npc.bottle.getWorldPosition(new V3()); }
  if (L.gates) {
    const gi = Math.floor(s.idx / 2), g = L.gates[gi];
    if (g && !g.open && L.stations[gi * 2].solved && L.stations[gi * 2 + 1].solved) { g.open = true; SFX.door(); burst(new V3(0, 3, g.z), 0xb26bff, 80, 6); booSay(`🔓 Gate ${gi + 1} is open! Keep going!`, 3200); }
  }
  const all = G.tasks.every(t => t.solved);
  if (all && !G.gemSpawned) setTimeout(spawnGem, G.level === 3 ? 1600 : 700);
  else if (!(L.gates && L.gates.some(g => g.open && g.openT === 0))) {
    const left = G.tasks.filter(t => !t.solved).length;
    booSay(pick(['Awesome! ✨', 'Great job! 🎉', 'Amazing! The magic grows stronger 🔮', 'Excellent! 👏']) + ` ${left} task${left > 1 ? 's' : ''} left.`, 3000);
  }
  updateHUD(); persist();
}
function spawnGem() {
  const L = G.L, info = LEVEL_INFO[G.level];
  G.gemSpawned = true; const gm = makeCrystal(info.color); scene.add(gm); G.gemObj = gm;
  if (G.level === 3) { gm.userData.from = new V3(0, 2.6, 0); gm.userData.rise = 0; gm.position.copy(gm.userData.from); burst(new V3(0, 3, 0), 0xffc070, 120, 7); }
  else gm.position.copy(L.gemPos);
  SFX.gem();
  booSay(`💎 The <b>${info.crystal}</b> has appeared ${G.level === 3 ? 'from the cauldron' : 'at the end of the path'} — go and get it!`, 5000);
  updateHUD();
}
function collectGem() {
  G.gemTaken = true; scene.remove(G.gemObj); SFX.gem(); burst(P.pos.clone().add(new V3(0, 1.5, 0)), LEVEL_INFO[G.level].color, 120, 7);
  P.anim = { mode: 'celebrate', timer: 2.2 }; updateHUD();
  if (G.level === 3) {
    const D = G.L.door; let k = 0;
    const lightOne = () => { const s = D.sockets[k]; s.material = M(s.userData.c, { emissive: s.userData.c, emissiveIntensity: 2 }); glow(s.userData.c, 1.4, D.door, s.position.x, s.position.y, s.position.z + .1, .9); SFX.coin(); k++; if (k < 3) setTimeout(lightOne, 450); else setTimeout(() => { D.open = true; SFX.door(); G.finaleReady = true; booSay('🚪 All 3 crystals! The door to the final magic room is open — walk in!', 6000); updateHUD(); }, 600); };
    setTimeout(lightOne, 700);
    levelComplete(true);
  } else setTimeout(() => levelComplete(false), 1300);
}
function computeStars() { const r = G.firstTry / Math.max(1, G.tasks.length); return r >= .85 ? 3 : r >= .6 ? 2 : 1; }
function levelComplete(silent) {
  const n = G.level, info = LEVEL_INFO[n];
  const stars = computeStars(); const lifeBonus = G.lives * 20; G.score += lifeBonus;
  const prev = SAVE.levels[n] || { best: 0, stars: 0, plays: 0 };
  SAVE.levels[n] = { best: Math.max(prev.best, G.score), stars: Math.max(prev.stars, stars), last: G.score, plays: (prev.plays || 0) + 1, firstTry: G.firstTry, tasks: G.tasks.length, bestCombo: Math.max(prev.bestCombo || 0, G.bestStreak), date: Date.now() };
  SAVE.maxLevel = Math.max(SAVE.maxLevel, Math.min(3, n + 1));
  if (!SAVE.badges.includes(info.crystal)) SAVE.badges.push(info.crystal);
  SAVE.history.push({ level: n, score: G.score, stars, src: G.src, at: Date.now() }); if (SAVE.history.length > 40) SAVE.history.shift();
  persist(); syncCloud();
  G.lastResult = { n, stars, lifeBonus };
  if (silent) return;
  showLevelResult();
}

/* ---------- main loop ---------- */
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
  if (!G.L) return;
  if (G.state === 'play') updatePlayer(dt, t);
  else if (P.anim.timer > 0) { P.anim.timer -= dt; if (P.anim.timer <= 0) P.anim.mode = 'idle'; }
  if (G.state !== 'play' && P.anim.timer <= 0) P.anim.mode = 'idle';
  if (witch) { animWitch(witch, { mode: P.anim.mode, timer: P.anim.timer }, t, dt); if (G.state !== 'play') { witch.g.visible = true; witch.g.position.copy(P.pos); witch.g.rotation.y = P.face; } }
  if (boo && petObj) updateCompanions(dt, t);
  updateWorld(dt, t);
  updateCamera(dt, G.state === 'title');
  if (G.L && G.L.portal) G.L.portal.userData.swirl.rotation.z += dt;
  renderer.render(scene, camera);
}
