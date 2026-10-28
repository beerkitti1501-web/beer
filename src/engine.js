/* =========================================================
   3D ENGINE — Three.js
   ========================================================= */
let renderer, scene, camera, clock;
const MAT = {};
function M(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!MAT[key]) MAT[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .8, metalness: 0, flatShading: true }, o));
  return MAT[key];
}
function mesh(geo, mat, x = 0, y = 0, z = 0, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  if (parent) parent.add(m); return m;
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
let GLOW_TEX = null;
function glowTex() {
  if (!GLOW_TEX) GLOW_TEX = canvasTex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });
  return GLOW_TEX;
}
function glow(color, size, parent, x = 0, y = 0, z = 0, op = .8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); if (parent) parent.add(s); return s;
}
function textSprite(text, o = {}) {
  const fs = o.size || 96;
  const tex = canvasTex(256, 256, (g, w, h) => {
    g.font = `bold ${fs}px Mali, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (o.bg) { g.fillStyle = o.bg; g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.fill(); g.lineWidth = 10; g.strokeStyle = o.stroke || '#fff'; g.stroke(); }
    g.fillStyle = o.color || '#fff'; g.fillText(text, 128, 136);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(o.scale || 1, o.scale || 1, 1); return s;
}

function initThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  $('#game').appendChild(renderer.domElement);
  camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, .1, 500);
  clock = new THREE.Clock();
  const onResize = () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); };
  addEventListener('resize', onResize); addEventListener('orientationchange', () => setTimeout(onResize, 300));
  if (window.visualViewport) visualViewport.addEventListener('resize', onResize);
}

/* ---------------- CHARACTERS ---------------- */
const OUTFITS = {
  robe_purple: { name: 'Classic Purple', robe: 0x5b2a9e, hat: 0x3a1d6e, cost: 0 },
  robe_blue: { name: 'Midnight Blue', robe: 0x1f4fa8, hat: 0x152a5e, cost: 60 },
  robe_orange: { name: 'Pumpkin Spice', robe: 0xe2671c, hat: 0x3b1a08, cost: 90 },
  robe_green: { name: 'Emerald Spell', robe: 0x1f9e5c, hat: 0x0f3d2a, cost: 120 },
  robe_rose: { name: 'Rose Moon', robe: 0xc23b7a, hat: 0x5a1a3a, cost: 150 },
  robe_gold: { name: 'Halloween Master', robe: 0x1a1030, hat: 0xd4a017, cost: 0, badge: 'Halloween Master' }
};
const PETS = {
  pet_cat: { name: 'Magic Black Cat', icon: '🐈‍⬛', cost: 0 },
  pet_bat: { name: 'Little Bat', icon: '🦇', cost: 100 },
  pet_pumpkin: { name: 'Bouncy Pumpkin', icon: '🎃', cost: 140 },
  pet_owl: { name: 'Wise Owl', icon: '🦉', cost: 0, badge: 'Halloween Master' }
};

function makeWitch(o = {}) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const skin = M(0xffd9bf, { flatShading: false, roughness: .7 });
  const robeMat = new THREE.MeshStandardMaterial({ color: o.robe || 0x5b2a9e, roughness: .75, flatShading: true });
  const hatMat = new THREE.MeshStandardMaterial({ color: o.hat || 0x3a1d6e, roughness: .7, flatShading: true });
  const hairMat = M(o.hair || 0x6b3a1f, { flatShading: false, roughness: .6 });
  const legMat = M(0x2a1b3d), bootMat = M(0x3b2416);
  const mkLeg = x => { const L = new THREE.Group(); L.position.set(x, .5, 0); body.add(L); mesh(new THREE.CylinderGeometry(.075, .065, .45, 8), legMat, 0, -.22, 0, L); mesh(new THREE.BoxGeometry(.15, .11, .26), bootMat, 0, -.45, .04, L); return L; };
  const legL = mkLeg(-.13), legR = mkLeg(.13);
  mesh(new THREE.CylinderGeometry(.2, .46, .82, 12), robeMat, 0, .82, 0, body);
  mesh(new THREE.TorusGeometry(.29, .03, 6, 16), M(0xffc83d, { metalness: .5, roughness: .4 }), 0, .95, 0, body).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.27, .24, .1, 12), M(0xffffff), 0, 1.2, 0, body); // collar
  mesh(new THREE.ConeGeometry(.07, .12, 4), M(0xd6304a), 0, 1.13, .22, body).rotation.x = Math.PI; // tie
  const mkArm = x => { const A = new THREE.Group(); A.position.set(x, 1.15, 0); body.add(A); mesh(new THREE.CylinderGeometry(.07, .09, .4, 8), robeMat, 0, -.2, 0, A); mesh(new THREE.SphereGeometry(.07, 10, 8), skin, 0, -.43, 0, A); return A; };
  const armL = mkArm(-.28), armR = mkArm(.28);
  armL.rotation.z = .15; armR.rotation.z = -.15;
  const wand = new THREE.Group(); wand.position.set(0, -.45, .05); armR.add(wand);
  mesh(new THREE.CylinderGeometry(.015, .02, .45, 6), M(0x5a3a22), 0, 0, .18, wand).rotation.x = Math.PI / 2;
  const tip = mesh(new THREE.OctahedronGeometry(.05), M(0xfff2a0, { emissive: 0xffd94a, emissiveIntensity: 1.5 }), 0, 0, .42, wand);
  const tipGlow = glow(0xffe680, .45, wand, 0, 0, .42, .9);
  // head
  const head = new THREE.Group(); head.position.y = 1.5; body.add(head);
  mesh(new THREE.SphereGeometry(.3, 22, 18), skin, 0, 0, 0, head);
  const eyeMat = M(0x1b0f2e, { flatShading: false, roughness: .3 });
  const eyes = new THREE.Group(); head.add(eyes);
  [-.1, .1].forEach(x => {
    const e = mesh(new THREE.SphereGeometry(.058, 12, 10), eyeMat, x, -.01, .26, eyes); e.scale.set(1, 1.25, .5);
    mesh(new THREE.SphereGeometry(.02, 8, 6), M(0xffffff, { emissive: 0xffffff, emissiveIntensity: .6 }), x + .02, .02, .29, eyes, false);
    mesh(new THREE.CircleGeometry(.04, 12), M(0xff9aa8, { flatShading: false, transparent: true, opacity: .6 }), x * 1.6, -.1, .255, head, false).rotation.y = x > 0 ? .5 : -.5;
  });
  const mouth = mesh(new THREE.TorusGeometry(.045, .012, 6, 12, Math.PI), M(0x9a2a3a), 0, -.1, .275, head, false); mouth.rotation.z = Math.PI;
  mesh(new THREE.SphereGeometry(.325, 20, 16), hairMat, 0, .04, -.055, head);
  mesh(new THREE.CylinderGeometry(.24, .3, .55, 14), hairMat, 0, -.3, -.13, head);
  const bang = mesh(new THREE.SphereGeometry(.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), hairMat, 0, .13, .12, head); bang.scale.set(1.35, .7, .9);
  // hat
  const hat = new THREE.Group(); hat.position.y = .27; head.add(hat);
  mesh(new THREE.CylinderGeometry(.58, .58, .04, 24), hatMat, 0, 0, 0, hat);
  mesh(new THREE.CylinderGeometry(.29, .32, .12, 16), M(0xffc83d, { metalness: .4 }), 0, .07, 0, hat);
  mesh(new THREE.CylinderGeometry(.24, .31, .45, 16), hatMat, 0, .3, 0, hat);
  const tipG = new THREE.Group(); tipG.position.y = .52; tipG.rotation.z = -.45; hat.add(tipG);
  mesh(new THREE.ConeGeometry(.24, .5, 16), hatMat, .02, .2, 0, tipG);
  mesh(new THREE.BoxGeometry(.1, .1, .02), M(0xffe27a, { metalness: .6, roughness: .3 }), 0, .08, .31, hat);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, body, legL, legR, armL, armR, head, eyes, hat, robeMat, hatMat, tip, tipGlow, wand };
}
function setOutfit(w, key) { const o = OUTFITS[key] || OUTFITS.robe_purple; w.robeMat.color.setHex(o.robe); w.hatMat.color.setHex(o.hat); }

function animWitch(w, st, t, dt) {
  const { body, legL, legR, armL, armR, eyes, g } = w;
  let tL = 0, tR = 0, aL = 0, aR = 0, by = 0, bx = 0, ry = 0, az = .15, es = 1;
  if (st.mode === 'run') {
    const ph = t * 11; tL = Math.sin(ph) * .8; tR = -tL; aL = -Math.sin(ph) * .7; aR = Math.sin(ph) * .5; by = Math.abs(Math.sin(ph)) * .07;
  } else if (st.mode === 'air') {
    tL = .6; tR = -.3; aL = -2.4; aR = -2.2; az = .5;
  } else if (st.mode === 'celebrate') {
    const ph = t * 9; aL = -2.9 + Math.sin(ph) * .3; aR = -2.9 - Math.sin(ph) * .3; az = .4; by = Math.abs(Math.sin(ph * .7)) * .35; ry = st.timer * 9;
  } else if (st.mode === 'scared') {
    aL = -2.6; aR = -2.6; az = .7; bx = Math.sin(t * 70) * .035; es = 1.5; tL = .3; tR = -.3;
  } else {
    aL = Math.sin(t * 2) * .05; aR = -aL; by = Math.sin(t * 2.2) * .012;
  }
  const k = Math.min(1, dt * 14);
  legL.rotation.x = lerp(legL.rotation.x, tL, k); legR.rotation.x = lerp(legR.rotation.x, tR, k);
  armL.rotation.x = lerp(armL.rotation.x, aL, k); armR.rotation.x = lerp(armR.rotation.x, aR, k);
  armL.rotation.z = lerp(armL.rotation.z, az, k); armR.rotation.z = lerp(armR.rotation.z, -az, k);
  body.position.y = lerp(body.position.y, by, k); body.position.x = bx;
  body.rotation.y = st.mode === 'celebrate' ? ry : lerp(body.rotation.y, 0, k);
  eyes.scale.setScalar(lerp(eyes.scale.x, es, k));
  w.tipGlow.material.opacity = .6 + Math.sin(t * 6) * .3;
}

function makeGhost(color = 0xffffff, o = {}) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: .35, roughness: .5, transparent: true, opacity: .93, side: THREE.DoubleSide });
  mesh(new THREE.SphereGeometry(.45, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, .5, 0, g);
  const sk = new THREE.CylinderGeometry(.45, .55, .62, 22, 4, true);
  const p = sk.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -.3) { const a = Math.atan2(p.getZ(i), p.getX(i)); p.setY(i, y + Math.sin(a * 7) * .08); } }
  sk.computeVertexNormals(); mesh(sk, mat, 0, .19, 0, g);
  const eyeM = M(0x1b0f2e, { flatShading: false, roughness: .3 });
  const eyes = new THREE.Group(); g.add(eyes);
  [-.15, .15].forEach(x => {
    const e = mesh(new THREE.SphereGeometry(.07, 12, 10), eyeM, x, .55, .4, eyes, false); e.scale.set(1, 1.35, .5);
    mesh(new THREE.SphereGeometry(.025, 8, 6), M(0xffffff, { emissive: 0xffffff }), x + .025, .59, .43, eyes, false);
    mesh(new THREE.CircleGeometry(.05, 12), M(0xff8fb0, { transparent: true, opacity: .55, flatShading: false }), x * 1.7, .43, .42, g, false).rotation.y = x > 0 ? .6 : -.6;
  });
  const mouth = mesh(new THREE.SphereGeometry(.055, 10, 8), eyeM, 0, .41, .43, g, false); mouth.scale.set(1, o.sad ? .5 : .8, .4);
  const armM = mat;
  const arms = [-.5, .5].map(x => mesh(new THREE.SphereGeometry(.11, 10, 8), armM, x, .3, .05, g));
  if (o.hat) {
    const h = new THREE.Group(); h.position.set(.05, .92, 0); h.rotation.z = -.2; g.add(h);
    mesh(new THREE.CylinderGeometry(.32, .32, .03, 18), M(0x3a1d6e), 0, 0, 0, h);
    mesh(new THREE.ConeGeometry(.2, .45, 14), M(0x5b2a9e), 0, .23, 0, h);
  }
  if (o.headphones) {
    const hp = mesh(new THREE.TorusGeometry(.47, .04, 8, 20, Math.PI), M(0x2f8cff), 0, .55, 0, g); hp.rotation.z = 0;
    [-.47, .47].forEach(x => mesh(new THREE.CylinderGeometry(.11, .11, .1, 14), M(0xffa53d), x, .55, 0, g).rotation.z = Math.PI / 2);
  }
  const gl = glow(color, 2.2, g, 0, .45, 0, .35);
  g.traverse(m => { if (m.isMesh) m.castShadow = false; });
  return { g, mat, eyes, arms, mouth, glow: gl };
}

function makeCat() {
  const g = new THREE.Group(); const m = M(0x1b1622, { flatShading: false, roughness: .5 });
  const b = mesh(new THREE.SphereGeometry(.2, 14, 10), m, 0, .25, 0, g); b.scale.set(.9, .85, 1.4);
  const head = new THREE.Group(); head.position.set(0, .45, .25); g.add(head);
  mesh(new THREE.SphereGeometry(.16, 14, 12), m, 0, 0, 0, head);
  [-.09, .09].forEach(x => {
    mesh(new THREE.ConeGeometry(.06, .13, 4), m, x, .15, 0, head);
    mesh(new THREE.SphereGeometry(.035, 8, 8), M(0xc6ff4a, { emissive: 0x9cff00, emissiveIntensity: 1 }), x * .8, .02, .13, head, false);
  });
  const legs = [[-.1, .2], [.1, .2], [-.1, -.2], [.1, -.2]].map(([x, z]) => mesh(new THREE.CylinderGeometry(.04, .04, .2, 6), m, x, .1, z, g));
  const tail = new THREE.Group(); tail.position.set(0, .3, -.27); g.add(tail);
  for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(.045 - i * .003, 8, 6), m, 0, i * .07, -Math.sin(i * .4) * .1, tail);
  mesh(new THREE.TorusGeometry(.13, .02, 6, 14), M(0xa64dff, { emissive: 0x7b3fe4, emissiveIntensity: .8 }), 0, .34, .18, g).rotation.x = Math.PI / 2.4;
  return { g, tail, legs, head };
}
function makeBat() {
  const g = new THREE.Group(); const m = M(0x2a1b3d, { flatShading: false });
  mesh(new THREE.SphereGeometry(.13, 12, 10), m, 0, 0, 0, g);
  [-.05, .05].forEach(x => mesh(new THREE.SphereGeometry(.025, 6, 6), M(0xff3b5c, { emissive: 0xff2040 }), x, .03, .11, g, false));
  [-.05, .05].forEach(x => mesh(new THREE.ConeGeometry(.03, .08, 4), m, x, .13, 0, g));
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(.35, .12); shape.lineTo(.3, -.02); shape.lineTo(.22, .03); shape.lineTo(.15, -.06); shape.lineTo(.08, 0); shape.lineTo(0, -.05);
  const wm = new THREE.MeshStandardMaterial({ color: 0x4b2a6e, side: THREE.DoubleSide });
  const wl = new THREE.Mesh(new THREE.ShapeGeometry(shape), wm); wl.position.x = .08; g.add(wl);
  const wr = new THREE.Mesh(new THREE.ShapeGeometry(shape), wm); wr.scale.x = -1; wr.position.x = -.08; g.add(wr);
  return { g, wl, wr };
}
function makeOwl() {
  const g = new THREE.Group(); const m = M(0x8a5a32, { flatShading: false });
  const b = mesh(new THREE.SphereGeometry(.18, 12, 10), m, 0, 0, 0, g); b.scale.set(1, 1.2, .9);
  [-.07, .07].forEach(x => { mesh(new THREE.SphereGeometry(.06, 10, 8), M(0xfff3c4), x, .08, .13, g, false); mesh(new THREE.SphereGeometry(.03, 8, 6), M(0x111111), x, .08, .18, g, false); });
  mesh(new THREE.ConeGeometry(.025, .06, 4), M(0xffb02e), 0, .02, .18, g).rotation.x = Math.PI / 2;
  const wl = mesh(new THREE.SphereGeometry(.1, 8, 6), m, -.17, 0, 0, g); wl.scale.set(.4, 1, .8);
  const wr = mesh(new THREE.SphereGeometry(.1, 8, 6), m, .17, 0, 0, g); wr.scale.set(.4, 1, .8);
  return { g, wl, wr };
}

/* ---------------- PROPS ---------------- */
function pumpkinGeo(r) {
  const geo = new THREE.SphereGeometry(r, 18, 12); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const k = 1 + .09 * Math.cos(a * 8); p.setXYZ(i, x * k, y * .78, z * k); }
  geo.computeVertexNormals(); return geo;
}
const _pgeo = {};
function makePumpkin(r = .4, lit = true, glowOn = true) {
  const g = new THREE.Group();
  const key = r.toFixed(2); if (!_pgeo[key]) _pgeo[key] = pumpkinGeo(r);
  mesh(_pgeo[key], M(0xff7a1a, { flatShading: false, roughness: .55, emissive: 0x3a1000, emissiveIntensity: .4 }), 0, r * .78, 0, g);
  mesh(new THREE.CylinderGeometry(r * .08, r * .12, r * .35, 6), M(0x4a6b1f), 0, r * 1.62, 0, g).rotation.z = .2;
  if (lit) {
    const fm = M(0xffd36b, { emissive: 0xffb020, emissiveIntensity: 2, flatShading: true });
    [-1, 1].forEach(s => { const e = mesh(new THREE.CircleGeometry(r * .2, 3), fm, s * r * .36, r * .95, r * .92, g, false); e.rotation.z = Math.PI / 2 + s * .25; });
    const ms = new THREE.Shape(); const w = r * .55, h = r * .2;
    ms.moveTo(-w, 0); for (let i = 0; i <= 6; i++) ms.lineTo(-w + i * (2 * w / 6), (i % 2 ? -h * .5 : -h * 1.4)); ms.lineTo(w, 0); for (let i = 6; i >= 0; i--) ms.lineTo(-w + i * (2 * w / 6), i % 2 ? h * .3 : 0);
    mesh(new THREE.ShapeGeometry(ms), fm, 0, r * .62, r * .95, g, false);
    if (glowOn) glow(0xffa030, r * 4, g, 0, r * .8, r * .5, .45);
  }
  return g;
}
function twistedTrunk(h, r0, r1, color) {
  const geo = new THREE.CylinderGeometry(r1, r0, h, 7, 6); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h + .5; const a = y * 1.6; const x = p.getX(i), z = p.getZ(i); p.setX(i, x * Math.cos(a) - z * Math.sin(a) + Math.sin(y * 3) * .15); p.setZ(i, x * Math.sin(a) + z * Math.cos(a)); }
  geo.computeVertexNormals(); return new THREE.Mesh(geo, M(color || 0x3b2a33));
}
const LEAF_COLORS = [0x7a2a5a, 0x8e2f4b, 0x4b2a6e, 0xa63a3a, 0x5e2a7e];
function makeTree(h = 4, bare = false, s = 1) {
  const g = new THREE.Group();
  const t = twistedTrunk(h, .38 * s, .12 * s); t.position.y = h / 2; t.castShadow = true; g.add(t);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.04 * s, .1 * s, 1.4 * s, 5), M(0x3b2a33));
    const a = i * 2.1 + Math.random(); b.position.set(Math.cos(a) * .4, h * (.6 + i * .1), Math.sin(a) * .4);
    b.rotation.z = Math.cos(a) * .9; b.rotation.x = -Math.sin(a) * .9; b.castShadow = true; g.add(b);
  }
  if (!bare) {
    const n = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const c = mesh(new THREE.IcosahedronGeometry(rand(.8, 1.3) * s, 0), M(pick(LEAF_COLORS)), rand(-1, 1) * s, h + rand(-.4, .8), rand(-1, 1) * s, g);
      c.rotation.set(rand(0, 3), rand(0, 3), 0);
    }
  }
  return g;
}
function makeMushroom(color = 0x37e0d0, s = 1) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(.05 * s, .08 * s, .35 * s, 6), M(0xeae0ff, { emissive: 0x554477, emissiveIntensity: .3 }), 0, .17 * s, 0, g, false);
  mesh(new THREE.SphereGeometry(.22 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(color, { emissive: color, emissiveIntensity: 1.1, flatShading: false }), 0, .32 * s, 0, g, false);
  glow(color, .9 * s, g, 0, .4 * s, 0, .5);
  return g;
}
function makeGrave() {
  const g = new THREE.Group(); const m = M(0x6b6880);
  mesh(new THREE.BoxGeometry(.6, .7, .14), m, 0, .35, 0, g);
  mesh(new THREE.CylinderGeometry(.3, .3, .14, 14, 1, false, 0, Math.PI), m, 0, .7, 0, g).rotation.set(Math.PI / 2, 0, Math.PI / 2);
  mesh(new THREE.BoxGeometry(.06, .3, .02), M(0x3d3a4d), 0, .5, .08, g, false);
  mesh(new THREE.BoxGeometry(.2, .06, .02), M(0x3d3a4d), 0, .55, .08, g, false);
  g.rotation.z = rand(-.12, .12); return g;
}
const torches = [];
function makeTorch(h = 2.2, light = false) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(.05, .07, h, 6), M(0x2a2030), 0, h / 2, 0, g);
  mesh(new THREE.CylinderGeometry(.16, .08, .2, 8), M(0x4a3a2a, { metalness: .5 }), 0, h, 0, g);
  const f = mesh(new THREE.ConeGeometry(.12, .4, 8), new THREE.MeshBasicMaterial({ color: 0xff8a20 }), 0, h + .25, 0, g, false);
  const gl = glow(0xff9a30, 1.8, g, 0, h + .25, 0, .7);
  if (light) { const L = new THREE.PointLight(0xff9a40, 1.4, 9, 2); L.position.set(0, h + .4, 0); g.add(L); }
  torches.push({ f, gl, ph: Math.random() * 10 });
  return g;
}
function makeCandle(h = .3) {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(.05, .05, h, 8), M(0xfff3d6, { flatShading: false }), 0, h / 2, 0, g, false);
  const f = mesh(new THREE.ConeGeometry(.03, .1, 6), new THREE.MeshBasicMaterial({ color: 0xffa030 }), 0, h + .06, 0, g, false);
  const gl = glow(0xffb040, .6, g, 0, h + .06, 0, .7);
  torches.push({ f, gl, ph: Math.random() * 10 });
  return g;
}
function makeCoin() {
  const g = new THREE.Group();
  const c = mesh(new THREE.CylinderGeometry(.25, .25, .06, 18), M(0xffc83d, { metalness: .8, roughness: .25, emissive: 0x6a4a00, emissiveIntensity: .7, flatShading: false }), 0, 0, 0, g);
  c.rotation.x = Math.PI / 2;
  mesh(new THREE.TorusGeometry(.17, .025, 6, 16), M(0xffe58a, { metalness: .8, roughness: .2 }), 0, 0, .035, g, false);
  return g;
}
function makeCrystal(color) {
  const g = new THREE.Group();
  const c = mesh(new THREE.OctahedronGeometry(.45, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.3, metalness: .3, roughness: .1, transparent: true, opacity: .92, flatShading: true }), 0, 0, 0, g);
  c.scale.set(.8, 1.4, .8);
  glow(color, 3.2, g, 0, 0, 0, .8);
  const L = new THREE.PointLight(color, 2, 8, 2); g.add(L);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 30, 16, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 15; g.add(beam);
  return g;
}
function makePortal(color = 0x9b5cff) {
  const g = new THREE.Group();
  mesh(new THREE.TorusGeometry(1.4, .14, 10, 36), M(color, { emissive: color, emissiveIntensity: 1.5 }), 0, 1.6, 0, g, false);
  const sw = new THREE.Mesh(new THREE.CircleGeometry(1.3, 36), new THREE.MeshBasicMaterial({ map: canvasTex(256, 256, (c, w, h) => {
    const r = c.createRadialGradient(128, 128, 10, 128, 128, 128); r.addColorStop(0, '#ffffff'); r.addColorStop(.3, '#c9a2ff'); r.addColorStop(1, '#3a0d7a'); c.fillStyle = r; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 6; for (let i = 0; i < 5; i++) { c.beginPath(); for (let a = 0; a < 12; a += .1) { const rr = a * 9; c.lineTo(128 + Math.cos(a + i * 1.25) * rr, 128 + Math.sin(a + i * 1.25) * rr); } c.stroke(); }
  }), transparent: true, opacity: .9, side: THREE.DoubleSide }));
  sw.position.y = 1.6; g.add(sw); g.userData.swirl = sw;
  glow(color, 5, g, 0, 1.6, 0, .5);
  return g;
}
function moonAndSky(color = 0xfff1c9, pos = [30, 45, -160]) {
  const moon = new THREE.Mesh(new THREE.SphereGeometry(12, 32, 24), new THREE.MeshBasicMaterial({ color }));
  moon.position.set(...pos); scene.add(moon);
  const gl = glow(0xfff0c0, 70, null, ...pos, .55); scene.add(gl);
  const n = 700, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * .45, r = 220; arr[i * 3] = r * Math.sin(ph) * Math.cos(th); arr[i * 3 + 1] = r * Math.cos(ph) + 10; arr[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, sizeAttenuation: true, transparent: true, opacity: .8, fog: false })));
}
function skyTexture(top, mid, bottom) {
  return canvasTex(16, 256, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, top); r.addColorStop(.55, mid); r.addColorStop(1, bottom); g.fillStyle = r; g.fillRect(0, 0, w, h); });
}
function groundTex(base, spots) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) { g.fillStyle = pick(spots); g.globalAlpha = rand(.15, .5); const s = rand(2, 9); g.fillRect(rand(0, w), rand(0, h), s, s); }
    g.globalAlpha = 1;
  }, [20, 20]);
}
function cobbleTex(base = '#4a4466', line = '#231f33', rep = [2, 20]) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = line; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 42) for (let x = (y / 42 % 2) * -30; x < w; x += 60) {
      const c = 70 + Math.floor(rand(-14, 14)); g.fillStyle = `rgb(${c - 4},${c - 8},${c + 22})`;
      if (base !== '#4a4466') g.fillStyle = base;
      g.beginPath(); const rx = x + 4, ry = y + 4, rw = 52 + rand(-4, 4), rh = 34; const r = 12;
      g.moveTo(rx + r, ry); g.arcTo(rx + rw, ry, rx + rw, ry + rh, r); g.arcTo(rx + rw, ry + rh, rx, ry + rh, r); g.arcTo(rx, ry + rh, rx, ry, r); g.arcTo(rx, ry, rx + rw, ry, r); g.fill();
      g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(rx + 6, ry + 4, rw - 14, 6);
    }
  }, rep);
}
function brickTex(rep = [4, 2], hue = [58, 44, 92]) {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#1c1430'; g.fillRect(0, 0, w, h);
    for (let y = 0, row = 0; y < h; y += 32, row++) for (let x = row % 2 ? -32 : 0; x < w; x += 64) {
      const v = rand(-10, 10); g.fillStyle = `rgb(${hue[0] + v},${hue[1] + v},${hue[2] + v})`; g.fillRect(x + 2, y + 2, 60, 28);
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x + 2, y + 24, 60, 6);
    }
  }, rep);
}
function bannerTex(c1, c2, sym) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = c1; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * .85); g.lineTo(w / 2, h); g.lineTo(0, h * .85); g.fill();
    g.strokeStyle = c2; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h * .7);
    g.fillStyle = c2; g.font = 'bold 70px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sym, w / 2, h * .42);
  });
}

/* ---------------- PARTICLES ---------------- */
const bursts = [];
function burst(pos, color = 0xffd94a, n = 40, speed = 4) {
  const geo = new THREE.BufferGeometry(); const arr = new Float32Array(n * 3); const vel = [];
  for (let i = 0; i < n; i++) { arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y; arr[i * 3 + 2] = pos.z; vel.push(new THREE.Vector3(rand(-1, 1), rand(.3, 1.6), rand(-1, 1)).normalize().multiplyScalar(rand(.4, 1) * speed)); }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.PointsMaterial({ color, size: .22, map: glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const pts = new THREE.Points(geo, mat); scene.add(pts);
  bursts.push({ pts, vel, life: 1.3 });
}
function updateBursts(dt) {
  for (let k = bursts.length - 1; k >= 0; k--) {
    const b = bursts[k]; b.life -= dt; const p = b.pts.geometry.attributes.position;
    for (let i = 0; i < b.vel.length; i++) { b.vel[i].y -= 5 * dt; p.setXYZ(i, p.getX(i) + b.vel[i].x * dt, p.getY(i) + b.vel[i].y * dt, p.getZ(i) + b.vel[i].z * dt); }
    p.needsUpdate = true; b.pts.material.opacity = Math.max(0, b.life);
    if (b.life <= 0) { scene.remove(b.pts); b.pts.geometry.dispose(); bursts.splice(k, 1); }
  }
}
let fireflies = null;
function makeFireflies(n, box, color = 0xd8ff7a) {
  const geo = new THREE.BufferGeometry(); const arr = new Float32Array(n * 3); const base = [];
  for (let i = 0; i < n; i++) { const v = [rand(box[0], box[1]), rand(.5, 4), rand(box[2], box[3])]; base.push(v); arr.set(v, i * 3); }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: .25, map: glowTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts); fireflies = { pts, base };
}
function updateFireflies(t) {
  if (!fireflies) return; const p = fireflies.pts.geometry.attributes.position;
  fireflies.base.forEach((b, i) => p.setXYZ(i, b[0] + Math.sin(t * .7 + i) * .8, b[1] + Math.sin(t * 1.3 + i * 2) * .4, b[2] + Math.cos(t * .5 + i) * .8));
  p.needsUpdate = true;
}
