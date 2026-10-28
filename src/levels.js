/* =========================================================
   LEVEL BUILDERS
   ========================================================= */
const LEVEL_INFO = {
  1: { name: 'The Haunted Forest', th: 'Haunted Forest', skill: 'Listening & Speaking', skillTh: 'Listen & speak', crystal: 'Voice Crystal', color: 0x4be1ff, css: 'blue',
    mission: 'Help 5 lost ghosts: listen to each ghost, then <b>say</b> the embedded question correctly.', icon: '🎤' },
  2: { name: 'The Spooky Castle', th: 'Spooky Castle', skill: 'Spelling & Sentence Building', skillTh: 'Type & spell', crystal: 'Spelling Crystal', color: 0xb26bff, css: 'purple',
    mission: 'Unlock 3 castle gates: <b>type</b> missing words, write full sentences with correct capitals and punctuation, and build sentences from word tiles.', icon: '⌨️' },
  3: { name: "The Witch's Chamber", th: "Witch's Chamber", skill: 'Grammar & Logic', skillTh: 'Grammar & choices', crystal: 'Grammar Crystal', color: 0xff9a2e, css: 'orange',
    mission: 'Brew the magic potion: <b>choose</b> the right Wh-word / if / whether, fix broken sentences, and talk politely with the Guardian Witch.', icon: '🧪' }
};

function addLights(o) {
  scene.add(new THREE.HemisphereLight(o.sky, o.ground, o.hemi || .85));
  scene.add(new THREE.AmbientLight(o.amb || 0x2a2050, .5));
  const d = new THREE.DirectionalLight(o.moon || 0xbfc8ff, o.moonI || .9);
  d.position.set(10, 22, 8); d.castShadow = true;
  d.shadow.mapSize.set(isTouch ? 1024 : 1536, isTouch ? 1024 : 1536); const c = d.shadow.camera; c.left = -18; c.right = 18; c.top = 18; c.bottom = -18; c.near = 1; c.far = 70;
  d.shadow.bias = -.0008;
  scene.add(d); scene.add(d.target);
  return d;
}

function newScene(bgTop, bgMid, bgBot, fogColor, fogDensity) {
  scene = new THREE.Scene();
  scene.background = skyTexture(bgTop, bgMid, bgBot);
  scene.fog = new THREE.FogExp2(fogColor, fogDensity);
  torches.length = 0; fireflies = null; bursts.length = 0;
}

function makeMarker() {
  const s = textSprite('!', { bg: '#ffb020', color: '#3a1600', size: 150, scale: .9 });
  return s;
}

