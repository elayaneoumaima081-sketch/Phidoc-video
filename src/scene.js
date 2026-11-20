import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LINES, CHIPS, DURATION } from './timeline.js';

// Look: handmade felt & clay miniature at night. Deep blue wall, warm desk lamp,
// shallow depth of field (tilt-shift), fuzzy wool, knitted fabric, soft film grain.

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
renderer.toneMappingExposure = 1.45;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#191815'); // PhiDoc warm near-black hsl(42 8% 9%)
scene.fog = new THREE.Fog('#191815', 7, 16);
const camera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.05, 50);

// ---------- procedural handmade textures ----------
function canvasTex(w, h, draw, srgb = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
function fibers(g, w, h, n, lo, hi, alpha, seed, base) {
  const r = rng(seed); g.fillStyle = base; g.fillRect(0, 0, w, h); g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h, a = r() * Math.PI * 2, L = 4 + r() * 16, v = Math.floor(lo + r() * (hi - lo));
    g.strokeStyle = `rgba(${v},${v},${v},${alpha})`; g.lineWidth = 0.6 + r() * 1.4;
    g.beginPath(); g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.8) * L * 0.6, y + Math.sin(a + 0.8) * L * 0.6, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
  }
}
const TEX = {
  feltBump: canvasTex(512, 512, (g, w, h) => fibers(g, w, h, 16000, 40, 230, 0.55, 11, '#808080')),
  feltCol: canvasTex(512, 512, (g, w, h) => fibers(g, w, h, 9000, 185, 255, 0.45, 12, '#e8e8e8'), true),
  fuzz: canvasTex(512, 512, (g, w, h) => fibers(g, w, h, 5000, 200, 255, 0.9, 13, '#000000')),
  knit: canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) for (let x = 0; x < w; x += 16) {
      for (const s of [-1, 1]) {
        g.save(); g.translate(x + 8 + s * 3.6, y + 8); g.rotate(s * 0.55);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 7); gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(1, '#4a4a4a');
        g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 3.4, 7.2, 0, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
  }),
  clay: canvasTex(256, 256, (g, w, h) => { const r = rng(5); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 100 + r() * 60; g.fillStyle = `rgba(${v},${v},${v},.35)`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }),
  wood: canvasTex(1024, 256, (g, w, h) => {
    const r = rng(9); g.fillStyle = '#7a4a2a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { const y = r() * h; g.strokeStyle = `rgba(${40 + r() * 60},${20 + r() * 30},${10 + r() * 15},${0.25 + r() * 0.35})`; g.lineWidth = 1 + r() * 3;
      g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 * r()); g.stroke(); }
  }, true),
  sky: canvasTex(512, 640, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#061a1c'); gr.addColorStop(1, '#14504f'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const r = rng(21); for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,240,210,${0.4 + r() * 0.6})`; const s = r() < 0.15 ? 3 : 1.6; g.beginPath(); g.arc(r() * w, r() * h * 0.8, s, 0, 7); g.fill(); }
    g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(150, 170, 62, 0, 7); g.fill(); g.fillStyle = '#082022'; g.beginPath(); g.arc(178, 150, 58, 0, 7); g.fill();
    for (let i = 0; i < 26; i++) { const x = i * 22, bh = 40 + r() * 130; g.fillStyle = '#06191a'; g.fillRect(x, h - bh, 20, bh);
      for (let k = 0; k < 6; k++) if (r() < 0.5) { g.fillStyle = `rgba(255,${180 + r() * 50},${90 + r() * 40},.9)`; g.fillRect(x + 4 + (k % 2) * 8, h - bh + 8 + Math.floor(k / 2) * 14, 4, 6); } }
  }, true),
};
const rep = (t, x, y = x) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };

// materials
const felt = (color, o = {}) => {
  const { r = 2, bump = 1.2, sheen = 0.9, mix = 0.45 } = o;
  const c = new THREE.Color(color);
  return new THREE.MeshPhysicalMaterial({ color: c, map: rep(TEX.feltCol, r), bumpMap: rep(TEX.feltBump, r), bumpScale: bump, roughness: 1, sheen, sheenRoughness: 0.55, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), mix) });
};
const clayM = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: o.rough ?? 0.62, bumpMap: rep(TEX.clay, o.r ?? 3), bumpScale: o.bump ?? 0.6, sheen: 0.25, sheenColor: new THREE.Color('#ffe2c8'), clearcoat: o.cc ?? 0, clearcoatRoughness: 0.4, emissive: o.emissive ?? '#000000', emissiveIntensity: o.ei ?? 0 });
const knitM = (color, r = 6) => new THREE.MeshPhysicalMaterial({ color, map: rep(TEX.knit, r), bumpMap: rep(TEX.knit, r), bumpScale: 2.2, roughness: 1, sheen: 0.7, sheenRoughness: 0.6, sheenColor: new THREE.Color('#4a4e5a') });
const M = (color, o = {}) => clayM(color, o);

function mesh(geo, mat, pos, parent, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  m.castShadow = shadow; m.receiveShadow = true;
  (parent || scene).add(m);
  return m;
}
// wool fuzz: thin transparent fiber shells around felted shapes
function fuzz(m, color, layers = 3, step = 0.0035, r = 2) {
  const base = m.geometry;
  for (let i = 1; i <= layers; i++) {
    const g = base.clone(); const p = g.attributes.position, n = g.attributes.normal;
    for (let k = 0; k < p.count; k++) p.setXYZ(k, p.getX(k) + n.getX(k) * step * i, p.getY(k) + n.getY(k) * step * i, p.getZ(k) + n.getZ(k) * step * i);
    const mat = new THREE.MeshStandardMaterial({ color, alphaMap: rep(TEX.fuzz, r * (1 + i * 0.3)), transparent: true, opacity: 1 - i / (layers + 1.5), depthWrite: false, roughness: 1 });
    const s = new THREE.Mesh(g, mat); s.castShadow = false; s.receiveShadow = false; m.add(s);
  }
  return m;
}

// ---------- lights: warm desk lamp + cool moonlight ----------
scene.add(new THREE.HemisphereLight('#4fa3a3', '#6a3a1e', 0.45));
const keyF = new THREE.DirectionalLight('#ffe0bd', 1.6); keyF.position.set(1.2, 2.6, 3.0); scene.add(keyF);
const moon = new THREE.DirectionalLight('#9fe0dc', 0.8);
moon.position.set(-2.5, 3.2, 0.5); scene.add(moon);
const fillL = new THREE.PointLight('#ffd2a8', 3.2, 0, 2);
fillL.position.set(0.2, 1.7, 2.4); scene.add(fillL);

