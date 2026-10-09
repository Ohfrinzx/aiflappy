// Headless smoke test: serves the repo, drives the game in Chromium and fails
// on any page error or broken flow. Run: node tools/smoke-test.mjs
// Needs Playwright (npm i -g playwright, or set PLAYWRIGHT_PATH).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

// Same caching as GitHub Pages, so the service-worker freshness check is real.
const server = createStaticServer({ root, cacheControl: 'max-age=600' });
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
  const fileVersion = fs.readFileSync(path.join(root, 'src/version.js'), 'utf8').match(/VERSION = '([^']+)'/)?.[1];
  const shown = await p.evaluate(() => window.__game.version && window.__game.sprites.has('text-version') && window.__game.version);
  check(!!fileVersion && shown === fileVersion, `title shows version v${fileVersion}`);
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

  // 2. Boss fight (god mode): a real orb hit deals damage, each emptied bar
  //    revives the boss until its last life, then victory.
  const AUTOPILOT = () => {
    window.__autopilot = setInterval(() => {
      const s = window.__game.scenes.current;
      if (!s.bird || s.state !== 'playing') return;
      let target = 230;
      const orb = s.hazards.list.find((o) => o.constructor.name === 'Orb');
      if (orb) target = orb.y - 12;
      const pipe = s.pipes.list.find((q) => q.x + 52 > s.bird.x);
      if (pipe && pipe.x < 200) target = pipe.gapY + pipe.gap - 34;
      if (s.bird.y > target && s.bird.vy > -50) window.__game.input.dispatch({ type: 'press', source: 'key', x: -1, y: -1 });
    }, 30);
  };
  const waitFor = async (p, fn, secs, arg) => {
    for (let i = 0; i < secs * 4; i++) {
      if (await p.evaluate(fn, arg)) return true;
      await p.waitForTimeout(250);
    }
    return false;
  };
  p = await page({ width: 288, height: 512 });
  await p.goto(`${base}?start=99&god`);
  await p.waitForTimeout(300);
  await tap(p);
  await p.evaluate(AUTOPILOT);
  check(await waitFor(p, () => window.__game.scenes.current.bosses.state === 'fight', 30), 'boss appears after pipe 100');
  const cfg = await p.evaluate(() => window.__game.config.bosses.kingCrow);
  check(
    await waitFor(p, () => { const b = window.__game.scenes.current.bosses.boss; return b && (b.hp < b.maxHp || b.lives < b.maxLives); }, 90),
    `catching an orb damages the boss (${cfg.damagePerHit} per hit)`,
  );
  // Empty the current bar: boss should lose a life and refill, not die.
  const lives0 = await p.evaluate(() => window.__game.scenes.current.bosses.boss.lives);
  await p.evaluate(() => { const b = window.__game.scenes.current.bosses.boss; b.hp = 1; b.hit(1); });
  const after = await p.evaluate(() => { const b = window.__game.scenes.current.bosses.boss; return { lives: b.lives, reviving: b.reviving, defeated: b.defeated }; });
  check(lives0 === cfg.lives && after.lives === cfg.lives - 1 && after.reviving && !after.defeated, `emptied bar costs the boss a life (${lives0} -> ${after.lives})`);
  check(
    await waitFor(p, () => { const b = window.__game.scenes.current.bosses.boss; return !b.reviving && b.hp === b.maxHp; }, 10),
    'boss revives with a full health bar',
  );
  // Last life: emptying the bar defeats it.
  await p.evaluate(() => { const b = window.__game.scenes.current.bosses.boss; b.lives = 1; b.hp = 1; b.hit(1); });
  check(await waitFor(p, () => window.__game.scenes.current.victory, 15), 'last life emptied -> victory');
  check(p.errors.length === 0, `no page errors (boss) ${p.errors.join('; ')}`);

  // 2b. Player lives: survive to the fight, then stop flapping. The first
  //     ground hit costs a life and bounces; running out ends the run.
  p = await page({ width: 288, height: 512 });
  await p.goto(`${base}?start=99`);
  await p.waitForTimeout(300);
  await tap(p);
  await p.evaluate(AUTOPILOT);
  check(await waitFor(p, () => window.__game.scenes.current.bosses.state === 'fight', 30), 'reached the boss alive');
  const startLives = await p.evaluate(() => { clearInterval(window.__autopilot); return window.__game.scenes.current.lives; });
  const expected = await p.evaluate(() => window.__game.config.bosses.playerLives);
  check(startLives === expected, `player starts the fight with ${expected} lives`);
  check(
    await waitFor(p, (n) => { const s = window.__game.scenes.current; return s.lives === n - 1 && s.state === 'playing'; }, 10, expected),
    'a hit costs a life and the run continues',
  );
  check(await waitFor(p, () => ['dying', 'over'].includes(window.__game.scenes.current.state), 15), 'running out of lives ends the run');
  check(p.errors.length === 0, `no page errors (player lives) ${p.errors.join('; ')}`);

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