/* ---------- LEVEL 1: HAUNTED FOREST ---------- */
function buildForest() {
  newScene('#0a0a2e', '#2a1a5e', '#4a2a6e', 0x1d1440, .022);
  const sun = addLights({ sky: 0x7a6cff, ground: 0x1a3020, hemi: .9, moon: 0xc9d4ff, moonI: 1.0 });
  moonAndSky();
  const L = { colliders: [], stations: [], traps: [], coins: [], sun, bounds: { x0: -8, x1: 8, z0: -120, z1: 6 }, spawn: new THREE.Vector3(0, 0, 2), gemPos: new THREE.Vector3(0, 1.4, -112) };
  const g = new THREE.Mesh(new THREE.PlaneGeometry(80, 220), new THREE.MeshStandardMaterial({ map: groundTex('#1d2a26', ['#2a3d30', '#352a4a', '#1a1f2a', '#40304f']), roughness: 1 }));
  g.rotation.x = -Math.PI / 2; g.position.z = -55; g.receiveShadow = true; scene.add(g);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(5, 130), new THREE.MeshStandardMaterial({ map: cobbleTex('#4a4466', '#231f33', [2, 26]), roughness: .9 }));
  path.rotation.x = -Math.PI / 2; path.position.set(0, .01, -58); path.receiveShadow = true; scene.add(path);
  // trees: side forest
  for (let z = 8; z > -130; z -= 3.2) {
    for (const side of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const x = side * rand(9, 22) ; const t = makeTree(rand(3.5, 6), Math.random() < .25, rand(.9, 1.4));
        t.position.set(x, 0, z + rand(-1.5, 1.5)); t.rotation.y = rand(0, 6); scene.add(t);
      }
    }
  }
  // inner obstacle trees (with colliders)
  [[-6, -8], [6.2, -20], [-5.5, -30], [5.8, -42], [-6.3, -52], [6, -63], [-5.8, -74], [6.4, -86], [-6, -96], [5.5, -104]].forEach(([x, z]) => {
    const t = makeTree(rand(4, 5.5), false, 1.1); t.position.set(x, 0, z); scene.add(t); L.colliders.push({ t: 'c', x, z, r: .6 });
  });
  // lantern tree clearing
  const big = makeTree(7, false, 2); big.position.set(-7.5, 0, -60); scene.add(big); L.colliders.push({ t: 'c', x: -7.5, z: -60, r: 1 });
  for (let i = 0; i < 18; i++) {
    const a = rand(0, Math.PI * 2), r = rand(1, 3.2);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.13, 8, 6), M(0xff9a2e, { emissive: 0xff7a10, emissiveIntensity: 2 }));
    p.position.set(-7.5 + Math.cos(a) * r, rand(4.5, 7.5), -60 + Math.sin(a) * r); scene.add(p);
  }
  glow(0xff9a40, 8, scene, -7.5, 6, -60, .35);
  const lp = new THREE.PointLight(0xff9a40, 1.5, 14, 2); lp.position.set(-6, 5, -60); scene.add(lp);
  // decorations
  for (let i = 0; i < 26; i++) { const m = makeMushroom(pick([0x37e0d0, 0x9b5cff, 0x4be1ff]), rand(.7, 1.6)); m.position.set(pick([-1, 1]) * rand(3, 8), 0, rand(-115, 4)); scene.add(m); }
  for (let i = 0; i < 14; i++) { const p = makePumpkin(rand(.3, .55), Math.random() < .6, false); p.position.set(pick([-1, 1]) * rand(3.2, 8), 0, rand(-115, 4)); p.rotation.y = rand(-.6, .6) + (p.position.x > 0 ? -.8 : .8); scene.add(p); }
  for (let i = 0; i < 12; i++) { const gr = makeGrave(); const x = pick([-1, 1]) * rand(4, 8), z = rand(-110, 0); gr.position.set(x, 0, z); gr.rotation.y = x > 0 ? -.5 : .5; scene.add(gr); L.colliders.push({ t: 'c', x, z, r: .4 }); }
  [[3, -2], [-3.5, -45], [3.4, -95]].forEach(([x, z]) => { const t = makeTorch(2, true); t.position.set(x, 0, z); scene.add(t); });
  // welcome sign
  const sign = new THREE.Group(); sign.position.set(-3.2, 0, 0); sign.rotation.y = .5; scene.add(sign);
  mesh(new THREE.BoxGeometry(.12, 1.6, .12), M(0x4a3020), 0, .8, 0, sign);
  const sp = mesh(new THREE.BoxGeometry(1.6, .8, .08), new THREE.MeshStandardMaterial({ map: canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#6b4424'; c.fillRect(0, 0, w, h); c.strokeStyle = '#3a2210'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8); c.fillStyle = '#ffe9b0'; c.font = 'bold 40px Mali'; c.textAlign = 'center'; c.fillText('Listen', w / 2, 52); c.fillText('& Speak', w / 2, 98); }) }), 0, 1.5, 0, sign);
  L.colliders.push({ t: 'c', x: -3.2, z: 0, r: .3 });
  makeFireflies(140, [-10, 10, -118, 6]);
  // stations: lost ghosts
  const ghostColors = [0xa8e6ff, 0xb8ffc8, 0xffc4e8, 0xfff3a8, 0xd9c4ff];
  [[-2.4, -14], [2.4, -35], [-2.2, -57], [2.4, -79], [-2, -100]].forEach(([x, z], i) => {
    const gh = makeGhost(ghostColors[i], { sad: true, headphones: i === 0 });
    gh.g.position.set(x, .6, z); gh.g.scale.setScalar(.95); scene.add(gh.g);
    const mk = makeMarker(); mk.position.set(x, 2.5, z); scene.add(mk);
    L.stations.push({ pos: new THREE.Vector3(x, 0, z), npc: gh, kind: 'ghost', marker: mk, name: ['Luna', 'Pip', 'Mimi', 'Sunny', 'Violet'][i] + ' the Lost Ghost', icon: '👻' });
  });
  // traps
  [-25, -68].forEach((z, i) => {
    const p = makePumpkin(.6, true, false); p.position.set(0, 0, z); scene.add(p);
    L.traps.push({ kind: 'roll', obj: p, z, ph: i * 2, update(t) { const x = Math.sin(t * .9 + this.ph) * 7; this.obj.position.x = x; this.obj.rotation.z = -x * 1.2; }, hit(pp) { const o = this.obj.position; return Math.hypot(pp.x - o.x, pp.z - o.z) < .95 && pp.y < .75; } });
  });
  [-46, -89].forEach((z, i) => {
    const gh = makeGhost(0x6a3aa8, {}); gh.mat.emissiveIntensity = .7; gh.g.scale.setScalar(1.2); scene.add(gh.g);
    gh.eyes.children.forEach(e => { if (e.material) e.material = M(0xff2040, { emissive: 0xff2040, emissiveIntensity: 2 }); });
    L.traps.push({ kind: 'ghost', obj: gh.g, z, ph: i * 3, update(t) { this.obj.position.set(Math.sin(t * .8 + this.ph) * 6.5, .7 + Math.sin(t * 3) * .2, z + Math.sin(t * 1.6 + this.ph) * 1.2); this.obj.rotation.y = Math.cos(t * .8 + this.ph) > 0 ? Math.PI / 2 : -Math.PI / 2; }, hit(pp) { const o = this.obj.position; return Math.hypot(pp.x - o.x, pp.z - o.z) < 1.0 && pp.y < 1.8; } });
  });
  // coins
  for (let z = -4; z > -112; z -= 4.5) { const c = makeCoin(); const x = Math.sin(z * .3) * 2.5; c.position.set(x, 1, z); scene.add(c); L.coins.push({ g: c, taken: false }); }
  return L;
}

/* ---------- LEVEL 2: SPOOKY CASTLE ---------- */
function makeGate(z) {
  const g = new THREE.Group(); g.position.z = z; scene.add(g);
  const stone = new THREE.MeshStandardMaterial({ map: brickTex([1, 3]), roughness: .9 });
  [-7.4, 7.4].forEach(x => mesh(new THREE.BoxGeometry(1.4, 7, 1.6), stone, x, 3.5, 0, g));
  const arch = mesh(new THREE.BoxGeometry(16.2, 1.6, 1.6), stone, 0, 6.6, 0, g);
  const bars = new THREE.Group(); g.add(bars);
  const iron = M(0x2a2438, { metalness: .7, roughness: .4 });
  for (let x = -6.3; x <= 6.31; x += .7) mesh(new THREE.BoxGeometry(.12, 5.8, .12), iron, x, 2.9, 0, bars);
  for (let y = .8; y < 5.8; y += 1.2) mesh(new THREE.BoxGeometry(13, .12, .14), iron, 0, y, 0, bars);
  for (let x = -6.3; x <= 6.31; x += .7) mesh(new THREE.ConeGeometry(.1, .3, 4), iron, x, -.05, 0, bars).rotation.x = Math.PI;
  const lock = mesh(new THREE.TorusGeometry(.35, .1, 8, 16), M(0xb26bff, { emissive: 0x9b5cff, emissiveIntensity: 1.6 }), 0, 2.9, .2, bars, false);
  const lg = glow(0xb26bff, 2.4, bars, 0, 2.9, .3, .8);
  return { g, bars, lock, open: false, openT: 0, z };
}
function buildCastle() {
  newScene('#120a32', '#3a1a6e', '#5a2a7e', 0x2a1550, .018);
  const sun = addLights({ sky: 0x9a7cff, ground: 0x3a2050, hemi: .95, moon: 0xd0c0ff, moonI: .9 });
  moonAndSky(0xffe9d0, [-40, 55, -170]);
  const L = { colliders: [], stations: [], traps: [], coins: [], gates: [], sun, bounds: { x0: -6.4, x1: 6.4, z0: -106, z1: 6 }, spawn: new THREE.Vector3(0, 0, 3), gemPos: new THREE.Vector3(0, 1.4, -100) };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 120), new THREE.MeshStandardMaterial({ map: cobbleTex('#4a4466', '#1d1830', [3, 22]), roughness: .85 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -50; floor.receiveShadow = true; scene.add(floor);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(200, 260), M(0x1a1230)); outer.rotation.x = -Math.PI / 2; outer.position.set(0, -.02, -50); scene.add(outer);
  // walls
  const wallMat = new THREE.MeshStandardMaterial({ map: brickTex([30, 3]), roughness: .9 });
  [-8.5, 8.5].forEach(x => { const w = mesh(new THREE.BoxGeometry(1.5, 7, 120), wallMat, x, 3.5, -50, scene); });
  // crenellations + towers + banners + torches
  for (let z = 6; z > -108; z -= 2) [-8.5, 8.5].forEach(x => mesh(new THREE.BoxGeometry(1.5, .8, .9), M(0x3a2c5c), x, 7.4, z, scene));
  const roof = M(0x2a1a4e);
  for (let z = 0; z > -110; z -= 22) [-10, 10].forEach(x => {
    mesh(new THREE.CylinderGeometry(2, 2.2, 13, 10), new THREE.MeshStandardMaterial({ map: brickTex([3, 3]), roughness: .9 }), x, 6.5, z, scene);
    mesh(new THREE.ConeGeometry(2.6, 4.5, 10), roof, x, 15.2, z, scene);
    mesh(new THREE.BoxGeometry(.6, 1, .1), M(0xffd27a, { emissive: 0xffa030, emissiveIntensity: 1.5 }), x + (x > 0 ? -1.9 : 1.9), 9, z, scene, false).rotation.y = Math.PI / 2;
  });
  let bi = 0;
  for (let z = -6; z > -104; z -= 12) [-7.7, 7.7].forEach(x => {
    const syms = ['☾', '✦', '❖', '♜'];
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.8), new THREE.MeshStandardMaterial({ map: bannerTex(pick(['#4a1f7a', '#6a1f4a', '#2a2f7a']), '#ffc83d', syms[bi++ % 4]), transparent: true, side: THREE.DoubleSide }));
    b.position.set(x, 4.4, z); b.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(b);
  });
  let ti = 0;
  for (let z = -2; z > -104; z -= 9) [-7.4, 7.4].forEach(x => { const t = makeTorch(2.4, (ti++ % 3) === 0); t.position.set(x, 0, z); scene.add(t); });
  // distant castle silhouette
  for (let i = 0; i < 9; i++) { const x = rand(-40, 40), z = rand(-170, -130); const h = rand(15, 40); mesh(new THREE.CylinderGeometry(rand(2, 4), rand(3, 5), h, 8), M(0x1c1238), x, h / 2, z, scene, false); mesh(new THREE.ConeGeometry(rand(3, 5), rand(6, 10), 8), M(0x140c2a), x, h + 4, z, scene, false); }
  // courtyard tree at the end
  const tree = new THREE.Group(); tree.position.set(0, 0, -103.5); scene.add(tree);
  const tk = twistedTrunk(6, 1.2, .6, 0x5a3a5e); tk.position.y = 3; tree.add(tk);
  for (let i = 0; i < 9; i++) mesh(new THREE.IcosahedronGeometry(rand(1.3, 2.2), 0), M(pick([0xa6305a, 0xc23b7a, 0x8e2f6b])), rand(-3, 3), rand(6, 8.5), rand(-2, 2), tree);
  L.colliders.push({ t: 'c', x: 0, z: -103.5, r: 1.4 });
  [[-3, -101], [3.2, -101.5], [-5, -98]].forEach(([x, z]) => { const p = makePumpkin(.5, true); p.position.set(x, 0, z); scene.add(p); });
  for (let i = 0; i < 10; i++) { const p = makePumpkin(rand(.25, .4), Math.random() < .5, false); p.position.set(pick([-1, 1]) * rand(5.6, 6.6), 0, rand(-95, 2)); p.rotation.y = p.position.x > 0 ? -1.2 : 1.2; scene.add(p); }
  // gates
  [-28, -56, -84].forEach(z => { const gt = makeGate(z); L.gates.push(gt); L.colliders.push({ t: 'b', x0: -8, x1: 8, z0: z - .3, z1: z + .3, gate: gt }); });
  // stations: spelling ghosts with signs
  const SPOS = [[-3, -10], [3, -20], [-3, -38], [3, -48], [-3, -66], [3, -76]];
  SPOS.forEach(([x, z], i) => {
    const gh = makeGhost(0xf0eaff, { hat: true }); gh.g.position.set(x, .6, z); scene.add(gh.g);
    const sg = new THREE.Group(); sg.position.set(.55, .1, .35); sg.rotation.z = -.15; gh.g.add(sg);
    mesh(new THREE.BoxGeometry(.06, .9, .06), M(0x6b4424), 0, -.2, 0, sg);
    mesh(new THREE.BoxGeometry(.7, .5, .04), new THREE.MeshStandardMaterial({ map: canvasTex(128, 96, (c, w, h) => { c.fillStyle = '#ffe9b0'; c.fillRect(0, 0, w, h); c.fillStyle = '#5a2a9e'; c.font = 'bold 30px Mali'; c.textAlign = 'center'; c.fillText('Spell', w / 2, 40); c.fillText('it!', w / 2, 76); }) }), 0, .25, .04, sg);
    const mk = makeMarker(); mk.position.set(x, 2.6, z); scene.add(mk);
    L.stations.push({ pos: new THREE.Vector3(x, 0, z), npc: gh, kind: 'ghost', marker: mk, name: ['Sir Boo', 'Lady Wisp', 'Professor Ghoul', 'Captain Glow', 'Madam Mist', 'Old Spooks'][i], icon: '👻' });
  });
  // traps: spikes and axes
  [-33, -61, -89].forEach((z, i) => {
    const grp = new THREE.Group(); grp.position.z = z; scene.add(grp);
    const plate = mesh(new THREE.BoxGeometry(12.6, .05, 2.2), M(0x3a2030, { emissive: 0xff2040, emissiveIntensity: 0 }), 0, .03, 0, grp);
    const sp = new THREE.Group(); grp.add(sp);
    for (let x = -6; x <= 6; x += .6) for (let zz = -.8; zz <= .8; zz += .55) mesh(new THREE.ConeGeometry(.12, .6, 5), M(0xc9c4d8, { metalness: .8, roughness: .3 }), x, .3, zz, sp);
    L.traps.push({ kind: 'spikes', grp, sp, plate, z, ph: i * 1.3, up: false, update(t) {
      const c = (t + this.ph) % 3.2; this.up = c > 1.9; const warn = c > 1.4 && c <= 1.9;
      this.sp.position.y = this.up ? 0 : (warn ? -.35 : -.62);
      this.plate.material.emissiveIntensity = warn ? .8 + Math.sin(t * 30) * .5 : (this.up ? .5 : 0);
    }, hit(pp) { return this.up && Math.abs(pp.z - z) < 1.15 && pp.y < .45; } });
  });
  [-44, -72].forEach((z, i) => {
    const piv = new THREE.Group(); piv.position.set(0, 6.4, z); scene.add(piv);
    mesh(new THREE.CylinderGeometry(.06, .06, 4.6, 6), M(0x5a4a3a), 0, -2.3, 0, piv);
    const bl = new THREE.Shape(); bl.moveTo(0, .5); bl.quadraticCurveTo(1, .2, .9, -.6); bl.lineTo(0, -.2); bl.lineTo(-.9, -.6); bl.quadraticCurveTo(-1, .2, 0, .5);
    const blade = mesh(new THREE.ExtrudeGeometry(bl, { depth: .08, bevelEnabled: false }), M(0xd8d4e8, { metalness: .9, roughness: .25 }), 0, -4.7, -.04, piv);
    mesh(new THREE.BoxGeometry(12.6, .03, .4), M(0x6a1f2f, { emissive: 0x6a1020, emissiveIntensity: .4 }), 0, .02, z, scene, false);
    L.traps.push({ kind: 'axe', piv, blade, z, ph: i * 1.7, update(t) { this.piv.rotation.z = Math.sin(t * 1.5 + this.ph) * 1.15; }, hit(pp) { const a = this.piv.rotation.z; const bx = Math.sin(a) * 4.7, by = 6.4 - Math.cos(a) * 4.7; return Math.abs(pp.z - z) < .55 && Math.abs(pp.x - bx) < 1.0 && pp.y < by + .2 && pp.y + 1.6 > by - .6; } });
  });
  for (let z = -4; z > -98; z -= 4) { if ([-28, -56, -84].some(g => Math.abs(g - z) < 1.5)) continue; const c = makeCoin(); c.position.set(Math.sin(z * .4) * 4, 1, z); scene.add(c); L.coins.push({ g: c, taken: false }); }
  makeFireflies(60, [-6, 6, -104, 4], 0xffb0ff);
  return L;
}