// ---------- room ----------
mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), felt('#191815', { r: 20, sheen: 0 }), V(0, 0, 0));
// wall in the PhiDoc brand teal (primary hsl(180 53% 23%)), with the brand's two oversized 5% white circles
const wallMat = felt('#14596a', { r: 8, bump: 0.8, sheen: 0.3, mix: 0.2 }); // a touch bluer so the warm lamp light lands on brand teal
mesh(new THREE.PlaneGeometry(12, 8), wallMat, V(0, 3, -1.6));
const circleM = new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.05, roughness: 1, depthWrite: false });
mesh(new THREE.CircleGeometry(1.5, 96), circleM, V(1.7, 3.3, -1.595), null, false);
mesh(new THREE.CircleGeometry(1.1, 96), circleM, V(-1.9, 0.9, -1.595), null, false);
const deskMat = new THREE.MeshPhysicalMaterial({ color: '#c08a5e', map: rep(TEX.wood, 2, 1), roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.5 });
mesh(new THREE.BoxGeometry(3.6, 0.07, 1.4), deskMat, V(0, 0.745, -0.25));
for (const x of [-1.7, 1.7]) mesh(new THREE.BoxGeometry(0.08, 0.75, 1.2), deskMat, V(x, 0.375, -0.25));
const DESK_Y = 0.78;

// night window with moon and a sleeping city
const windowG = new THREE.Group(); windowG.position.set(-0.95, 2.15, -1.58); scene.add(windowG);
mesh(new THREE.PlaneGeometry(0.9, 1.1), new THREE.MeshBasicMaterial({ map: TEX.sky, fog: false }), V(0, 0, 0.005), windowG, false);
const frameM = felt('#e9dcc4', { r: 1 });
for (const [x, y, w, h] of [[0, 0.57, 1.0, 0.07], [0, -0.57, 1.0, 0.07], [-0.47, 0, 0.07, 1.2], [0.47, 0, 0.07, 1.2], [0, 0, 0.04, 1.1], [0, 0.1, 0.9, 0.04]])
  mesh(new THREE.BoxGeometry(w, h, 0.06), frameM, V(x, y, 0.03), windowG);
mesh(new THREE.BoxGeometry(1.1, 0.06, 0.16), frameM, V(0, -0.62, 0.08), windowG);

// wall socket (felt) like the reference
const sock = new THREE.Group(); sock.position.set(1.05, 1.05, -1.57); scene.add(sock);
mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), clayM('#efe4cf'), V(0, 0, 0), sock);
for (const x of [-0.035, 0.035]) mesh(new THREE.BoxGeometry(0.012, 0.035, 0.01), clayM('#3a2f28'), V(x, 0.01, 0.017), sock, false);

// warm fairy lights along the wall (they turn into soft bokeh)
function glowTex() {
  return canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,.85)'); gr.addColorStop(0.6, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
}
const bt = glowTex();
const bokehs = [];
for (let i = 0; i < 16; i++) {
  const x = -0.3 + i * 0.16, y = 2.75 - Math.sin((i / 15) * Math.PI) * 0.35;
  mesh(new THREE.SphereGeometry(0.018, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffd28a' }), V(x, y, -1.54), null, false);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, color: '#ffbf6e', transparent: true, opacity: 0.8, depthWrite: false, fog: false }));
  sp.position.set(x, y, -1.53); sp.scale.set(0.16, 0.16, 1); sp.userData.ph = i * 1.7; scene.add(sp); bokehs.push(sp);
}

// desk lamp (the warm key light)
const lamp = new THREE.Group(); lamp.position.set(1.25, DESK_Y, -0.65); scene.add(lamp);
const lampM = clayM('#1d1d22', { rough: 0.45, cc: 0.4 });
mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 28), lampM, V(0, 0.02, 0), lamp);
const pole = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.75, 10), lampM, V(-0.06, 0.38, 0.05), lamp); pole.rotation.z = 0.16;
const shade = new THREE.Group(); shade.position.set(-0.2, 0.78, 0.14); shade.rotation.set(0.25, 0, 0.95); lamp.add(shade);
mesh(new THREE.ConeGeometry(0.13, 0.2, 28, 1, true), new THREE.MeshPhysicalMaterial({ color: '#1d1d22', roughness: 0.45, side: THREE.DoubleSide, clearcoat: 0.4 }), V(0, 0, 0), shade);
mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff0c8' }), V(0, -0.06, 0), shade, false);
const lampLight = new THREE.SpotLight('#ffb468', 20, 0, 1.0, 0.7, 1.5);
lampLight.position.set(1.0, DESK_Y + 0.72, -0.5); lampLight.target.position.set(-0.05, DESK_Y, -0.2);
lampLight.castShadow = true; lampLight.shadow.mapSize.set(2048, 2048); lampLight.shadow.bias = -0.0003; lampLight.shadow.radius = 6;
scene.add(lampLight, lampLight.target);
const lampGlow = new THREE.PointLight('#ff9a4a', 0.7, 2.5, 2); lampGlow.position.set(1.05, DESK_Y + 0.7, -0.45); scene.add(lampGlow);

