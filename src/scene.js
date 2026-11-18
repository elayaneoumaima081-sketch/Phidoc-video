import * as THREE from 'three';
import { LINES, CHIPS, DURATION } from './timeline.js';

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const range = (t, a, b) => clamp((t - a) / (b - a));
const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeBack = (k) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const win = (t, s, e, fi = 0.25, fo = 0.25) => Math.min(range(t, s, s + fi), 1 - range(t, e - fo, e));
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer / scene ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d0b0e');
scene.fog = new THREE.Fog('#0d0b0e', 6, 14);
const camera = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.05, 50);

scene.add(new THREE.HemisphereLight('#ffe9d6', '#2a2230', 0.9));
const key = new THREE.DirectionalLight('#fff1e0', 2.4);
key.position.set(1.8, 3.6, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -1, near: 0.5, far: 9 });
key.shadow.bias = -0.0004;
key.shadow.radius = 4;
scene.add(key);
const rim = new THREE.DirectionalLight('#9fe3d6', 1.2);
rim.position.set(-2.5, 2.2, -2.5);
scene.add(rim);
const fill = new THREE.PointLight('#ffb27a', 1.6, 6, 1.6);
fill.position.set(-1.6, 1.8, 1.4);
scene.add(fill);

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
function mesh(geo, mat, pos, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  m.castShadow = shadow; m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}

// ---------- room ----------
mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), M('#1a1519', { roughness: 1 }), V(0, 0, 0));
mesh(new THREE.PlaneGeometry(30, 12), M('#120f13', { roughness: 1 }), V(0, 5, -3));
const deskMat = M('#b8703c', { roughness: 0.55 });
mesh(new THREE.BoxGeometry(3.6, 0.06, 1.1), deskMat, V(0, 0.75, -0.1));
for (const x of [-1.7, 1.7]) mesh(new THREE.BoxGeometry(0.07, 0.75, 1.0), M('#7c4a28'), V(x, 0.375, -0.1));
const DESK_Y = 0.78;

// bokeh lights in the background (like the reference)
function bokehTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,.95)'); gr.addColorStop(0.75, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
const bt = bokehTex();
const R0 = rng(7);
const bokehs = [];
for (let i = 0; i < 22; i++) {
  const warm = R0() < 0.75;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, color: warm ? '#ffd9a8' : '#bfe9ff', transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  sp.position.set((R0() - 0.5) * 6, 1.4 + R0() * 3.2, -2.6 - R0() * 0.3);
  const s = 0.14 + R0() * 0.12; sp.scale.set(s, s, 1);
  sp.userData.ph = R0() * 6.28; scene.add(sp); bokehs.push(sp);
}

// desk props
const laptop = new THREE.Group(); laptop.position.set(-1.15, DESK_Y, -0.25); laptop.rotation.y = 0.75; scene.add(laptop);
mesh(new THREE.BoxGeometry(0.5, 0.025, 0.34), M('#9aa3ab', { metalness: 0.4, roughness: 0.4 }), V(0, 0.012, 0), laptop);
const lid = new THREE.Group(); lid.position.set(0, 0.025, -0.17); lid.rotation.x = -0.25; laptop.add(lid);
mesh(new THREE.BoxGeometry(0.5, 0.33, 0.02), M('#9aa3ab', { metalness: 0.4, roughness: 0.4 }), V(0, 0.165, 0), lid);
mesh(new THREE.PlaneGeometry(0.46, 0.29), M('#bfe7ff', { emissive: '#7cc6e8', emissiveIntensity: 0.9 }), V(0, 0.165, 0.011), lid, false);
const mug = new THREE.Group(); mug.position.set(-0.95, DESK_Y, 0.25); scene.add(mug);
mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.14, 20), M('#f2efe8'), V(0, 0.07, 0), mug);
mesh(new THREE.TorusGeometry(0.035, 0.011, 8, 16), M('#f2efe8'), V(0.065, 0.075, 0), mug);
mesh(new THREE.CircleGeometry(0.052, 20).rotateX(-Math.PI / 2), M('#4a2a17'), V(0, 0.13, 0), mug, false);
const books = new THREE.Group(); books.position.set(1.3, DESK_Y, -0.2); books.rotation.y = -0.3; scene.add(books);
['#e9e2d4', '#d9cdb8', '#efe8da', '#7fd1c0'].forEach((c, i) => mesh(new THREE.BoxGeometry(0.42, 0.05, 0.3), M(c), V(0, 0.026 + i * 0.052, 0), books).rotation.y = (i % 2 ? 0.08 : -0.06));