/* ---------- LEVEL 3: WITCH'S CHAMBER ---------- */
function buildChamber() {
  newScene('#120818', '#2a1030', '#3a1838', 0x2a1028, .02);
  const sun = addLights({ sky: 0xffa070, ground: 0x3a1a40, hemi: .75, moon: 0xffd0a0, moonI: .55, amb: 0x402030 });
  const R = 18;
  const L = { colliders: [], stations: [], traps: [], coins: [], sun, round: R - 1.2, spawn: new THREE.Vector3(0, 0, 13), gemPos: new THREE.Vector3(0, 1.4, 4.2) };
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 64), new THREE.MeshStandardMaterial({ map: canvasTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#3a2a2a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) for (let j = 0; j < 40; j++) { c.fillStyle = `rgb(${70 + rand(-12, 12)},${50 + rand(-10, 10)},${45 + rand(-10, 10)})`; c.fillRect(i * 26 + 1, j * 26 + 1, 24, 24); }
    c.translate(w / 2, h / 2); c.strokeStyle = 'rgba(255,170,60,.85)'; c.lineWidth = 6; c.shadowColor = '#ff9a2e'; c.shadowBlur = 20;
    [300, 360, 420].forEach(r => { c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.stroke(); });
    c.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 4 / 5; c.lineTo(Math.cos(a) * 360, Math.sin(a) * 360); } c.stroke();
    c.font = 'bold 34px serif'; c.fillStyle = 'rgba(255,190,90,.9)'; const runes = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    for (let i = 0; i < 36; i++) { c.save(); c.rotate(i / 36 * Math.PI * 2); c.fillText(runes[i % runes.length], -10, -380); c.restore(); }
  }), roughness: .85 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 12, 48, 1, true), new THREE.MeshStandardMaterial({ map: brickTex([12, 3], [70, 44, 60]), side: THREE.BackSide, roughness: .9 }));
  wall.position.y = 6; scene.add(wall);
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(R, 48), M(0x1a0d1a)); ceil.rotation.x = Math.PI / 2; ceil.position.y = 12; scene.add(ceil);
  // bookshelves & windows around wall
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2; if (Math.abs(Math.sin(a) + 1) < .15) continue; // leave north for the door
    const x = Math.cos(a) * (R - .7), z = Math.sin(a) * (R - .7);
    const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = -a - Math.PI / 2; scene.add(grp);
    if (i % 2 === 0) {
      mesh(new THREE.BoxGeometry(3, 4.5, .8), M(0x4a2a1a), 0, 2.25, 0, grp);
      for (let s = 0; s < 4; s++) for (let b = 0; b < 9; b++) { const bh = rand(.6, .85); mesh(new THREE.BoxGeometry(.25, bh, .5), M(pick([0x8e2f4b, 0x2f5a8e, 0x3a8e5a, 0xd4a017, 0x6b3fa0])), -1.25 + b * .31, .55 + s * 1.05 + bh / 2 - .35, .2, grp, false); }
    } else {
      mesh(new THREE.BoxGeometry(1.4, 3, .2), M(0x2a3a7a, { emissive: 0x3a5aff, emissiveIntensity: .8 }), 0, 5.5, .3, grp, false);
      mesh(new THREE.BoxGeometry(.08, 3, .25), M(0x1a1020), 0, 5.5, .35, grp, false);
      mesh(new THREE.BoxGeometry(1.4, .08, .25), M(0x1a1020), 0, 5.5, .35, grp, false);
      const c = makeCandle(.4); c.position.set(-.5, 1.4, .3); grp.add(c); const c2 = makeCandle(.3); c2.position.set(.4, 1.4, .3); grp.add(c2);
      mesh(new THREE.BoxGeometry(1.6, .1, .6), M(0x4a2a1a), 0, 1.35, .25, grp);
    }
  }
  // cauldron
  const cg = new THREE.Group(); scene.add(cg);
  const pot = mesh(new THREE.SphereGeometry(1.5, 24, 16, 0, Math.PI * 2, Math.PI * .3, Math.PI * .7), M(0x1b1530, { metalness: .6, roughness: .4, side: THREE.DoubleSide }), 0, 1.5, 0, cg);
  mesh(new THREE.TorusGeometry(1.2, .14, 10, 28), M(0x2a2438, { metalness: .7, roughness: .3 }), 0, 2.4, 0, cg).rotation.x = Math.PI / 2;
  const liquidMat = new THREE.MeshStandardMaterial({ color: 0x7b3fe4, emissive: 0x7b3fe4, emissiveIntensity: 1.2 });
  const liquid = mesh(new THREE.CircleGeometry(1.15, 28), liquidMat, 0, 2.3, 0, cg, false); liquid.rotation.x = -Math.PI / 2;
  [0, 2.1, 4.2].forEach(a => mesh(new THREE.CylinderGeometry(.1, .1, .6, 6), M(0x1b1530), Math.cos(a) * 1, .3, Math.sin(a) * 1, cg));
  const cl = new THREE.PointLight(0x9b5cff, 2.5, 16, 2); cl.position.set(0, 3.2, 0); cg.add(cl);
  const cglow = glow(0x9b5cff, 6, cg, 0, 2.6, 0, .6);
  const fire = []; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const f = mesh(new THREE.ConeGeometry(.2, .6, 6), new THREE.MeshBasicMaterial({ color: 0xff6a10 }), Math.cos(a) * .6, .3, Math.sin(a) * .6, cg, false); fire.push(f); }
  L.colliders.push({ t: 'c', x: 0, z: 0, r: 2.0 });
  L.cauldron = { cg, liquidMat, cl, cglow, fire, bubbles: [] };
  // final door (north)
  const door = new THREE.Group(); door.position.set(0, 0, -R + .5); scene.add(door);
  const dstone = new THREE.MeshStandardMaterial({ map: brickTex([1, 2], [80, 60, 90]) });
  [-2.2, 2.2].forEach(x => mesh(new THREE.BoxGeometry(1, 6.5, 1.2), dstone, x, 3.25, 0, door));
  mesh(new THREE.TorusGeometry(2.2, .5, 8, 20, Math.PI), dstone, 0, 6.3, 0, door);
  const leafM = M(0x4a2a1a, { roughness: .8 });
  const leaves = [-1, 1].map(s => { const piv = new THREE.Group(); piv.position.set(s * 1.7, 0, 0); door.add(piv); mesh(new THREE.BoxGeometry(1.7, 6.2, .2), leafM, -s * .85, 3.1, 0, piv); return piv; });
  const sockets = [0x4be1ff, 0xb26bff, 0xff9a2e].map((c, i) => { const s = mesh(new THREE.OctahedronGeometry(.25), M(0x333344, { emissive: 0x000000 }), (i - 1) * .9, 6.8, .5, door, false); s.scale.y = 1.4; s.userData.c = c; return s; });
  L.door = { door, leaves, sockets, open: false, openT: 0 };
  L.colliders.push({ t: 'b', x0: -2, x1: 2, z0: -R, z1: -R + 1.2, doorBlock: true });
  // stations: 4 ingredient pedestals + witch guardian + mirror ghost
  const pedColors = [0x4be1ff, 0x3fd27a, 0xff4d6d, 0xffc83d];
  [[-8, -5], [8, -5], [-8.5, 6], [8.5, 6]].forEach(([x, z], i) => {
    const p = new THREE.Group(); p.position.set(x, 0, z); scene.add(p);
    mesh(new THREE.CylinderGeometry(.6, .8, 1.1, 8), M(0x5a4a6a), 0, .55, 0, p);
    const bottle = new THREE.Group(); bottle.position.y = 1.1; p.add(bottle);
    mesh(new THREE.SphereGeometry(.28, 14, 10), new THREE.MeshStandardMaterial({ color: pedColors[i], emissive: pedColors[i], emissiveIntensity: 1, transparent: true, opacity: .85 }), 0, .3, 0, bottle);
    mesh(new THREE.CylinderGeometry(.08, .1, .25, 8), M(0xdddddd, { transparent: true, opacity: .7 }), 0, .62, 0, bottle);
    mesh(new THREE.CylinderGeometry(.09, .09, .08, 8), M(0x6b4424), 0, .76, 0, bottle);
    glow(pedColors[i], 1.6, bottle, 0, .3, 0, .6);
    L.colliders.push({ t: 'c', x, z, r: .8 });
    const mk = makeMarker(); mk.position.set(x, 2.6, z); scene.add(mk);
    L.stations.push({ pos: new THREE.Vector3(x, 0, z), npc: { g: p, bottle }, kind: 'pedestal', marker: mk, name: ['Moonlight Dew', 'Toad Tears', 'Dragon Pepper', 'Golden Honey'][i] + ' 🧪', icon: '🧪', color: pedColors[i] });
  });
  const witch = makeWitch({ robe: 0x3a1a4e, hat: 0x1a0d2a, hair: 0xd8d8e8 }); witch.g.scale.setScalar(1.35); witch.g.position.set(-3.5, 0, -12.5); witch.g.rotation.y = .35; scene.add(witch.g);
  L.colliders.push({ t: 'c', x: -3.5, z: -12.5, r: .7 });
  const mk1 = makeMarker(); mk1.position.set(-3.5, 3.4, -12.5); scene.add(mk1);
  L.stations.push({ pos: new THREE.Vector3(-3.5, 0, -12.5), npc: witch, kind: 'witch', marker: mk1, name: 'Grimelda the Guardian Witch', icon: '🧙‍♀️' });
  const mirror = new THREE.Group(); mirror.position.set(3.8, 0, -12.5); mirror.rotation.y = -.35; scene.add(mirror);
  mesh(new THREE.BoxGeometry(1.8, 2.8, .2), M(0xd4a017, { metalness: .7, roughness: .3 }), 0, 1.6, 0, mirror);
  mesh(new THREE.PlaneGeometry(1.4, 2.4), M(0x9ab8ff, { emissive: 0x5a7aff, emissiveIntensity: .6, metalness: .9, roughness: .1 }), 0, 1.6, .11, mirror, false);
  const mg = makeGhost(0xd0e4ff, {}); mg.g.scale.setScalar(.6); mg.g.position.set(0, 1.3, .2); mirror.add(mg.g);
  L.colliders.push({ t: 'c', x: 3.8, z: -12.5, r: .8 });
  const mk2 = makeMarker(); mk2.position.set(3.8, 3.6, -12.5); scene.add(mk2);
  L.stations.push({ pos: new THREE.Vector3(3.8, 0, -12.5), npc: mg, kind: 'mirror', marker: mk2, name: 'The Mirror Spirit', icon: '🪞' });
  // traps: flying books (jump), flame jets (avoid)
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Group(); scene.add(b);
    mesh(new THREE.BoxGeometry(.7, .18, .5), M(pick([0x8e2f4b, 0x2f5a8e, 0x6b3fa0])), 0, 0, 0, b);
    mesh(new THREE.BoxGeometry(.66, .14, .46), M(0xfff3d6), .03, 0, 0, b, false);
    L.traps.push({ kind: 'book', obj: b, ph: i * Math.PI * 2 / 3, update(t) { const a = t * .55 + this.ph; this.obj.position.set(Math.cos(a) * 12, .45 + Math.abs(Math.sin(t * 4 + i)) * .2, Math.sin(a) * 12); this.obj.rotation.y = -a; this.obj.rotation.z = Math.sin(t * 8) * .3; }, hit(pp) { const o = this.obj.position; return Math.hypot(pp.x - o.x, pp.z - o.z) < .75 && pp.y < .6; } });
  }
  [0, 1, 2, 3].forEach(i => {
    const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * 5, z = Math.sin(a) * 5;
    const grp = new THREE.Group(); grp.position.set(x, 0, z); scene.add(grp);
    const ring = mesh(new THREE.CylinderGeometry(.75, .75, .06, 16), M(0x3a1a1a, { emissive: 0xff4a10, emissiveIntensity: .2 }), 0, .03, 0, grp, false);
    const fl = mesh(new THREE.ConeGeometry(.55, 2.6, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xff5000, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }), 0, 1.3, 0, grp, false);
    const gl = glow(0xff7a20, 3.5, grp, 0, 1.2, 0, .6);
    L.traps.push({ kind: 'flame', grp, ring, fl, gl, x, z, ph: i * .9, on: false, update(t) {
      const c = (t + this.ph) % 3.6; this.on = c > 2.2; const warn = c > 1.6 && c <= 2.2;
      this.fl.visible = this.on; this.gl.visible = this.on; this.fl.scale.set(1, 1 + Math.sin(t * 20) * .1, 1);
      this.ring.material.emissiveIntensity = warn ? 1 + Math.sin(t * 30) * .6 : (this.on ? 1.4 : .2);
    }, hit(pp) { return this.on && Math.hypot(pp.x - x, pp.z - z) < .85; } });
  });
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const r = i % 2 ? 14 : 10.5; const c = makeCoin(); c.position.set(Math.cos(a) * r, 1, Math.sin(a) * r); scene.add(c); L.coins.push({ g: c, taken: false }); }
  for (let i = 0; i < 10; i++) { const p = makePumpkin(rand(.3, .45), true, false); const a = rand(0, Math.PI * 2); p.position.set(Math.cos(a) * 16, 0, Math.sin(a) * 16); p.lookAt(0, 0, 0); scene.add(p); }
  for (let i = 0; i < 12; i++) { const c = makeCandle(rand(.25, .6)); const a = rand(0, Math.PI * 2), r = rand(2.6, 3.4); c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); scene.add(c); }
  makeFireflies(50, [-14, 14, -14, 14], 0xffc070);
  return L;
}