// desk props
const laptop = new THREE.Group(); laptop.position.set(-1.15, DESK_Y, -0.25); laptop.rotation.y = 0.75; scene.add(laptop);
const lapM = clayM('#9a9ea8', { rough: 0.5 });
mesh(new THREE.BoxGeometry(0.5, 0.025, 0.34), lapM, V(0, 0.012, 0), laptop);
const lid = new THREE.Group(); lid.position.set(0, 0.025, -0.17); lid.rotation.x = -0.25; laptop.add(lid);
mesh(new THREE.BoxGeometry(0.5, 0.33, 0.02), lapM, V(0, 0.165, 0), lid);
const pdfWall = canvasTex(512, 320, (g, w, h) => {
  g.fillStyle = '#e9eef3'; g.fillRect(0, 0, w, h); g.fillStyle = '#cfd8e2'; g.fillRect(0, 0, w, 22);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const x = 14 + c * 62, y = 34 + r * 70;
    g.fillStyle = '#ffffff'; g.fillRect(x, y, 46, 58); g.fillStyle = '#d6dde5'; for (let k = 0; k < 4; k++) g.fillRect(x + 6, y + 10 + k * 9, 34, 3);
    g.fillStyle = '#d64535'; g.fillRect(x, y + 42, 26, 14); g.fillStyle = '#ffffff'; g.font = '700 10px Inter'; g.fillText('PDF', x + 3, y + 53); }
}, true);
mesh(new THREE.PlaneGeometry(0.46, 0.29), new THREE.MeshBasicMaterial({ map: pdfWall, toneMapped: false }), V(0, 0.165, 0.011), lid, false);
const mug = new THREE.Group(); mug.position.set(-0.95, DESK_Y, 0.25); scene.add(mug);
const mugM = clayM('#efe7da', { cc: 0.5 });
mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.14, 24), mugM, V(0, 0.07, 0), mug);
mesh(new THREE.TorusGeometry(0.035, 0.011, 8, 16), mugM, V(0.065, 0.075, 0), mug);
mesh(new THREE.CircleGeometry(0.052, 20).rotateX(-Math.PI / 2), clayM('#4a2a17', { cc: 1 }), V(0, 0.13, 0), mug, false);
const books = new THREE.Group(); books.position.set(1.25, DESK_Y, 0.05); books.rotation.y = -0.3; scene.add(books);
['#e9e2d4', '#c6533a', '#efe8da', '#4fa89a'].forEach((c, i) => mesh(new THREE.BoxGeometry(0.4, 0.055, 0.28), felt(c, { r: 1 }), V(0, 0.028 + i * 0.057, 0), books).rotation.y = (i % 2 ? 0.08 : -0.06));
// tiny felt plant
const plant = new THREE.Group(); plant.position.set(-1.4, DESK_Y, -0.65); scene.add(plant);
mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.12, 20), clayM('#c86b45'), V(0, 0.06, 0), plant);
for (let i = 0; i < 7; i++) { const lf = mesh(new THREE.SphereGeometry(0.05, 14, 10), felt('#3f8a5a', { r: 1 }), V(Math.cos(i) * 0.04, 0.15 + (i % 3) * 0.04, Math.sin(i) * 0.04), plant); lf.scale.set(0.6, 1.4, 0.35); lf.rotation.set(Math.sin(i) * 0.6, i, Math.cos(i) * 0.6); }

// ---------- the PhD student: sculpted stylised character (Pixar-like proportions) ----------
const ssf = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
const gauss = (x, w) => Math.exp(-(x * x) / (w * w));
const skin = new THREE.MeshPhysicalMaterial({ color: '#d9a27c', roughness: 0.5, bumpMap: rep(TEX.clay, 4), bumpScale: 0.12,
  sheen: 0.55, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ff9f84'), clearcoat: 0.06, clearcoatRoughness: 0.5 });
const skinShade = new THREE.MeshPhysicalMaterial({ color: '#c98a66', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#ff9f84') });
const shirt = new THREE.MeshPhysicalMaterial({ color: '#131418', roughness: 0.78, bumpMap: rep(TEX.clay, 14), bumpScale: 0.25,
  sheen: 0.7, sheenRoughness: 0.5, sheenColor: new THREE.Color('#3d404c') });
const blackGloss = new THREE.MeshPhysicalMaterial({ color: '#0b0b0d', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });

const boy = new THREE.Group(); boy.position.set(-0.5, 0, -0.72); boy.rotation.y = 0.22; scene.add(boy);
// chair
const chairM = felt('#5b3a2a', { r: 2 });
mesh(new THREE.BoxGeometry(0.55, 0.06, 0.5), chairM, V(0, 0.5, -0.05), boy);
mesh(new THREE.BoxGeometry(0.55, 0.75, 0.06), chairM, V(0, 0.9, -0.32), boy);
const torso = new THREE.Group(); boy.add(torso);

// torso: lathe profile (waist, chest, shoulders, neck opening), flattened front to back
const prof = [[0.0, 0.52], [0.165, 0.54], [0.18, 0.7], [0.19, 0.88], [0.2, 1.02], [0.21, 1.12], [0.2, 1.19], [0.15, 1.245], [0.085, 1.275], [0.0, 1.28]].map(([r, y]) => new THREE.Vector2(r, y));
mesh(new THREE.LatheGeometry(prof, 64), shirt, V(0, 0, 0), torso).scale.set(1, 1, 0.7);
for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.078, 24, 18), shirt, V(s * 0.205, 1.165, 0), torso).scale.set(1, 0.85, 0.85);
// placket + buttons
mesh(new THREE.BoxGeometry(0.026, 0.42, 0.006), shirt, V(0, 1.0, 0.143), torso, false);
for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.004, 16).rotateX(Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#2c2c33', roughness: 0.3, clearcoat: 1 }), V(0, 1.17 - i * 0.095, 0.148), torso, false);
// collar: band + two pointed flaps
mesh(new THREE.TorusGeometry(0.068, 0.014, 10, 40).rotateX(Math.PI / 2), shirt, V(0, 1.272, 0.0), torso).scale.set(1, 1, 0.85);
const flapShape = new THREE.Shape(); flapShape.moveTo(0, 0); flapShape.lineTo(0.075, -0.012); flapShape.lineTo(0.018, -0.07); flapShape.lineTo(0, 0);
for (const s of [-1, 1]) {
  const f = mesh(new THREE.ExtrudeGeometry(flapShape, { depth: 0.004, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.002, bevelSegments: 2 }), shirt, V(s * 0.012, 1.262, 0.1), torso);
  f.rotation.set(-0.5, s > 0 ? 0.35 : Math.PI - 0.35, 0); f.scale.set(1, 1, 1);
}
// neck
mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.12, 24), skin, V(0, 1.3, -0.005), torso);

// head: sculpted ellipsoid with a softer jaw, chin, cheeks and brow
const head = new THREE.Group(); head.position.set(0, 1.47, 0.0); torso.add(head);
function headGeometry() {
  const g = new THREE.SphereGeometry(1, 128, 96); const p = g.attributes.position; const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.set(p.getX(i), p.getY(i), p.getZ(i)).normalize();
    let { x, y, z } = d;
    let X = 0.235 * x, Y = 0.262 * y, Z = 0.238 * z;
    const lower = ssf(0.0, -1.0, y);
    X *= 1 - 0.14 * Math.pow(lower, 1.2);               // jaw narrows toward the chin
    Z *= 1 - 0.08 * lower * ssf(0, 1, z);
    Y *= 1 - 0.06 * lower;              // a little chin
    const front = ssf(0.1, 0.9, z);
    const cheek = 0.014 * gauss(y + 0.22, 0.22) * gauss(Math.abs(x) - 0.55, 0.28) * front;
    const socket = -0.01 * gauss(y - 0.08, 0.13) * gauss(Math.abs(x) - 0.36, 0.16) * front;
    const brow = 0.006 * gauss(y - 0.3, 0.1) * gauss(Math.abs(x) - 0.33, 0.25) * front;
    const r = Math.hypot(X, Y, Z), k = (r + cheek + socket + brow) / r;
    p.setXYZ(i, X * k, Y * k, Z * k);
  }
  g.computeVertexNormals(); return g;
}
mesh(headGeometry(), skin, V(0, 0, 0), head);
// ears
for (const s of [-1, 1]) {
  const ear = new THREE.Group(); ear.position.set(s * 0.228, -0.01, -0.01); ear.rotation.y = s * 0.35; head.add(ear);
  mesh(new THREE.SphereGeometry(0.05, 24, 16), skin, V(0, 0, 0), ear).scale.set(0.38, 1, 0.72);
  mesh(new THREE.SphereGeometry(0.03, 16, 12), skinShade, V(s * 0.012, 0.0, 0.01), ear, false).scale.set(0.3, 0.9, 0.6);
}