// ---------- the PhD student ----------
const skin = M('#d9a57c', { roughness: 0.7 });
const shirt = M('#16161a', { roughness: 0.85 });
const hairM = M('#141414', { roughness: 0.95 });
const blackGloss = M('#0c0c0c', { roughness: 0.35 });

const boy = new THREE.Group(); boy.position.set(-0.5, 0, -0.72); boy.rotation.y = 0.22; scene.add(boy);
// chair
mesh(new THREE.BoxGeometry(0.55, 0.06, 0.5), M('#2d2a30'), V(0, 0.5, -0.05), boy);
mesh(new THREE.BoxGeometry(0.55, 0.75, 0.06), M('#2d2a30'), V(0, 0.9, -0.32), boy);
const torso = new THREE.Group(); boy.add(torso);
mesh(new THREE.CapsuleGeometry(0.2, 0.32, 8, 24), shirt, V(0, 0.98, 0), torso).scale.set(1.05, 1, 0.78);
// collar + buttons
for (const s of [-1, 1]) { const c = mesh(new THREE.BoxGeometry(0.1, 0.07, 0.018), shirt, V(s * 0.055, 1.23, 0.12), torso); c.rotation.set(-0.35, s * 0.35, s * 0.6); }
for (let i = 0; i < 4; i++) mesh(new THREE.SphereGeometry(0.011, 8, 6), M('#3a3a40'), V(0, 1.16 - i * 0.09, 0.157 - Math.abs(i - 1) * 0.004), torso, false);
mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16), skin, V(0, 1.27, 0), torso);
mesh(new THREE.ConeGeometry(0.06, 0.08, 3).rotateX(Math.PI), skin, V(0, 1.215, 0.11), torso, false).scale.set(1, 1, 0.3);

