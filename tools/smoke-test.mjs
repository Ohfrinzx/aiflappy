// Headless smoke test: serves the repo, drives the game in Chromium and fails
// on any page error or broken flow. Run: node tools/smoke-test.mjs
// Needs Playwright (npm i -g playwright, or set PLAYWRIGHT_PATH).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.txt': 'text/plain', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };

async function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_PATH, 'playwright', '/opt/node22/lib/node_modules/playwright/index.mjs'].filter(Boolean);
  for (const c of candidates) {
    try {
      return await import(c);
    } catch {
      /* try next */
    }
  }
  throw new Error('Playwright not found');
}

const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const target = file.endsWith('/') ? path.join(file, 'index.html') : file;
  if (!target.startsWith(root) || !fs.existsSync(target)) {
    res.writeHead(404).end();
    return;
  }
  // Same caching as GitHub Pages, so the service-worker freshness check is real.
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'max-age=600' });
  fs.createReadStream(target).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

const { chromium } = await loadPlaywright();
const exe = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
const failures = [];
const check = (ok, msg) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!ok) failures.push(msg);
};

async function page(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: opts.dpr ?? 1, hasTouch: !!opts.touch, isMobile: !!opts.touch });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(e.message));
  return p;
}
const state = (p) => p.evaluate(() => { const s = window.__game.scenes.current; return { scene: s.constructor.name, state: s.state, score: s.score, boss: s.bosses?.state }; });
const tap = (p) => p.evaluate(() => window.__game.input.dispatch({ type: 'press', source: 'key', x: -1, y: -1 }));

try {
  // 1. Title -> play -> crash -> game over panel (desktop).
  let p = await page({ width: 288, height: 512 });
  await p.goto(base);
  await p.waitForTimeout(400);
  check((await state(p)).scene === 'TitleScene', 'title screen loads');
  await p.keyboard.press('Space');
  await p.waitForTimeout(900);
  check((await state(p)).state === 'ready', 'Play leads to Get Ready');
  await p.keyboard.press('Space');
  await p.waitForTimeout(100);
  check((await state(p)).state === 'playing', 'tap starts the run');
  await p.waitForTimeout(4500);
  const over = await p.evaluate(() => { const s = window.__game.scenes.current; return s.state === 'over' && s.panel.ready; });
  check(over, 'crash shows the game over panel');
  check(p.errors.length === 0, `no page errors (desktop) ${p.errors.join('; ')}`);

  // 2. Boss fight to victory (autopilot, god mode).
  p = await page({ width: 288, height: 512 });
  await p.goto(`${base}?start=99&god`);
  await p.waitForTimeout(300);
  await tap(p);
  await p.evaluate(() => setInterval(() => {
    const s = window.__game.scenes.current;
    if (!s.bird || s.state !== 'playing') return;
    let target = 230;
    const orb = s.hazards.list.find((o) => o.constructor.name === 'Orb');
    if (orb) target = orb.y - 12;
    const pipe = s.pipes.list.find((q) => q.x + 52 > s.bird.x);
    if (pipe && pipe.x < 200) target = pipe.gapY + pipe.gap - 34;
    if (s.bird.y > target && s.bird.vy > -50) window.__game.input.dispatch({ type: 'press', source: 'key', x: -1, y: -1 });
  }, 30));
  let sawFight = false;
  let won = false;
  for (let i = 0; i < 120 && !won; i++) {
    await p.waitForTimeout(1000);
    const s = await p.evaluate(() => { const c = window.__game.scenes.current; return { boss: c.bosses.state, victory: c.victory, score: c.score }; });
    sawFight ||= s.boss === 'fight';
    won = s.victory;
  }
  check(sawFight, 'boss appears after pipe 100');
  check(won, 'boss can be defeated -> victory');
  check(p.errors.length === 0, `no page errors (boss) ${p.errors.join('; ')}`);

  // 3. Phone: full-bleed view, touch input, pause.
  p = await page({ width: 402, height: 874 }, { dpr: 3, touch: true });
  await p.goto(`${base}?play`);
  await p.waitForTimeout(400);
  const view = await p.evaluate(() => { const r = window.__game.renderer; return { h: r.canvas.getBoundingClientRect().height, top: r.viewTop, bottom: r.viewBottom }; });
  check(Math.abs(view.h - 874) <= 1, `canvas fills phone height (${view.h}px)`);
  check(view.top < 0 && view.bottom > 512, 'extra sky above and ground below');
  await p.touchscreen.tap(200, 500);
  await p.waitForTimeout(100);
  check((await state(p)).state === 'playing', 'touch starts the run');
  check(p.errors.length === 0, `no page errors (phone) ${p.errors.join('; ')}`);

  // 4. Standalone home-screen app with the old opaque status bar (shorter viewport).
  p = await page({ width: 402, height: 812 }, { dpr: 3, touch: true });
  await p.goto(`${base}?play`);
  await p.waitForTimeout(300);
  const h2 = await p.evaluate(() => window.__game.renderer.canvas.getBoundingClientRect().height);
  check(Math.abs(h2 - 812) <= 1, `canvas fills 402x812 viewport (${h2}px)`);

  // 5. Service worker: registers, controls the page, and serves fresh files.
  p = await page({ width: 288, height: 512 });
  await p.goto(base);
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.waitForTimeout(400);
  const controlled = await p.evaluate(() => !!navigator.serviceWorker.controller);
  check(controlled, 'service worker controls the page');
  check((await state(p)).scene === 'TitleScene', 'game boots under the service worker');
  const marker = path.join(root, '__sw_probe.txt');
  fs.writeFileSync(marker, 'v1');
  const v1 = await p.evaluate(() => fetch('__sw_probe.txt').then((r) => r.text()));
  fs.writeFileSync(marker, 'v2');
  const v2 = await p.evaluate(() => fetch('__sw_probe.txt').then((r) => r.text()));
  fs.unlinkSync(marker);
  check(v1 === 'v1' && v2 === 'v2', 'updated files are served fresh, not from cache');
  check(p.errors.length === 0, `no page errors (service worker) ${p.errors.join('; ')}`);
} finally {
  await browser.close();
  server.close();
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nAll checks passed');
process.exit(failures.length ? 1 : 0);