// hair: ONE seamless sculpted mesh. Smooth black hair, short on the sides and back,
// soft volume on top swept to one side; the edge tucks into the scalp so there is no seam.
const strandTex = canvasTex(1024, 512, (g, w, h) => {
  const r = rng(77); g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = r() * w, v = 70 + r() * 120; g.strokeStyle = `rgba(${v},${v},${v},${0.35 + r() * 0.4})`; g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 30, h * 0.33, x + (r() - 0.5) * 30, h * 0.66, x + (r() - 0.5) * 40, h); g.stroke();
  }
});
const hairM = new THREE.MeshPhysicalMaterial({ color: '#121114', roughness: 0.48, bumpMap: strandTex, bumpScale: 0.9,
  sheen: 0.45, sheenRoughness: 0.35, sheenColor: new THREE.Color('#3b3a44'), clearcoat: 0.08, clearcoatRoughness: 0.6 });
function hairGeometry() {
  const R0 = 0.25, g = new THREE.SphereGeometry(1, 160, 120);
  const pos = g.attributes.position, d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    d.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const { x, y, z } = d; const ax = Math.abs(x);
    const front = 0.56 + 0.08 * ssf(0.22, 0.6, ax) - 0.05 * clamp(x + 0.15) * ssf(0.6, 0.1, ax);
    const side = 0.1, back = -0.5;
    let line = z >= 0 ? lerp(side, front, Math.pow(z, 1.15)) : lerp(side, back, Math.pow(-z, 0.85));
    if (ax > 0.82 && z > -0.25 && z < 0.4) line = Math.max(line, 0.24);
    const cover = ssf(line - 0.04, line + 0.02, y);
    let th = 0.007 + 0.028 * ssf(0.3, 0.92, y);
    th += 0.045 * ssf(0.5, 0.95, y) * ssf(0.05, 0.8, z) * (0.55 + 0.6 * clamp(x + 0.4));
    th -= 0.016 * Math.exp(-Math.pow((x + 0.33) / 0.045, 2)) * ssf(0.45, 0.8, y) * ssf(-0.6, -0.2, z);
    th *= 0.25 + 0.75 * ssf(line, line + 0.16, y);
    th = Math.max(th, 0.003);
    const rad = lerp(R0 * 0.95, R0 + th, cover);
    pos.setXYZ(i, d.x * rad, d.y * rad, d.z * rad);
  }
  g.computeVertexNormals(); return g;
}
const hair = mesh(hairGeometry(), hairM, V(0, 0.004, -0.002), head);
hair.scale.set(0.955, 1.05, 0.96); // fit the sculpted head

// eyes: white sclera with a painted brown iris, glossy cornea, catchlights, and real eyelids
const irisTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = '#fbf8f3'; g.fillRect(0, 0, w, h);
  const cx = w * 0.25, cy = h * 0.5, R = 86;
  const gr = g.createRadialGradient(cx, cy, 10, cx, cy, R);
  gr.addColorStop(0, '#2a1608'); gr.addColorStop(0.35, '#6b3f1c'); gr.addColorStop(0.75, '#4a2a12'); gr.addColorStop(0.95, '#1f1006'); gr.addColorStop(1, 'rgba(30,15,5,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
  const r = rng(3); g.strokeStyle = 'rgba(150,95,45,.45)'; g.lineWidth = 1.5;
  for (let i = 0; i < 90; i++) { const a = r() * 7; g.beginPath(); g.moveTo(cx + Math.cos(a) * 34, cy + Math.sin(a) * 34); g.lineTo(cx + Math.cos(a) * 78, cy + Math.sin(a) * 78); g.stroke(); }
  g.fillStyle = '#060302'; g.beginPath(); g.arc(cx, cy, 34, 0, 7); g.fill();
}, true);
const scleraM = new THREE.MeshPhysicalMaterial({ map: irisTex, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
const eyes = new THREE.Group(); head.add(eyes);
const eyeballs = [], upperLids = [], lowerLids = [], pupils = [];
for (const s of [-1, 1]) {
  const e = new THREE.Group(); e.position.set(s * 0.083, 0.022, 0.196); eyes.add(e);
  const ball = new THREE.Group(); e.add(ball);
  mesh(new THREE.SphereGeometry(0.049, 48, 32), scleraM, V(0, 0, 0), ball, false); // sphere UV u=0.25 (iris) faces +z
  eyeballs.push(ball); pupils.push(ball);
  // catchlights (fixed to the head, not the eyeball)
  mesh(new THREE.SphereGeometry(0.0085, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), V(0.014, 0.017, 0.046), e, false);
  mesh(new THREE.SphereGeometry(0.004, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), V(-0.012, -0.012, 0.047), e, false);
  // upper lid with lash line, lower lid
  const up = new THREE.Group(); e.add(up);
  mesh(new THREE.SphereGeometry(0.0525, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), skin, V(0, 0, 0), up, false);
  mesh(new THREE.TorusGeometry(0.0528, 0.0042, 8, 40, Math.PI).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0d0a0a', roughness: 0.7 }), V(0, 0, 0), up, false);
  upperLids.push(up);
  const lo = new THREE.Group(); e.add(lo);
  mesh(new THREE.SphereGeometry(0.051, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), skin, V(0, 0, 0), lo, false);
  lo.rotation.x = 0.55; lowerLids.push(lo);
}
// eyebrows: tapered curved strokes
const browM = new THREE.MeshStandardMaterial({ color: '#141214', roughness: 0.85 });
const brows = [-1, 1].map((s) => {
  const g = new THREE.Group(); g.position.set(s * 0.085, 0.104, 0.222); g.userData.s = s; head.add(g);
  const curve = new THREE.CatmullRomCurve3([V(-s * 0.038, -0.006, 0.004), V(-s * 0.01, 0.006, 0.006), V(s * 0.02, 0.008, 0.0), V(s * 0.045, -0.004, -0.012)]);
  const m = mesh(new THREE.TubeGeometry(curve, 24, 0.0085, 10), browM, V(0, 0, 0), g, false); m.scale.set(1, 1, 1);
  return g;
});
// nose: soft bridge + rounded tip + nostril shading
mesh(new THREE.CapsuleGeometry(0.014, 0.045, 6, 12), skin, V(0, -0.005, 0.226), head, false).rotation.x = 0.35;
mesh(new THREE.SphereGeometry(0.027, 24, 16), skin, V(0, -0.045, 0.238), head, false).scale.set(1.05, 0.85, 0.9);
for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.016, 14, 10), skin, V(s * 0.021, -0.053, 0.228), head, false);
// cheeks (soft blush)
for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: '#e5846c', transparent: true, opacity: 0.28, roughness: 1, depthWrite: false }), V(s * 0.125, -0.07, 0.196), head, false).scale.set(1.4, 0.8, 0.4);