const head = new THREE.Group(); head.position.set(0, 1.46, 0.0); torso.add(head);
mesh(new THREE.SphereGeometry(0.25, 40, 32), skin, V(0, 0, 0), head).scale.set(1, 1.03, 0.95);
for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.05, 16, 12), skin, V(s * 0.245, -0.01, -0.01), head).scale.set(0.5, 1, 0.8);
// smooth, matte black hair
const cap = mesh(new THREE.SphereGeometry(0.265, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.52), hairM, V(0, 0.02, -0.015), head);
cap.rotation.x = -0.5; cap.scale.set(1.03, 1.04, 1.02);
// side-swept fringe that hugs the forehead (no brim)
const fringe = mesh(new THREE.SphereGeometry(0.272, 40, 16, 0, Math.PI * 2, 0, Math.PI * 0.27), hairM, V(0, 0.01, 0.0), head); fringe.rotation.set(0.1, 0, -0.3);
for (const s of [-1, 1]) { const sb = mesh(new THREE.SphereGeometry(0.12, 20, 12), hairM, V(s * 0.205, 0.04, -0.06), head); sb.scale.set(0.42, 0.95, 0.95); }
// eyes
const eyes = new THREE.Group(); head.add(eyes);
const eyeWhite = M('#ffffff', { roughness: 0.3 });
const pupilM = M('#1b120c', { roughness: 0.2 });
const pupils = [];
for (const s of [-1, 1]) {
  const e = new THREE.Group(); e.position.set(s * 0.088, 0.015, 0.205); eyes.add(e);
  mesh(new THREE.SphereGeometry(0.046, 20, 16), eyeWhite, V(0, 0, 0), e, false).scale.set(1, 1.1, 0.6);
  const p = mesh(new THREE.SphereGeometry(0.026, 16, 12), pupilM, V(0, -0.003, 0.024), e, false); p.scale.set(1, 1.1, 0.5);
  mesh(new THREE.SphereGeometry(0.007, 8, 6), M('#ffffff', { emissive: '#ffffff' }), V(0.01, 0.012, 0.012), p, false);
  pupils.push(p); e.userData.side = s;
}
const brows = [-1, 1].map((s) => { const b = mesh(new THREE.BoxGeometry(0.075, 0.016, 0.02), hairM, V(s * 0.088, 0.105, 0.225), head, false); b.userData.s = s; return b; });
mesh(new THREE.SphereGeometry(0.03, 16, 12), M('#cf9670'), V(0, -0.045, 0.245), head, false).scale.set(1, 0.9, 0.8);
// glasses
const glasses = new THREE.Group(); head.add(glasses);
for (const s of [-1, 1]) {
  const rimG = mesh(new THREE.TorusGeometry(0.068, 0.009, 10, 40), blackGloss, V(s * 0.09, 0.012, 0.248), glasses, false); rimG.scale.set(1.05, 0.9, 1);
  mesh(new THREE.CircleGeometry(0.066, 32), new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.12, roughness: 0.1 }), V(s * 0.09, 0.012, 0.249), glasses, false);
  const arm = mesh(new THREE.BoxGeometry(0.008, 0.01, 0.24), blackGloss, V(s * 0.232, 0.02, 0.125), glasses, false); arm.rotation.y = s * 0.12;
}
mesh(new THREE.BoxGeometry(0.045, 0.009, 0.01), blackGloss, V(0, 0.03, 0.25), glasses, false);
// mouth
const mouthOpen = mesh(new THREE.SphereGeometry(0.05, 20, 12), M('#5c1f22', { roughness: 0.6 }), V(0, -0.125, 0.222), head, false);
const smile = mesh(new THREE.TorusGeometry(0.042, 0.008, 8, 24, Math.PI), M('#5c1f22'), V(0, -0.105, 0.232), head, false); smile.rotation.z = Math.PI;
const frown = mesh(new THREE.TorusGeometry(0.035, 0.008, 8, 24, Math.PI), M('#5c1f22'), V(0, -0.145, 0.228), head, false);
const sweat = mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: '#8fd3ff', roughness: 0.1, transparent: true, opacity: 0.9 }), V(0.2, 0.12, 0.17), head, false);
sweat.scale.set(0.8, 1.3, 0.8);
// arms
function makeArm(s) {
  const sh = new THREE.Group(); sh.position.set(s * 0.255, 1.17, 0); torso.add(sh);
  mesh(new THREE.SphereGeometry(0.07, 16, 12), shirt, V(0, 0, 0), sh);
  mesh(new THREE.CapsuleGeometry(0.062, 0.2, 6, 14), shirt, V(0, -0.15, 0), sh);
  const el = new THREE.Group(); el.position.set(0, -0.3, 0); sh.add(el);
  mesh(new THREE.CapsuleGeometry(0.056, 0.18, 6, 14), shirt, V(0, -0.12, 0), el);
  mesh(new THREE.SphereGeometry(0.058, 16, 12), skin, V(0, -0.27, 0), el).scale.set(0.9, 1.1, 0.75);
  return { sh, el, s };
}
const arms = [makeArm(-1), makeArm(1)];
const POSES = {
  desk:  { sx: -0.38, sz: 0.12, ex: -1.3, ez: 0.0 },
  panic: { sx: -0.15, sz: 2.35, ex: 0.0, ez: 1.55 },
  relax: { sx: 0.55, sz: 2.55, ex: 0.0, ez: 1.9 },
  ask:   { sx: -0.9, sz: 0.1, ex: -1.4, ez: 0.0 },
};
function poseArms(a, b, k, t) {
  for (const arm of arms) {
    const P = (n) => lerp(POSES[a][n], POSES[b][n], k);
    arm.sh.rotation.set(P('sx'), 0, arm.s * P('sz'));
    arm.el.rotation.set(P('ex'), 0, arm.s * P('ez'));
  }
}

// ---------- Baahith ----------
const teal = M('#7cc6b6', { flatShading: true, roughness: 0.7 });
const tealDark = M('#6ab4a4', { flatShading: true, roughness: 0.7 });
const peach = M('#f6b9a0', { flatShading: true, emissive: '#f19a7a', emissiveIntensity: 0.2 });
const bot = new THREE.Group(); scene.add(bot);
const botBody = new THREE.Group(); bot.add(botBody);
mesh(new THREE.IcosahedronGeometry(0.24, 1), teal, V(0, 0.33, 0), botBody).scale.set(1, 0.97, 1);
mesh(new THREE.CylinderGeometry(0.236, 0.222, 0.06, 12), tealDark, V(0, 0.16, 0), botBody);
const visor = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.13, 32, 1, true, -0.85, 1.7), new THREE.MeshStandardMaterial({ color: '#0d1113', roughness: 0.35, side: THREE.DoubleSide }), V(0, 0.29, 0), botBody, false);
for (const y of [0.355, 0.225]) mesh(new THREE.CylinderGeometry(0.253, 0.253, 0.012, 32, 1, true, -0.87, 1.74), new THREE.MeshStandardMaterial({ color: '#0a0c0d', side: THREE.DoubleSide }), V(0, y, 0), botBody, false);
const botEyes = [-1, 1].map((s) => {
  const e = mesh(new THREE.PlaneGeometry(0.048, 0.078), new THREE.MeshBasicMaterial({ color: '#ffffff' }), V(Math.sin(s * 0.3) * 0.252, 0.29, Math.cos(s * 0.3) * 0.252), botBody, false);
  e.rotation.y = s * 0.3; return e;
});
for (const s of [-1, 1]) {
  const ear = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 8), tealDark, V(s * 0.25, 0.31, -0.01), botBody); ear.rotation.z = Math.PI / 2;
  if (s > 0) mesh(new THREE.BoxGeometry(0.015, 0.05, 0.04), peach, V(0.29, 0.31, 0.0), botBody);
}
mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8), M('#b9bfc2', { metalness: 0.6, roughness: 0.3 }), V(0, 0.64, 0), botBody);
const tip = mesh(new THREE.IcosahedronGeometry(0.042, 0), peach, V(0, 0.76, 0), botBody);
const feet = [-1, 1].map((s) => { const f = mesh(new THREE.DodecahedronGeometry(0.075, 0), teal, V(s * 0.1, 0.045, 0.03), bot); f.scale.set(1, 0.6, 1.25); return f; });
const BOT_HOME = V(0.55, DESK_Y, -0.02);

