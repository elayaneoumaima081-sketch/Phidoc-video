// Usage:
//   node src/render.js stills 0.5 4 8 ...   -> out/stills/still_<t>.jpg
//   node src/render.js video [start] [end]  -> out/frames.mp4 (silent)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { DURATION, FPS } from './timeline.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'out');
fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('PAGE ERROR', e));
page.on('console', (m) => m.type() === 'error' && console.error('console:', m.text()));
await page.goto(`http://localhost:${port}/src/scene.html`);
await page.evaluate(() => window.__ready);

const [mode, ...rest] = process.argv.slice(2);
if (mode === 'stills') {
  for (const s of rest) {
    const t = parseFloat(s);
    await page.evaluate((t) => window.renderAt(t), t);
    await page.screenshot({ path: path.join(OUT, 'stills', `still_${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
    console.log('still', t);
  }
} else {
  const start = parseFloat(rest[0] ?? 0), end = parseFloat(rest[1] ?? DURATION);
  const f0 = Math.round(start * FPS), f1 = Math.round(end * FPS);
  const outFile = path.join(OUT, rest[2] || 'frames.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = f0; f < f1; f++) {
    await page.evaluate((t) => window.renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) console.log(`frame ${f}/${f1}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log('wrote', outFile);
}
await browser.close();
server.close();