// mouth: cavity, teeth, tongue and lips rebuilt every frame from (open, mood)
const mouth = new THREE.Group(); mouth.position.set(0, -0.118, 0.223); mouth.rotation.x = -0.3; head.add(mouth);
const cavity = mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshStandardMaterial({ color: '#3a0f14', roughness: 0.9 }), V(0, 0, 0), mouth, false);
const teeth = mesh(new THREE.CapsuleGeometry(0.006, 0.042, 4, 12).rotateZ(Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#f5f1ea', roughness: 0.3, clearcoat: 0.6 }), V(0, 0, 0.004), mouth, false);
const tongue = mesh(new THREE.SphereGeometry(0.02, 20, 12), new THREE.MeshStandardMaterial({ color: '#c0505a', roughness: 0.6 }), V(0, 0, 0.002), mouth, false);
tongue.scale.set(1.2, 0.5, 0.6);
const lipM = new THREE.MeshPhysicalMaterial({ color: '#b8655c', roughness: 0.45, clearcoat: 0.2 });
const lipUp = mesh(new THREE.BufferGeometry(), lipM, V(0, 0, 0.006), mouth, false);
const lipLo = mesh(new THREE.BufferGeometry(), lipM, V(0, 0, 0.006), mouth, false);
function setMouth(open, mood) {
  open = clamp(open); const w = 0.036 + 0.008 * Math.max(mood, 0) - 0.004 * open;
  const corner = 0.009 * mood - 0.002 * open, h = open * 0.032;
  const up = new THREE.CatmullRomCurve3([V(-w, corner, 0), V(-w * 0.5, h * 0.55 + corner * 0.2 - 0.001, 0.005), V(0, h * 0.6 - 0.0015, 0.007), V(w * 0.5, h * 0.55 + corner * 0.2 - 0.001, 0.005), V(w, corner, 0)]);
  const lo = new THREE.CatmullRomCurve3([V(-w, corner, 0), V(-w * 0.5, -h * 0.7 - 0.003 - corner * 0.3, 0.005), V(0, -h - 0.004 - corner * 0.35, 0.007), V(w * 0.5, -h * 0.7 - 0.003 - corner * 0.3, 0.005), V(w, corner, 0)]);
  lipUp.geometry.dispose(); lipLo.geometry.dispose();
  lipUp.geometry = new THREE.TubeGeometry(up, 24, 0.0048, 8);
  lipLo.geometry = new THREE.TubeGeometry(lo, 24, 0.0062, 8);
  const vis = open > 0.06;
  cavity.visible = vis; teeth.visible = open > 0.18; tongue.visible = open > 0.3;
  cavity.scale.set(w * 0.92, Math.max(0.002, h * 0.85 + 0.002), 0.012); cavity.position.y = -h * 0.2;
  teeth.position.y = h * 0.42 - 0.003; tongue.position.y = -h * 0.65;
}
setMouth(0, 1);
// glasses: rounded-rectangle black frames
function rrShape(w, h, r) { const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
const glasses = new THREE.Group(); head.add(glasses);
for (const s of [-1, 1]) {
  const fr = rrShape(0.122, 0.098, 0.032); fr.holes.push(rrShape(0.104, 0.08, 0.025));
  const f = mesh(new THREE.ExtrudeGeometry(fr, { depth: 0.008, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 3, curveSegments: 16 }), blackGloss, V(s * 0.084, 0.02, 0.252), glasses, false);
  f.rotation.y = -s * 0.1;
  const lens = mesh(new THREE.ShapeGeometry(rrShape(0.106, 0.082, 0.025), 16), new THREE.MeshPhysicalMaterial({ color: '#eef6ff', transparent: true, opacity: 0.1, roughness: 0.02, clearcoat: 1, depthWrite: false }), V(s * 0.084, 0.02, 0.257), glasses, false);
  lens.rotation.y = -s * 0.1;
  const arm = mesh(new THREE.BoxGeometry(0.006, 0.009, 0.27), blackGloss, V(s * 0.184, 0.03, 0.128), glasses, false); arm.rotation.y = s * 0.33;
}
mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 16, Math.PI), blackGloss, V(0, 0.03, 0.262), glasses, false);
const sweat = mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#9fdcff', roughness: 0.05, transparent: true, opacity: 0.85, clearcoat: 1 }), V(0.2, 0.12, 0.17), head, false);
sweat.scale.set(0.8, 1.3, 0.8);

// arms: sleeves with cuffs, hands with fingers
function makeHand(parent) {
  const hand = new THREE.Group(); hand.position.set(0, -0.265, 0); parent.add(hand);
  mesh(new THREE.SphereGeometry(0.045, 20, 16), skin, V(0, -0.025, 0), hand).scale.set(1, 1.05, 0.5);
  for (let i = 0; i < 4; i++) {
    const f = mesh(new THREE.CapsuleGeometry(0.0105, 0.038, 4, 10), skin, V(-0.027 + i * 0.018, -0.078 + Math.abs(i - 1.5) * 0.006, 0.004), hand);
    f.rotation.x = 0.35;
  }
  const th = mesh(new THREE.CapsuleGeometry(0.012, 0.032, 4, 10), skin, V(0.038, -0.03, 0.016), hand); th.rotation.set(0.3, 0, -0.7);
  return hand;
}
function makeArm(s) {
  const sh = new THREE.Group(); sh.position.set(s * 0.215, 1.16, 0); torso.add(sh);
  mesh(new THREE.CapsuleGeometry(0.06, 0.2, 8, 20), shirt, V(0, -0.15, 0), sh);
  const el = new THREE.Group(); el.position.set(0, -0.3, 0); sh.add(el);
  mesh(new THREE.SphereGeometry(0.058, 20, 14), shirt, V(0, 0, 0), el);
  mesh(new THREE.CylinderGeometry(0.05, 0.057, 0.2, 24), shirt, V(0, -0.11, 0), el);
  mesh(new THREE.TorusGeometry(0.048, 0.008, 8, 28).rotateX(Math.PI / 2), shirt, V(0, -0.212, 0), el);
  mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.05, 16), skin, V(0, -0.235, 0), el);
  makeHand(el);
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