// ---------- papers ----------
const R = rng(42);
const NP = 42;
const paperGeo = new THREE.BoxGeometry(0.28, 0.008, 0.38);
const papers = [];
for (let i = 0; i < NP; i++) {
  const m = mesh(paperGeo, M(['#f7f3ea', '#efe9dc', '#fbfaf6'][i % 3], { roughness: 0.9 }), V(0, -5, 0));
  // little "text lines" on top of each sheet
  m.userData = { drop: 0.25 + i * 0.075, ox: (R() - 0.5) * 0.08, oz: (R() - 0.5) * 0.08, ry: (R() - 0.5) * 0.9, spin: (R() - 0.5) * 6, k: i % 3, fly: 13.9 + i * 0.06, sx: (R() - 0.5) * 1.5 };
  papers.push(m);
}
const PILE = V(0.0, DESK_Y, -0.12);

// folders (collections)
function labelTex(text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#ffffff'; g.font = '900 96px Cairo'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.fillText(text, 256, 138);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const FOLDERS = [
  { label: 'الفصل 1', color: '#4fae9b', pos: V(-0.55, 1.78, 0.15) },
  { label: 'الفصل 2', color: '#e98f6f', pos: V(0.0, 1.9, 0.15) },
  { label: 'الفصل 3', color: '#8d7ad6', pos: V(0.55, 1.78, 0.15) },
];
const folders = FOLDERS.map((f) => {
  const g = new THREE.Group(); g.position.copy(f.pos); scene.add(g);
  const mat = M(f.color, { roughness: 0.6 });
  mesh(new THREE.BoxGeometry(0.4, 0.28, 0.05), mat, V(0, 0, 0), g);
  mesh(new THREE.BoxGeometry(0.15, 0.05, 0.05), mat, V(-0.12, 0.16, 0), g);
  const lab = mesh(new THREE.PlaneGeometry(0.4, 0.2), new THREE.MeshBasicMaterial({ map: null, transparent: true }), V(0, -0.01, 0.027), g, false);
  f.lab = lab; f.group = g; return f;
});

// ---------- camera shots ----------
const SHOTS = [
  { s: 0,    e: 5.5,  p: [V(0.05, 1.7, 4.9), V(0.0, 1.62, 4.1)], t: [V(0, 1.25, -0.3), V(-0.1, 1.22, -0.3)] },
  { s: 5.5,  e: 7.0,  p: [V(0.15, 1.6, 4.1), V(0.2, 1.58, 3.8)], t: [V(0.1, 1.2, -0.25), V(0.15, 1.2, -0.25)] },
  { s: 7.0,  e: 11.5, p: [V(0.95, 1.3, 2.35), V(0.88, 1.3, 2.15)], t: [V(0.5, 1.3, -0.05), V(0.5, 1.3, -0.05)] },
  { s: 11.5, e: 13.5, p: [V(-0.22, 1.55, 1.25), V(-0.24, 1.54, 1.1)], t: [V(-0.45, 1.36, -0.7), V(-0.45, 1.36, -0.7)] },
  { s: 13.5, e: 18.0, p: [V(0.0, 1.75, 3.7), V(0.0, 1.75, 3.4)], t: [V(0.0, 1.55, -0.2), V(0.0, 1.55, -0.2)] },
  { s: 18.0, e: 23.0, p: [V(1.0, 1.3, 2.45), V(0.92, 1.3, 2.25)], t: [V(0.45, 1.33, -0.05), V(0.45, 1.33, -0.05)] },
  { s: 23.0, e: 25.5, p: [V(-0.7, 1.5, 1.2), V(-0.68, 1.5, 1.0)], t: [V(-0.45, 1.36, -0.7), V(-0.45, 1.36, -0.7)] },
  { s: 25.5, e: 30.0, p: [V(0.05, 1.55, 3.3), V(0.05, 1.53, 3.0)], t: [V(0.0, 1.5, -0.3), V(0.0, 1.48, -0.3)] },
  { s: 30.0, e: 32.5, p: [V(-0.2, 1.58, 1.2), V(-0.22, 1.56, 1.05)], t: [V(-0.45, 1.36, -0.7), V(-0.45, 1.36, -0.7)] },
  { s: 32.5, e: 36.5, p: [V(0.95, 1.3, 2.35), V(0.88, 1.3, 2.15)], t: [V(0.48, 1.32, -0.05), V(0.48, 1.32, -0.05)] },
  { s: 36.5, e: 38.8, p: [V(0.0, 1.62, 3.8), V(-0.05, 1.6, 3.5)], t: [V(-0.05, 1.25, -0.3), V(-0.1, 1.25, -0.3)] },
  { s: 38.8, e: 41.0, p: [V(-0.05, 1.5, 2.3), V(-0.05, 1.5, 2.0)], t: [V(-0.05, 1.35, -0.4), V(-0.05, 1.35, -0.4)] },
  { s: 41.0, e: 45.0, p: [V(0.55, 1.55, 2.5), V(0.55, 1.55, 2.3)], t: [V(0.55, 1.62, -0.02), V(0.55, 1.62, -0.02)] },
];
function updateCamera(t) {
  const sh = SHOTS.find((x) => t >= x.s && t < x.e) || SHOTS[SHOTS.length - 1];
  const k = easeIO(range(t, sh.s, sh.e));
  camera.position.lerpVectors(sh.p[0], sh.p[1], k);
  const tg = new THREE.Vector3().lerpVectors(sh.t[0], sh.t[1], k);
  // gentle handheld drift
  camera.position.x += Math.sin(t * 0.9) * 0.008; camera.position.y += Math.sin(t * 1.3 + 1) * 0.006;
  // zoom punch on the joke
  if (t > 38.8 && t < 41) { const p = easeOut(range(t, 39.4, 39.7)); camera.position.lerp(V(-0.25, 1.5, 1.2), p * 0.5); tg.lerp(V(-0.45, 1.38, -0.7), p * 0.5); }
  camera.lookAt(tg);
}

// ---------- talking ----------
function talk(t, who) {
  for (const L of LINES) {
    if (L.who !== who || t < L.s || t > L.e) continue;
    const n = L.text.split(' ').length; const f = ((t - L.s) / (L.e - L.s)) * n; const fr = f - Math.floor(f);
    return Math.pow(Math.sin(Math.PI * fr), 0.7) * (0.55 + 0.45 * Math.abs(Math.sin(t * 21)));
  }
  return 0;
}