// ---------- Baahith (needle-felted teal wool, glossy black visor, glowing eyes) ----------
const teal = felt('#7fd3bf', { r: 2, bump: 1.4 });
const tealDark = felt('#5fb9a6', { r: 2, bump: 1.4 });
const peach = Object.assign(felt('#f3b39a', { r: 1 }), { emissive: new THREE.Color('#ff9a72'), emissiveIntensity: 0.25 });
const bot = new THREE.Group(); scene.add(bot);
const botBody = new THREE.Group(); bot.add(botBody);
fuzz(mesh(new THREE.IcosahedronGeometry(0.24, 4), teal, V(0, 0.33, 0), botBody), '#8fd6c6', 3, 0.004).scale.set(1, 0.97, 1);
fuzz(mesh(new THREE.CylinderGeometry(0.238, 0.224, 0.065, 40), tealDark, V(0, 0.16, 0), botBody), '#6cc0ae', 2, 0.003);
const visorM = new THREE.MeshPhysicalMaterial({ color: '#08090b', roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
const visor = mesh(new THREE.CylinderGeometry(0.252, 0.252, 0.13, 48, 1, true, -0.85, 1.7), visorM, V(0, 0.29, 0), botBody, false);
const botEyes = [-1, 1].map((s) => {
  const e = mesh(new THREE.PlaneGeometry(0.048, 0.078), new THREE.MeshBasicMaterial({ color: '#f4fbff' }), V(Math.sin(s * 0.3) * 0.255, 0.29, Math.cos(s * 0.3) * 0.255), botBody, false);
  e.rotation.y = s * 0.3;
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, color: '#bfe9ff', transparent: true, opacity: 0.5, depthWrite: false }));
  gl.scale.set(0.12, 0.14, 1); gl.position.set(0, 0, 0.01); e.add(gl);
  return e;
});
for (const s of [-1, 1]) {
  const ear = fuzz(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 24), tealDark, V(s * 0.25, 0.31, -0.01), botBody), '#6cc0ae', 2, 0.003); ear.rotation.z = Math.PI / 2;
  if (s > 0) mesh(new THREE.BoxGeometry(0.015, 0.05, 0.04), peach, V(0.29, 0.31, 0.0), botBody);
}
mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.2, 10), clayM('#b9bfc2', { rough: 0.35, cc: 0.6 }), V(0, 0.64, 0), botBody);
const tip = fuzz(mesh(new THREE.SphereGeometry(0.042, 20, 14), peach, V(0, 0.76, 0), botBody), '#ffd0bb', 2, 0.004, 1);
const feet = [-1, 1].map((s) => { const f = fuzz(mesh(new THREE.SphereGeometry(0.075, 24, 16), teal, V(s * 0.1, 0.045, 0.03), bot), '#8fd6c6', 2, 0.004); f.scale.set(1, 0.6, 1.25); return f; });
const BOT_HOME = V(0.55, DESK_Y, -0.02);