// ---------- per-frame animation ----------
function animate3D(t) {
  // bokeh twinkle
  for (const b of bokehs) b.material.opacity = 0.6 + 0.3 * Math.sin(t * 1.2 + b.userData.ph);

  // --- boy expression / pose
  const boyTalk = talk(t, 'boy');
  let pose = ['desk', 'desk', 0];
  const pk = (a, b, k) => (pose = [a, b, k]);
  if (t < 1.2) pk('desk', 'panic', easeIO(range(t, 0.9, 1.4)));
  else if (t < 6.2) pk('desk', 'panic', 1 - easeIO(range(t, 5.6, 6.2)));
  else if (t >= 11.5 && t < 13.5) pk('desk', 'ask', easeIO(range(t, 11.5, 11.9)) * (1 - easeIO(range(t, 13.1, 13.5))));
  else if (t >= 30.1 && t < 32.5) pk('desk', 'ask', easeIO(range(t, 30.1, 30.5)) * (1 - easeIO(range(t, 32.1, 32.5))));
  else if (t >= 36.5 && t < 39.4) pk('desk', 'relax', easeIO(range(t, 36.6, 37.3)));
  else if (t >= 39.4 && t < 41.5) pk('relax', 'panic', easeIO(range(t, 39.4, 39.7)));
  else if (t >= 41.5) pk('panic', 'desk', easeIO(range(t, 41.5, 42.2)));
  poseArms(pose[0], pose[1], pose[2], t);

  const panic = (t > 1.0 && t < 6.0) || (t > 23.2 && t < 25.4) || (t > 39.4 && t < 42);
  const relaxed = t > 36.7 && t < 39.4;
  const shocked = t > 39.4 && t < 42;
  // torso lean
  let lean = 0;
  if (relaxed) lean = -0.22 * easeIO(range(t, 36.6, 37.3));
  if (t > 11.5 && t < 13.5) lean = 0.12 * Math.sin(Math.PI * range(t, 11.5, 13.5));
  torso.rotation.x = lean + Math.sin(t * 1.6) * 0.012;
  // head: shake in panic, look at Baahith when he speaks
  const botSpeaking = LINES.some((L) => L.who === 'bot' && t > L.s - 0.3 && t < L.e + 0.3);
  const lookBot = (t > 5.8 && t < 7) || botSpeaking;
  head.rotation.y = lerp(head.rotation.y || 0, lookBot ? 0.42 : 0.0, 0.18) + (t > 1.2 && t < 5.2 ? Math.sin(t * 9) * 0.12 : 0);
  head.rotation.x = -0.05 + boyTalk * 0.04 + (relaxed ? -0.18 : 0);
  head.rotation.z = Math.sin(t * 1.1) * 0.03;
  // pupils look
  for (const p of pupils) { p.position.x = (lookBot ? 0.01 : 0) + Math.sin(t * 0.7) * 0.002; p.position.y = shocked ? 0.004 : -0.003; }
  // blink
  const bp = (t * 1.0) % 3.7; const blink = bp < 0.12 ? Math.sin((bp / 0.12) * Math.PI) : 0;
  eyes.scale.y = relaxed ? 0.12 : 1 - blink * 0.9;
  eyes.scale.x = eyes.scale.z = shocked ? 1.18 : 1;
  for (const b of brows) {
    const s = b.userData.s;
    b.rotation.z = panic ? s * -0.35 : relaxed ? s * 0.1 : s * 0.12;
    b.position.y = 0.105 + (panic ? 0.02 : 0) + (shocked ? 0.025 : 0);
  }
  // mouth
  const open = shocked ? 0.85 : boyTalk;
  mouthOpen.visible = open > 0.03;
  mouthOpen.scale.set(shocked ? 0.75 : 0.9, 0.1 + open * 0.7, 0.4);
  smile.visible = !mouthOpen.visible && !panic;
  frown.visible = !mouthOpen.visible && panic;
  // glasses slip + sweat drop on the joke
  glasses.position.y = shocked ? -0.028 * easeOut(range(t, 39.45, 39.7)) : 0;
  sweat.visible = t > 39.5 && t < 41.8;
  sweat.position.set(0.215, 0.13 - 0.12 * range(t, 39.6, 41.6), 0.15);
  if (t < 6 && t > 1.2) { sweat.visible = true; sweat.position.set(-0.215, 0.14 - 0.1 * range(t, 2, 5.5), 0.15); }

  // --- Baahith
  const bt = talk(t, 'bot');
  let bx = BOT_HOME.x, by = BOT_HOME.y, bz = BOT_HOME.z, sq = 1;
  bot.visible = t > 5.4;
  if (t < 6.55) { // hop in from the right
    const k = range(t, 5.5, 6.55);
    bx = lerp(1.9, BOT_HOME.x, easeOut(k)); by = DESK_Y + Math.sin(Math.PI * k) * 0.55; bz = lerp(0.1, BOT_HOME.z, k);
  } else if (t < 7.0) { const k = range(t, 6.55, 7.0); sq = 1 - 0.28 * Math.sin(Math.PI * k) * (1 - k); }
  // happy hops while speaking
  by += bt > 0 ? Math.abs(Math.sin(t * 7)) * 0.025 : Math.sin(t * 2.2) * 0.008;
  // laughing on the joke
  if (t > 38.8 && t < 41.2) { by += Math.abs(Math.sin(t * 16)) * 0.05; }
  // outro: center + wave
  if (t > 41) { bx = lerp(BOT_HOME.x, BOT_HOME.x, 1); }
  bot.position.set(bx, by, bz);
  bot.rotation.y = (t < 6.55 ? -0.2 : -0.45) + (t > 41 ? 0.45 * easeIO(range(t, 41, 41.6)) : 0) + Math.sin(t * 1.4) * 0.05;
  if (t > 13.5 && t < 18) bot.rotation.y = lerp(-0.45, 0.1, easeIO(range(t, 13.5, 14))) ;
  botBody.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  botBody.rotation.z = (t > 41.4 ? Math.sin(t * 6) * 0.14 : 0) + (bt > 0 ? Math.sin(t * 5) * 0.04 : 0);
  // eyes: talk flicker, blinks, laugh squint
  const bb = ((t + 1.3) % 4.3) < 0.12;
  const laugh = t > 38.8 && t < 41.2;
  for (const e of botEyes) {
    e.scale.y = laugh ? 0.22 : bb ? 0.1 : 1 - bt * 0.35;
    e.scale.x = laugh ? 1.3 : 1;
  }
  peach.emissiveIntensity = 0.2 + bt * 1.4 + (t > 5.5 && t < 7.2 ? 1.2 * Math.sin(Math.PI * range(t, 6.4, 7.2)) : 0);
  tip.rotation.y = t * 2;

  // --- papers: rain down, then fly into collections
  const DROP_T = 0.55;
  for (let i = 0; i < NP; i++) {
    const p = papers[i]; const u = p.userData;
    const rest = V(PILE.x + u.ox, PILE.y + 0.006 + i * 0.0105, PILE.z + u.oz);
    if (t < u.drop) { p.visible = false; continue; }
    p.visible = true; p.scale.setScalar(1);
    if (t < u.drop + DROP_T) {
      const k = range(t, u.drop, u.drop + DROP_T);
      p.position.set(rest.x + u.sx * (1 - k) * 0.5, lerp(3.2, rest.y, k * k), rest.z + (1 - k) * 0.3);
      p.rotation.set((1 - k) * u.spin * 0.3, u.ry + (1 - k) * u.spin, (1 - k) * u.spin * 0.2);
    } else if (t < u.fly) {
      p.position.copy(rest); p.rotation.set(0, u.ry, 0);
    } else {
      const k = easeIO(range(t, u.fly, u.fly + 0.7));
      const f = FOLDERS[u.k].pos;
      p.position.set(lerp(rest.x, f.x, k), lerp(rest.y, f.y, k) + Math.sin(Math.PI * k) * 0.35, lerp(rest.z, f.z, k));
      p.rotation.set(k * 1.4, u.ry * (1 - k), k * u.spin * 0.3);
      p.scale.setScalar(1 - 0.9 * k);
      if (k >= 1) p.visible = false;
    }
  }
  for (let i = 0; i < folders.length; i++) {
    const f = folders[i];
    const show = range(t, 13.65 + i * 0.12, 14.1 + i * 0.12) * (1 - range(t, 17.7, 18.0));
    f.group.visible = show > 0.001;
    const s = easeBack(clamp(show)) * (1 + 0.08 * Math.max(0, Math.sin((t - 14) * 9)) * range(t, 14, 17) * (t < 17 ? 1 : 0));
    f.group.scale.setScalar(Math.max(0.001, s));
    f.group.rotation.y = Math.sin(t * 1.5 + i) * 0.15; f.group.position.y = f.pos.y + Math.sin(t * 2 + i) * 0.02;
  }
}