// ---------- papers ----------
const R = rng(42);
const NP = 0; // the paper pile was removed
const paperGeo = new THREE.BoxGeometry(0.28, 0.008, 0.38);
const paperTex = canvasTex(256, 340, (g, w, h) => { g.fillStyle = '#f6f0e2'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(60,50,40,.28)'; for (let y = 40; y < h - 30; y += 18) g.fillRect(24, y, w - 48 - ((y * 7) % 60), 5); }, true);
const papers = [];
for (let i = 0; i < NP; i++) {
  const m = mesh(paperGeo, new THREE.MeshPhysicalMaterial({ color: ['#ffffff', '#f4ecdc', '#fbf6ea'][i % 3], map: paperTex, roughness: 0.95, sheen: 0.3 }), V(0, -5, 0));
  m.userData = { drop: 0.25 + i * 0.075, ox: (R() - 0.5) * 0.08, oz: (R() - 0.5) * 0.08, ry: (R() - 0.5) * 0.9, spin: (R() - 0.5) * 6, k: i % 3, fly: 13.9 + i * 0.06, sx: (R() - 0.5) * 1.5 };
  papers.push(m);
}
const PILE = V(0.0, DESK_Y, -0.12);

// folders (collections), felt
function labelTex(text, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = '#fbf3e4'; g.beginPath(); g.roundRect(40, 60, 432, 150, 24); g.fill();
  g.fillStyle = color; g.font = '700 92px "IBM Plex Sans Arabic"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
  g.fillText(text, 256, 142);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const FOLDERS = []; // the collection folders were removed
const folders = FOLDERS.map((f) => {
  const g = new THREE.Group(); g.position.copy(f.pos); scene.add(g);
  const mat = felt(f.color, { r: 1 });
  mesh(new THREE.BoxGeometry(0.4, 0.28, 0.05), mat, V(0, 0, 0), g);
  mesh(new THREE.BoxGeometry(0.15, 0.05, 0.05), mat, V(-0.12, 0.16, 0), g);
  const lab = mesh(new THREE.PlaneGeometry(0.36, 0.18), new THREE.MeshBasicMaterial({ map: null, transparent: true }), V(0, -0.01, 0.027), g, false);
  f.lab = lab; f.group = g; return f;
});

// ---------- post: tilt-shift depth of field + warm grade, vignette, grain ----------
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(1080, 1920);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 3, aperture: 0.008, maxblur: 0.01 });
composer.addPass(bokeh);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time * 13.7) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; d.x *= 0.62;
      float vig = smoothstep(0.85, 0.25, length(d));
      c.rgb *= mix(0.62, 1.04, vig);
      c.rgb += (h(vUv * 1080.0) - 0.5) * 0.016;
      gl_FragColor = c;
    }`,
});
composer.addPass(grade);
composer.addPass(new OutputPass());
const _focusTarget = new THREE.Vector3();

// ---------- camera shots ----------
const SHOTS = [
  { s: 0,    e: 5.5,  f: V(-0.45, 1.4, -0.65), p: [V(-0.1, 1.62, 3.0), V(-0.22, 1.58, 2.3)], t: [V(-0.4, 1.3, -0.65), V(-0.45, 1.33, -0.68)] },
  { s: 5.5,  e: 7.0,  f: V(0.3, 1.1, -0.2), p: [V(0.15, 1.6, 4.1), V(0.2, 1.58, 3.8)], t: [V(0.1, 1.2, -0.25), V(0.15, 1.2, -0.25)] },
  { s: 7.0,  e: 11.5, p: [V(0.9, 1.25, 2.0), V(0.84, 1.24, 1.8)], t: [V(0.5, 1.17, -0.05), V(0.5, 1.17, -0.05)] },
  { s: 11.5, e: 13.5, p: [V(-0.22, 1.55, 1.25), V(-0.24, 1.54, 1.1)], t: [V(-0.45, 1.36, -0.7), V(-0.45, 1.36, -0.7)] },
  { s: 13.5, e: 18.0, f: V(0.0, 1.25, -0.4), p: [V(0.05, 1.45, 3.0), V(0.05, 1.43, 2.75)], t: [V(0.0, 1.22, -0.3), V(0.0, 1.22, -0.3)] },
  { s: 18.0, e: 23.0, p: [V(0.1, 1.3, 2.0), V(0.15, 1.28, 1.85)], t: [V(0.5, 1.17, -0.05), V(0.5, 1.17, -0.05)] },
  { s: 23.0, e: 25.5, p: [V(-0.7, 1.5, 1.2), V(-0.68, 1.5, 1.0)], t: [V(-0.45, 1.36, -0.7), V(-0.45, 1.36, -0.7)] },
  { s: 25.5, e: 30.0, f: V(0.0, 1.3, -0.4), p: [V(0.1, 1.45, 3.5), V(0.1, 1.43, 3.25)], t: [V(0.05, 1.2, -0.3), V(0.05, 1.2, -0.3)] },
  { s: 30.0, e: 32.5, p: [V(-0.2, 1.58, 1.2), V(-0.22, 1.56, 1.05)], t: [V(-0.45, 1.36, -0.7), V(-0.45, 1.36, -0.7)] },
  { s: 32.5, e: 36.5, p: [V(0.95, 1.25, 1.95), V(0.88, 1.24, 1.8)], t: [V(0.5, 1.17, -0.05), V(0.5, 1.17, -0.05)] },
  { s: 36.5, e: 38.8, f: V(-0.45, 1.4, -0.65), p: [V(0.0, 1.62, 3.8), V(-0.05, 1.6, 3.5)], t: [V(-0.05, 1.25, -0.3), V(-0.1, 1.25, -0.3)] },
  { s: 38.8, e: 41.0, f: V(-0.4, 1.4, -0.6), p: [V(-0.05, 1.5, 2.3), V(-0.05, 1.5, 2.0)], t: [V(-0.05, 1.35, -0.4), V(-0.05, 1.35, -0.4)] },
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
  _focusTarget.copy(sh.f || tg);
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
  for (const b of bokehs) b.material.opacity = 0.65 + 0.25 * Math.sin(t * 1.5 + b.userData.ph);

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
  for (const e of eyeballs) { e.rotation.y = (lookBot ? 0.32 : 0.0) + Math.sin(t * 0.7) * 0.03; e.rotation.x = shocked ? -0.12 : panic ? -0.05 : 0.04; }
  // blink
  const bp = (t * 1.0) % 3.7; const blink = bp < 0.12 ? Math.sin((bp / 0.12) * Math.PI) : 0;
  const lidClose = Math.max(blink, relaxed ? 0.92 : 0);
  for (const u of upperLids) u.rotation.x = lerp(shocked ? -0.95 : panic ? -0.8 : -0.6, 1.05, lidClose);
  for (const l of lowerLids) l.rotation.x = lerp(shocked ? 0.75 : 0.55, 0.2, relaxed ? 1 : 0);
  eyes.scale.setScalar(shocked ? 1.08 : 1);
  for (const b of brows) {
    const s = b.userData.s;
    b.rotation.z = panic ? s * -0.35 : relaxed ? s * 0.1 : s * 0.12;
    b.position.y = 0.104 + (panic ? 0.014 : 0) + (shocked ? 0.022 : 0);
  }
  // mouth
  const open = shocked ? 0.85 : boyTalk;
  setMouth(open, shocked ? -0.4 : panic ? -1 : relaxed ? 0.6 : 1);
  // glasses slip + sweat drop on the joke
  glasses.position.y = shocked ? -0.028 * easeOut(range(t, 39.45, 39.7)) : 0;
  sweat.visible = t > 39.5 && t < 41.8;
  sweat.position.set(0.205, 0.13 - 0.12 * range(t, 39.6, 41.6), 0.16);
  if (t < 6 && t > 1.2) { sweat.visible = true; sweat.position.set(-0.205, 0.14 - 0.1 * range(t, 2, 5.5), 0.16); }

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
    const s = easeOut(clamp(show));
    f.group.scale.setScalar(Math.max(0.001, s));
    f.group.rotation.y = Math.sin(t * 1.5 + i) * 0.15; f.group.position.y = f.pos.y + Math.sin(t * 2 + i) * 0.02;
  }
}

// ---------- overlays (PhiDoc motion: soft fade up, no bounce, brand ease cubic-bezier(.32,.72,0,1)) ----------
function bezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, C = (a) => 3 * a;
  const f = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (f(t, x1, x2) < x) lo = t; else hi = t; }
    return f(t, y1, y2);
  };
}
const brand = bezier(0.32, 0.72, 0, 1);
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
function show(el, v, dy = 28) {
  const k = brand(clamp(v));
  el.style.opacity = k;
  el.style.transform = `translateY(${(1 - k) * dy}px)`;
}
// captions: short chunks of 2-3 words on a cream paper label, keyword in brand teal
const KEYWORDS = new Set(['المقالات', 'PhiDoc', 'ملايين', 'المجال', 'ديالي؟', 'المكتبة', 'collections', 'الجمل', 'الأسئلة', 'مرجع', 'الأطروحة', 'سؤال', 'سولني', 'نرتاح', 'ترتاح؟!']);
const clean = (w) => w.replace(/[.,،!]+$/g, '');
const CHUNKS = [];
for (const L of LINES) {
  const ws = L.text.split(/\s+/); const groups = [];
  for (let i = 0; i < ws.length;) {
    let n = Math.min(3, ws.length - i);
    if (ws.slice(i, i + n).join(' ').length > 20 && n > 2) n = 2;
    if (ws.length - (i + n) === 1) n = Math.min(n + 1, 3) === n + 1 && ws.slice(i, i + n + 1).join(' ').length <= 24 ? n + 1 : n;
    groups.push(ws.slice(i, i + n)); i += n;
  }
  const total = ws.length; let acc = 0;
  for (const g of groups) {
    const s0 = L.s + ((L.e - L.s) * acc) / total; acc += g.length;
    const e0 = L.s + ((L.e - L.s) * acc) / total;
    let lit = false;
    const html = g.map((w) => { const k = !lit && (KEYWORDS.has(w) || KEYWORDS.has(clean(w))); if (k) lit = true; return k ? `<span class="hl">${w}</span>` : w; }).join(' ');
    CHUNKS.push({ s: s0, e: e0, who: L.who, html, last: acc === total, lineEnd: L.e });
  }
}
let curChunk = null;
const capEl = $('#cap');
function captions(t) {
  const C = CHUNKS.find((c) => t >= c.s && t < (c.last ? c.lineEnd + 0.3 : c.e));
  if (C !== curChunk) { curChunk = C; if (C) capEl.querySelector('.lbl').innerHTML = C.html; }
  if (!C) { capEl.style.opacity = 0; return; }
  const k = brand(range(t, C.s, C.s + 0.12));
  capEl.style.opacity = k * (C.last ? 1 - range(t, C.lineEnd + 0.15, C.lineEnd + 0.3) : 1);
  capEl.style.transform = `translateY(${(1 - k) * 10}px)`;
}
let curChip = null;
function chips(t) {
  const C = CHIPS.find((c) => t >= c.s && t <= c.e);
  const el = $('#chip');
  if (C !== curChip) {
    curChip = C;
    if (C) { el.querySelector('use').setAttribute('href', '#i-' + C.icon); el.querySelector('.en').textContent = C.en; el.querySelector('.ar').textContent = C.ar; }
  }
  show(el, C ? win(t, C.s, C.e, 0.35, 0.25) : 0, -20);
}
const QUERY = 'التحول الرقمي';
function panels(t) {
  show($('#hook'), win(t, 0.3, 3.4, 0.4, 0.3), 30);
  // search
  show($('#search'), win(t, 7.3, 11.5, 0.4, 0.3));
  $('#search .q').textContent = QUERY.slice(0, Math.floor(QUERY.length * range(t, 7.7, 8.6)));
  $('#search .caret').style.opacity = Math.floor(t * 3) % 2 ? 1 : 0.15;
  show($('#search .count'), range(t, 8.9, 9.3), 10);
  $$('#search .res').forEach((r, i) => show(r, range(t, 9.0 + i * 0.28, 9.5 + i * 0.28), 20));
  // evidence
  show($('#evid'), win(t, 18.3, 23.0, 0.4, 0.3));
  $$('#evid .l.hl').forEach((l, i) => l.style.setProperty('--hl', brand(range(t, 19.2 + i * 0.35, 19.7 + i * 0.35))));
  show($('#evid .badge'), range(t, 19.9, 20.3), 16);
  show($('#evid .q'), range(t, 20.1, 20.55), 20);
  $('#link').setAttribute('stroke-dashoffset', 400 * (1 - brand(range(t, 20.4, 21.2))));
  // audit
  show($('#audit'), win(t, 25.8, 30.0, 0.4, 0.3));
  const its = $$('#audit .it');
  const times = [26.6, 27.2, 27.8, 28.3];
  its.forEach((it, i) => {
    show(it, range(t, times[i] - 0.35, times[i]), 16);
    it.className = 'it' + (t >= times[i] ? (i === 2 && t < 28.9 ? ' bad' : ' ok') : '');
  });
  const fixed = t >= 28.9;
  its[2].querySelector('.lbl').textContent = fixed ? 'الفصل 3: تزاد المرجع' : 'الفصل 3: مرجع ناقص';
  its[2].querySelector('.ref').textContent = fixed ? 'El Amrani, 2022' : '[?]';
  // chat
  show($('#chat'), win(t, 32.8, 36.5, 0.35, 0.3));
  show($('#chat .u'), range(t, 32.8, 33.2), 20);
  show($('#chat .row'), range(t, 33.5, 33.9), 20);
  const ANS = 'على حساب المجال ديالك، كنقترح ليك منهجية مختلطة، ومعاها المراجع اللي كتدعمها.';
  const k = range(t, 34.0, 35.9);
  $('#chat .ans').textContent = k > 0 ? ANS.slice(0, Math.ceil(ANS.length * k)) : '';
  $('#chat .dots').style.display = k > 0 ? 'none' : 'inline';
  $$('#chat .dots span').forEach((d, i) => (d.style.opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 8 - i * 1.2))));
  }
function outro(t) {
  // outro: the teal panel slides down from the top
  const o = brand(range(t, 41.0, 41.6));
  const ou = $('#outro'); ou.style.opacity = t >= 41 ? 1 : 0; ou.style.top = `${-(1 - o) * 1180}px`;
  show($('#outro .logo'), range(t, 41.5, 42.0), 24);
  show($('#outro .tag'), range(t, 41.8, 42.3), 24);
  show($('#outro .feat'), range(t, 42.0, 42.5), 24);
  show($('#outro .cta'), range(t, 42.3, 42.8), 24);
}

window.renderAt = (t) => {
  t = Math.min(t, DURATION - 0.001);
  animate3D(t); updateCamera(t);
  bokeh.uniforms['focus'].value = camera.position.distanceTo(_focusTarget);
  grade.uniforms.time.value = t;
  composer.render();
  captions(t); outro(t);
  window.scrollTo(0, 0); document.documentElement.scrollLeft = 0; document.body.scrollLeft = 0;
};
window.__ready = (async () => {
  await Promise.all([
    document.fonts.load('700 60px "IBM Plex Sans Arabic"', 'عربي'), document.fonts.load('600 40px "IBM Plex Sans Arabic"', 'عربي'),
    document.fonts.load('500 40px "IBM Plex Sans Arabic"', 'عربي'), document.fonts.load('700 50px Amiri', 'عربي'),
    document.fonts.load('600 40px Inter', 'Ab'), document.fonts.load('500 40px Inter', 'Ab'), document.fonts.load('400 40px Inter', 'Ab'),
  ]);
  await document.fonts.ready;
  await new Promise((r) => { const im = $('#outro img'); if (im.complete) r(); else im.onload = r; });
  for (const f of folders) { f.lab.material.map = labelTex(f.label, f.color); f.lab.material.needsUpdate = true; }
  window.renderAt(0);
  return true;
})();