// ---------- overlays ----------
const $ = (s) => document.querySelector(s);
function show(el, v, dy = 40, sc = 0.08) {
  el.style.opacity = clamp(v * 1.2);
  const k = easeBack(clamp(v));
  el.style.transform = `translateY(${(1 - k) * dy}px) scale(${1 - sc + sc * k})`;
}
let curLine = null;
const capEl = $("#cap");
function captions(t) {
  const L = LINES.find((l) => t >= l.s - 0.1 && t <= l.e + 0.35);
  if (L !== curLine) {
    curLine = L;
    if (L) {
      capEl.querySelector('.who').className = 'who ' + L.who;
      capEl.querySelector('.who').textContent = L.who === 'bot' ? 'Baahith 🤖' : 'الطالب 🎓';
      capEl.querySelector('.txt').innerHTML = L.text.split(' ').map((w) => `<span class="w">${w}</span>`).join(' ');
    }
  }
  if (!L) { capEl.style.opacity = 0; return; }
  show(capEl, win(t, L.s - 0.1, L.e + 0.35, 0.15, 0.2), 20, 0.04);
  const ws = capEl.querySelectorAll('.w'); const n = ws.length;
  ws.forEach((w, i) => {
    const ws0 = L.s + ((L.e - L.s) * i) / n;
    w.className = 'w' + (t < ws0 ? ' hide' : '') + (t >= ws0 && t < ws0 + (L.e - L.s) / n ? ' cur ' + L.who : '');
  });
}
let curChip = null;
function chips(t) {
  const C = CHIPS.find((c) => t >= c.s && t <= c.e);
  const el = $('#chip');
  if (C !== curChip) { curChip = C; if (C) { el.querySelector('.ic').textContent = C.icon; el.querySelector('.tx').textContent = C.text; } }
  show(el, C ? win(t, C.s, C.e, 0.3, 0.2) : 0, -30, 0.25);
}
const QUERY = 'الذكاء الاصطناعي فالتشخيص الطبي';
function panels(t) {
  show($('#hook'), win(t, 0.3, 3.2, 0.35, 0.3), 60, 0.3);
  // search
  const sv = win(t, 7.3, 11.5, 0.35, 0.3); show($('#search'), sv);
  $('#search .q').textContent = QUERY.slice(0, Math.floor(QUERY.length * range(t, 7.7, 9.0)));
  $('#search .caret').style.opacity = Math.floor(t * 3) % 2 ? 1 : 0.15;
  $('#search .count').style.opacity = range(t, 8.9, 9.2);
  document.querySelectorAll('#search .res').forEach((r, i) => show(r, range(t, 9.2 + i * 0.35, 9.6 + i * 0.35), 30, 0.1));
  // evidence
  show($('#evid'), win(t, 18.3, 23.0, 0.35, 0.3));
  document.querySelectorAll('#evid .l.hl').forEach((l, i) => l.style.setProperty('--hl', easeOut(range(t, 19.2 + i * 0.35, 19.6 + i * 0.35))));
  show($('#evid .badge'), range(t, 19.9, 20.2), 20, 0.4);
  show($('#evid .q'), range(t, 20.1, 20.45), 30, 0.2);
  $('#link').setAttribute('stroke-dashoffset', 400 * (1 - easeIO(range(t, 20.4, 21.1))));
  // audit
  show($('#audit'), win(t, 25.8, 30.0, 0.35, 0.3));
  const its = document.querySelectorAll('#audit .it');
  const times = [26.6, 27.2, 27.8, 28.3];
  its.forEach((it, i) => {
    show(it, range(t, times[i] - 0.3, times[i]), 20, 0.1);
    let cls = 'it';
    if (t >= times[i]) cls += i === 2 && t < 28.9 ? ' bad' : ' ok';
    it.className = cls;
  });
  const fixed = t >= 28.9;
  its[2].querySelector('.st').textContent = fixed ? '✓' : '!';
  its[2].querySelector('.lbl').textContent = fixed ? 'الفصل 3 — تزاد المرجع' : 'الفصل 3 — مرجع ناقص';
  its[2].querySelector('.ref').textContent = fixed ? 'El Amrani, 2022' : '[?]';
  // chat
  show($('#chat'), win(t, 32.8, 36.5, 0.3, 0.3));
  show($('#chat .u'), range(t, 32.8, 33.15), 30, 0.15);
  show($('#chat .a'), range(t, 33.5, 33.85), 30, 0.15);
  const ANS = 'على حساب المجال ديالك، كنقترح ليك منهجية مختلطة 📊 ونعطيك المراجع اللي كتدعمها.';
  const k = range(t, 34.0, 35.9);
  $('#chat .ans').textContent = k > 0 ? ANS.slice(0, Math.ceil(ANS.length * k)) : '';
  $('#chat .dots').style.display = k > 0 ? 'none' : 'inline';
  document.querySelectorAll('#chat .dots span').forEach((d, i) => (d.style.transform = `translateY(${Math.sin(t * 10 - i) * 6}px)`));
  // outro
  const o = range(t, 41.0, 41.5);
  $('#outro').style.opacity = o;
  show($('#outro .logo'), range(t, 41.2, 41.6), 60, 0.4);
  show($('#outro .tag'), range(t, 41.6, 41.95), 40, 0.2);
  show($('#outro .feat'), range(t, 41.9, 42.25), 40, 0.2);
  const cta = $('#outro .cta'); show(cta, range(t, 42.3, 42.7), 40, 0.3);
  if (t > 42.7) cta.style.transform = `scale(${1 + 0.04 * Math.sin((t - 42.7) * 6)})`;
  // whip flash on the landing + outro
  $('#flash').style.opacity = 0.55 * (1 - range(t, 6.55, 6.8)) * (t >= 6.55 ? 1 : 0) + 0.6 * (1 - range(t, 41.0, 41.3)) * (t >= 41 ? 1 : 0);
}

window.renderAt = (t) => {
  t = Math.min(t, DURATION - 0.001);
  animate3D(t); updateCamera(t); renderer.render(scene, camera);
  captions(t); chips(t); panels(t);
};
window.__ready = (async () => {
  await document.fonts.load('900 60px Cairo', 'عربي'); await document.fonts.load('700 40px Cairo', 'عربي');
  await document.fonts.load('900 60px CairoLat', 'Ab'); await document.fonts.load('700 40px CairoLat', 'Ab');
  await document.fonts.ready;
  for (const f of folders) { f.lab.material.map = labelTex(f.label, f.color); f.lab.material.needsUpdate = true; }
  window.renderAt(0);
  return true;
})();
