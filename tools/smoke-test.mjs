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
  // Dodgeability (the bird only moves vertically): every fan wave must leave a
  // bird-sized hole, and every storm feather must cross the bird's column
  // outside the safe gap. Checked in phase 3, the densest.
  const dodge = await p.evaluate(async () => {
    const s = window.__game.scenes.current; const boss = s.bosses.boss; const bird = s.bird;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const realHit = boss.hit; boss.hit = () => {};
    const out = { fanMinHole: Infinity, storm: 0, stormBad: 0 };
    boss.hp = 2; s.hazards.clear(); boss.waitT = 0; boss.waitFn = null; boss.script = boss.fan();
    const shots = []; const orig = boss.shootFrom.bind(boss);
    boss.shootFrom = (x, y, deg, sp) => { shots.push({ t: boss.t, x, y, deg }); orig(x, y, deg, sp); };
    for (let i = 0; i < 600 && boss.script; i++) await sleep(10);
    boss.shootFrom = orig;
    const nearX = bird.x + bird.w; const waves = new Map();
    for (const q of shots) { const k = q.t.toFixed(4); if (!waves.has(k)) waves.set(k, []); waves.get(k).push(q.y + (q.x - nearX) * Math.tan((q.deg * Math.PI) / 180)); }
    for (const ys of waves.values()) { ys.sort((a, c) => a - c); let best = 0; for (let i = 1; i < ys.length; i++) best = Math.max(best, ys[i] - ys[i - 1] - 8); out.fanMinHole = Math.min(out.fanMinHole, best); }
    boss.hp = 2; s.hazards.clear(); boss.waitT = 0; boss.waitFn = null; boss.script = boss.rain();
    const crossed = new Set();
    for (let i = 0; i < 2000 && boss.script; i++) {
      if (boss.safeCenter) for (const f of s.hazards.list) {
        if (f.constructor.name !== 'Feather' || crossed.has(f) || f.x > bird.cx) continue;
        crossed.add(f); out.storm++;
        if (Math.abs(f.y - boss.safeCenter(boss.t)) < boss.safeBand / 2 + 4) out.stormBad++;
      }
      await sleep(4);
    }
    s.hazards.clear(); boss.hit = realHit; boss.hp = boss.maxHp; boss.waitT = 0; boss.waitFn = null; boss.script = boss.behavior();
    return out;
  });
  check(dodge.fanMinHole >= 30, `every fan wave leaves a bird-sized hole (min ${dodge.fanMinHole.toFixed(0)}px, bird is 24)`);
  check(dodge.storm > 0 && dodge.stormBad === 0, `feather storm always leaves a safe gap (${dodge.storm} feathers, ${dodge.stormBad} inside the gap)`);

  // Last life: emptying the bar defeats it. King Crow isn't the last boss, so
  // the pipes come back (at dusk) instead of the victory screen.
  await p.evaluate(() => { const b = window.__game.scenes.current.bosses.boss; b.lives = 1; b.hp = 1; b.hit(1); });
  check(
    await waitFor(p, () => { const s = window.__game.scenes.current; return s.bosses.defeated.includes('kingCrow') && s.state === 'playing' && !s.victory && s.pipes.list.some((q) => q.scores); }, 15),
    'beating King Crow resumes the pipes',
  );
  const after1 = await p.evaluate(() => { const s = window.__game.scenes.current; return { theme: s.theme.id, limit: s.pipes.spawnLimit }; });
  check(after1.theme === 'dusk' && after1.limit === 150, `then dusk, with Phoenix Lord at pipe 150 (${after1.theme}, ${after1.limit})`);
  check(p.errors.length === 0, `no page errors (boss) ${p.errors.join('; ')}`);

  // 2a. Phoenix Lord (god mode): volcano arena, frost orb damage, rebirth,
  //     dodgeable beams / ember rings / spiral, victory, unlocks.
  p = await page({ width: 288, height: 512 });
  await p.goto(`${base}?start=149&god&nosound`);
  await p.waitForTimeout(300);
  await tap(p);
  await p.evaluate(AUTOPILOT);
  check(await waitFor(p, () => window.__game.scenes.current.bosses.boss?.constructor.name === 'PhoenixLord', 30), 'Phoenix Lord appears after pipe 150');
  check((await p.evaluate(() => window.__game.scenes.current.theme.id)) === 'volcano', 'its fight switches to the volcano theme');
  const pcfg = await p.evaluate(() => window.__game.config.bosses.phoenixLord);
  check(
    await waitFor(p, () => { const b = window.__game.scenes.current.bosses.boss; return b && (b.hp < b.maxHp || b.lives < b.maxLives); }, 90),
    'catching a frost orb damages Phoenix Lord',
  );
  await p.evaluate(() => { const b = window.__game.scenes.current.bosses.boss; b.hp = 1; b.hit(1); });
  check(
    await waitFor(p, () => { const b = window.__game.scenes.current.bosses.boss; return b.lives === b.maxLives - 1 && !b.reviving && b.hp === b.maxHp; }, 10),
    'emptied bar -> rebirth with a full health bar',
  );
  const pdodge = await p.evaluate(async () => {
    const s = window.__game.scenes.current; const boss = s.bosses.boss; const bird = s.bird; const T = window.__game.config.bosses.phoenixLord;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const realHit = boss.hit; boss.hit = () => {};
    const reset = (gen) => { s.hazards.clear(); boss.waitT = 0; boss.waitFn = null; boss.script = gen; };
    const out = { beamMin: Infinity, ringMinGap: Infinity, rings: 0, spiral: 0, spiralBad: 0 };
    boss.hp = 2; // phase 3, the densest
    // Beams: lanes in one round keep their distance, wherever the bird is.
    const birdY = bird.y;
    for (let i = 0; i < 400; i++) {
      bird.y = -20 + Math.random() * 380;
      const ys = boss.beamLanes(boss.p(T.beamLanes));
      if (ys.some((y) => y === null)) out.beamMin = -1;
      for (let a = 0; a < ys.length; a++) for (let c = a + 1; c < ys.length; c++) out.beamMin = Math.min(out.beamMin, Math.abs(ys[a] - ys[c]));
    }
    bird.y = birdY;
    // Tracking: when the beam / dive lane locks, it is on the bird.
    reset(boss.beam());
    out.beamOff = null;
    for (let i = 0; i < 600 && out.beamOff === null; i++) {
      const main = s.hazards.list.find((o) => o.constructor.name === 'FlameBeam' && o.x1 < 250);
      // Measured against the closest spot the bird-sized-gap rule allows: an
      // extra lane near the bird pushes the tracked one away by design.
      if (main && !main.tracking) {
        const extras = s.hazards.list.filter((o) => o.constructor.name === 'FlameBeam' && o !== main).map((o) => o.y);
        out.beamOff = Math.abs(main.y - boss.trackY(bird.cy, extras));
      }
      await sleep(4);
    }
    reset(boss.dive());
    out.diveOff = null;
    out.diveSeen = false;
    const [dTop, dBot] = boss.diveBand;
    for (let i = 0; i < 1500 && boss.script; i++) {
      if (out.diveOff === null && boss.telegraph === 2) out.diveOff = Math.abs(boss.y + (dTop + dBot) / 2 - bird.cy);
      if (boss.diving) out.diveSeen = true;
      if (out.diveSeen && !boss.diving && boss.ax > 200) break;
      await sleep(4);
    }
    // Fireball rings: where each ring's embers cross the bird's near edge.
    const shots = []; const orig = boss.emberAt.bind(boss);
    boss.emberAt = (x, y, deg, sp) => { shots.push({ x, y, deg, t: boss.t }); orig(x, y, deg, sp); };
    reset(boss.fireballs());
    for (let i = 0; i < 1000 && boss.script; i++) await sleep(5);
    boss.emberAt = orig;
    const nearX = bird.x + bird.w; const rings = new Map();
    for (const q of shots) {
      const k = q.t.toFixed(4); if (!rings.has(k)) rings.set(k, []);
      if (Math.cos(q.deg * Math.PI / 180) > 0.05) rings.get(k).push(q.y + (q.x - nearX) * Math.tan((q.deg * Math.PI) / 180));
    }
    for (const ys of rings.values()) {
      out.rings++;
      ys.sort((a, c) => a - c);
      for (let i = 1; i < ys.length; i++) if (ys[i] > -40 && ys[i - 1] < 440) out.ringMinGap = Math.min(out.ringMinGap, ys[i] - ys[i - 1] - 8);
    }
    // Spiral: no ember crosses the bird's column inside the safe gap.
    reset(boss.spiral());
    let safe = null; const crossed = new Set();
    for (let i = 0; i < 2500; i++) {
      if (boss.safeCenter) safe = { fn: boss.safeCenter, band: boss.safeBand };
      if (safe) for (const f of s.hazards.list) {
        if (f.constructor.name !== 'Ember' || crossed.has(f) || f.x > bird.cx) continue;
        crossed.add(f); out.spiral++;
        if (Math.abs(f.y - safe.fn(boss.t)) < safe.band / 2 + 4) out.spiralBad++;
      }
      if (!boss.script || (safe && !boss.safeCenter && !s.hazards.list.some((o) => o.constructor.name === 'Ember'))) break;
      await sleep(4);
    }
    s.hazards.clear(); boss.hit = realHit; boss.hp = boss.maxHp; boss.waitT = 0; boss.waitFn = null; boss.script = boss.behavior();
    return out;
  });
  const beamBand = pcfg.beamHalf * 2 - 6;
  check(pdodge.beamMin - beamBand >= 30, `beam lanes leave a bird-sized gap (min ${(pdodge.beamMin - beamBand).toFixed(0)}px between flames)`);
  check(pdodge.beamOff !== null && pdodge.beamOff < 30, `the beam lane tracks the bird, then locks (${pdodge.beamOff?.toFixed(0)}px from the closest allowed spot)`);
  check(pdodge.diveOff !== null && pdodge.diveOff < 30 && pdodge.diveSeen, `the flame dive tracks the bird, then dashes (${pdodge.diveOff?.toFixed(0)}px off at lock)`);
  check(pdodge.rings > 0 && pdodge.ringMinGap >= 30, `ember rings leave bird-sized gaps (${pdodge.rings} rings, min ${pdodge.ringMinGap.toFixed(0)}px)`);
  check(pdodge.spiral > 0 && pdodge.spiralBad === 0, `ember spiral always leaves a safe gap (${pdodge.spiral} embers, ${pdodge.spiralBad} inside the gap)`);
  await p.evaluate(() => { const b = window.__game.scenes.current.bosses.boss; b.lives = 1; b.hp = 1; b.hit(1); });
  check(await waitFor(p, () => window.__game.scenes.current.victory, 15), 'beating Phoenix Lord (the last boss) -> victory');
  check(await waitFor(p, () => window.__game.scenes.current.panel?.ready, 15), 'victory panel shows');
  const pend = await p.evaluate(() => { const s = window.__game.scenes.current; return { medal: s.panel.medal?.id, fresh: s.panel.newBirds.map((b) => b.id), stats: JSON.parse(localStorage.getItem('aiflappy.stats')) }; });
  check(pend.medal === 'inferno', `inferno medal for beating Phoenix Lord (${pend.medal})`);
  check(pend.stats.phoenixReached === 1 && pend.stats.phoenixDefeated === 1 && !pend.stats.bossesDefeated, 'Phoenix stats recorded separately from King Crow');
  check(['ember', 'magma'].every((id) => pend.fresh.includes(id)), `reaching / beating Phoenix Lord unlocks birds (${pend.fresh.join(',')})`);
  check(p.errors.length === 0, `no page errors (Phoenix Lord) ${p.errors.join('; ')}`);

  // 2b0. Practice mode: practice.html menu -> boss -> die -> tap to retry.
  p = await page({ width: 402, height: 874 }, { dpr: 2, touch: true });
  await p.goto(`${base}practice.html?nosound`);
  await p.waitForTimeout(400);
  check((await state(p)).scene === 'PracticeScene', 'practice.html opens the practice menu');
  const card = await p.evaluate(() => {
    const g = window.__game; const s = g.scenes.current; const r = g.renderer; const b = r.bounds; const c = s.cards[1]; const i = c.img;
    const gx = c.x + i.width / 2; const gy = c.y + i.height / 2;
    return { x: b.left + (gx / r.w) * b.width, y: b.top + ((gy - r.viewTop) / r.viewH) * b.height };
  });
  await p.touchscreen.tap(card.x, card.y);
  await p.waitForTimeout(900);
  const pr = await p.evaluate(() => { const s = window.__game.scenes.current; return { scene: s.constructor.name, practice: s.practice, state: s.state, theme: s.theme.id }; });
  check(pr.scene === 'PlayScene' && pr.practice === 'phoenixLord' && pr.state === 'ready' && pr.theme === 'volcano', `tapping a card starts that boss (${pr.practice})`);
  await tap(p);
  await p.evaluate(AUTOPILOT);
  check(await waitFor(p, () => window.__game.scenes.current.bosses.state === 'fight', 10), 'practice goes straight to the boss (no pipes)');
  await p.evaluate(() => clearInterval(window.__autopilot));
  check(await waitFor(p, () => window.__game.scenes.current.panel?.ready, 25), 'losing every life shows the practice panel');
  const pp = await p.evaluate(() => { const s = window.__game.scenes.current; return { panel: s.panel.constructor.name, stats: localStorage.getItem('aiflappy.stats'), best: localStorage.getItem('aiflappy.best') }; });
  check(pp.panel === 'PracticePanel' && pp.stats === null && pp.best === null, 'practice runs record nothing (no stats, best or unlocks)');
  await p.touchscreen.tap(200, 600);
  await p.waitForTimeout(900);
  const retry = await p.evaluate(() => { const s = window.__game.scenes.current; return { practice: s.practice, attempt: s.attempt, state: s.state }; });
  check(retry.practice === 'phoenixLord' && retry.attempt === 2 && retry.state === 'ready', `tap retries the same boss (try ${retry.attempt})`);
  await tap(p);
  check(await waitFor(p, () => window.__game.scenes.current.bosses.state === 'warning' || window.__game.scenes.current.bosses.state === 'fight', 5), 'the retry starts at the boss intro');
  // Direct link to a boss, and the menu button back to the practice menu.
  await p.goto(`${base}practice.html?boss=kingCrow&nosound`);
  await p.waitForTimeout(400);
  const direct = await p.evaluate(() => { const s = window.__game.scenes.current; return { scene: s.constructor.name, practice: s.practice }; });
  check(direct.scene === 'PlayScene' && direct.practice === 'kingCrow', 'practice.html?boss=kingCrow goes straight to King Crow');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(900);
  check((await state(p)).scene === 'PracticeScene', 'Esc on Get Ready returns to the practice menu');
  check(p.errors.length === 0, `no page errors (practice) ${p.errors.join('; ')}`);

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

  // 2c. Mouse (desktop): clicking the Play button and then the screen.
  p = await page({ width: 288, height: 512 });
  await p.goto(base);
  await p.waitForTimeout(400);
  const btn = await p.evaluate(() => { const s = window.__game.scenes.current; const i = s.play.img; return { x: s.play.x + i.width / 2, y: s.play.y + i.height / 2 }; });
  await p.mouse.click(btn.x, btn.y);
  await p.waitForTimeout(900);
  check((await state(p)).state === 'ready', 'mouse click on Play works');
  await p.mouse.click(144, 300);
  await p.waitForTimeout(100);
  check((await state(p)).state === 'playing', 'mouse click starts the run');
  check(p.errors.length === 0, `no page errors (mouse) ${p.errors.join('; ')}`);

  // 3a. Phone: tapping the title-screen Play button (touch, passive listeners).
  p = await page({ width: 402, height: 874 }, { dpr: 3, touch: true });
  await p.goto(base);
  await p.waitForTimeout(400);
  const tb = await p.evaluate(() => {
    const g = window.__game; const s = g.scenes.current; const r = g.renderer; const b = r.bounds; const i = s.play.img;
    const gx = s.play.x + i.width / 2; const gy = s.play.y + i.height / 2;
    return { x: b.left + (gx / r.w) * b.width, y: b.top + ((gy - r.viewTop) / r.viewH) * b.height };
  });
  await p.touchscreen.tap(tb.x, tb.y);
  await p.waitForTimeout(900);
  check((await state(p)).state === 'ready', 'touch tap on Play button works');
  const audioMode = await p.evaluate(async () => { await new Promise((r) => setTimeout(r, 1200)); return window.__game.audio.mode; });
  check(audioMode === 'worklet', `audio plays through the always-on mixer (${audioMode})`);

  // 2d. Character picker + unlocks.
  p = await page({ width: 288, height: 512 });
  await p.goto(base);
  await p.waitForTimeout(300);
  const pick0 = await p.evaluate(() => window.__game.scenes.current.option);
  await p.keyboard.press('ArrowRight');
  const pick1 = await p.evaluate(() => { const s = window.__game.scenes.current; return { option: s.option, playable: s.playable }; });
  check(pick0 === 'random' && pick1.option === 'yellow' && pick1.playable, `picker starts on Random and cycles (${pick0} -> ${pick1.option})`);
  // Jump to a locked bird: Play must be disabled.
  await p.evaluate(() => { const s = window.__game.scenes.current; while (s.option !== 'ninja') s.step(1); });
  await p.keyboard.press('Space');
  await p.waitForTimeout(500);
  check((await state(p)).scene === 'TitleScene', 'locked bird cannot be played');
  // Pick an unlocked one: it is saved and used for the run.
  await p.evaluate(() => { const s = window.__game.scenes.current; while (s.option !== 'red') s.step(1); });
  await p.keyboard.press('Space');
  await p.waitForTimeout(900);
  const used = await p.evaluate(() => ({ skin: window.__game.scenes.current.skin?.id, saved: localStorage.getItem('aiflappy.bird') }));
  check(used.skin === 'red' && used.saved === '"red"', `chosen bird is used and remembered (${used.skin})`);
  check(p.errors.length === 0, `no page errors (picker) ${p.errors.join('; ')}`);

  // Unlock: start at 9, pass one pipe (score 10), then crash -> Lime unlocks.
  p = await page({ width: 288, height: 512 });
  await p.goto(`${base}?start=9`);
  await p.waitForTimeout(300);
  await tap(p);
  await p.evaluate(() => {
    window.__ap = setInterval(() => {
      const s = window.__game.scenes.current;
      if (!s.bird || s.state !== 'playing') return;
      if (s.pipesPassed >= 1) return clearInterval(window.__ap);
      let t = 230;
      const q = s.pipes.list.find((x) => x.x + 52 > s.bird.x);
      if (q && q.x < 200) t = q.gapY + q.gap - 34;
      if (s.bird.y > t && s.bird.vy > -50) window.__game.input.dispatch({ type: 'press', source: 'key', x: -1, y: -1 });
    }, 30);
  });
  check(await waitFor(p, () => window.__game.scenes.current.panel?.ready, 20), 'run ends after scoring 10');
  const un = await p.evaluate(() => ({ fresh: window.__game.scenes.current.panel.newBirds.map((b) => b.id), saved: JSON.parse(localStorage.getItem('aiflappy.unlocked') || '[]') }));
  check(un.fresh.includes('lime') && un.saved.includes('lime'), `scoring 10 unlocks Lime and saves it (${un.fresh.join(',')})`);
  check(p.errors.length === 0, `no page errors (unlocks) ${p.errors.join('; ')}`);

  // 2e. Pause button returns to the title screen from Get Ready and Game Over.
  p = await page({ width: 402, height: 874 }, { dpr: 1, touch: true });
  await p.goto(`${base}?play`);
  await p.waitForTimeout(400);
  const menuPos = () => p.evaluate(() => {
    const g = window.__game; const s = g.scenes.current; const r = g.renderer; const b = r.bounds; const m = s.menuButton; const i = m.img;
    const gx = m.x + i.width / 2; const gy = m.y + i.height / 2;
    return { x: b.left + (gx / r.w) * b.width, y: b.top + ((gy - r.viewTop) / r.viewH) * b.height };
  });
  let mp = await menuPos();
  await p.touchscreen.tap(mp.x, mp.y);
  await p.waitForTimeout(900);
  check((await state(p)).scene === 'TitleScene', 'pause button on Get Ready opens the title screen');
  // From the title, start a run, crash, then use the button on Game Over.
  await p.keyboard.press('Space');
  await p.waitForTimeout(900);
  await tap(p);
  check(await waitFor(p, () => window.__game.scenes.current.panel?.ready, 15), 'crash reaches Game Over');
  const counted = await p.evaluate(() => { const s = window.__game.scenes.current; return { flaps: s.flaps, stats: JSON.parse(localStorage.getItem('aiflappy.stats')) }; });
  check(counted.flaps >= 1 && counted.stats.flaps >= 1 && 'nightRuns' in counted.stats, `run stats recorded (flaps ${counted.stats.flaps}, night runs ${counted.stats.nightRuns})`);
  mp = await menuPos();
  await p.touchscreen.tap(mp.x, mp.y);
  await p.waitForTimeout(900);
  check((await state(p)).scene === 'TitleScene', 'pause button on Game Over opens the title screen');
  // Keyboard: Esc on Get Ready goes to the title too.
  await p.keyboard.press('Space');
  await p.waitForTimeout(900);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(900);
  check((await state(p)).scene === 'TitleScene', 'Esc on Get Ready opens the title screen');
  check(p.errors.length === 0, `no page errors (menu) ${p.errors.join('; ')}`);

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

  // 4b. Stutter test modes: keepalive variants, and tapping the version number
  //     on the title screen cycles off -> none -> fast -> video -> combo -> off.
  p = await page({ width: 288, height: 512 });
  await p.goto(`${base}?keepalive=scroll&perf`);
  await p.waitForTimeout(600);
  const sc1 = await p.evaluate(() => window.__game.keepalive?.probe());
  await p.waitForTimeout(300);
  const sc2 = await p.evaluate(() => window.__game.keepalive?.probe());
  check(sc1 > 0 && sc2 !== sc1, `?keepalive=scroll keeps a box smooth-scrolling (${sc1} -> ${sc2})`);
  await p.goto(`${base}?keepalive=fast`);
  const fast = [];
  for (let i = 0; i < 4; i++) {
    await p.waitForTimeout(300);
    fast.push(await p.evaluate(() => window.__game.keepalive?.probe()));
  }
  check(fast.every((y, i) => i === 0 || y > fast[i - 1] + 100), `?keepalive=fast keeps scrolling fast one way (${fast.join(' -> ')})`);
  await p.goto(`${base}?keepalive=video`);
  await p.waitForTimeout(400);
  const vid = await p.evaluate(() => { const v = document.querySelector('video'); return v && window.__game.keepalive.mode === 'video' && v.muted && v.loop && v.playsInline && v.src.endsWith('keepalive-120fps.mp4'); });
  check(vid, '?keepalive=video adds a muted inline looping video');
  check(p.errors.length === 0, `no page errors (keepalive) ${p.errors.join('; ')}`);

  p = await page({ width: 402, height: 874 }, { dpr: 1, touch: true });
  await p.goto(base);
  await p.waitForTimeout(400);
  const verPos = await p.evaluate(() => {
    const g = window.__game; const s = g.scenes.current; const r = g.renderer; const b = r.bounds; const img = g.sprites.get('text-version');
    const gy = s.versionY() + img.height / 2;
    return { x: b.left + b.width / 2, y: b.top + ((gy - r.viewTop) / r.viewH) * b.height };
  });
  const seen = [await p.evaluate(() => window.__game.testMode.id)];
  for (let i = 0; i < 5; i++) {
    await p.touchscreen.tap(verPos.x, verPos.y);
    await p.waitForTimeout(150);
    seen.push(await p.evaluate(() => {
      const g = window.__game; const k = g.keepalive;
      const n = document.querySelectorAll('body > div, body > video').length;
      return `${g.testMode.id}${k ? `/${k.mode}` : ''}${n ? `+${n}` : ''}`;
    }));
    if (i === 0) {
      const saved = await p.evaluate(() => localStorage.getItem('aiflappy.testMode'));
      check(saved === '"none"', `test mode is saved (${saved})`);
    }
  }
  check(seen.join(' ') === 'off none fast/fast+1 video/video+1 combo/combo+2 off', `version tap cycles test modes (${seen.join(' ')})`);
  check((await state(p)).scene === 'TitleScene', 'version taps stay on the title screen');
  await p.evaluate(() => window.__game.cycleTestMode()); // none, saved
  await p.reload();
  await p.waitForTimeout(400);
  check(await p.evaluate(() => window.__game.testMode.id === 'none'), 'saved test mode is restored on launch');
  await p.evaluate(() => localStorage.removeItem('aiflappy.testMode'));
  check(p.errors.length === 0, `no page errors (test modes) ${p.errors.join('; ')}`);

  // iPhone: normal play runs the combo keepalive (no graph); ?keepalive=none
  // turns it off.
  {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
    const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: ua });
    const ip = await ctx.newPage();
    const errs = [];
    ip.on('pageerror', (e) => errs.push(e.message));
    await ip.goto(base);
    await ip.waitForTimeout(500);
    const def = await ip.evaluate(() => ({ mode: window.__game.testMode.id, keep: window.__game.keepalive?.mode, els: document.querySelectorAll('body > div, body > video').length }));
    check(def.mode === 'off' && def.keep === 'combo' && def.els === 2, `iPhone: normal play runs the combo keepalive (${def.keep}, ${def.els} elements)`);
    await ip.goto(`${base}?keepalive=none`);
    await ip.waitForTimeout(400);
    const none = await ip.evaluate(() => ({ keep: window.__game.keepalive, els: document.querySelectorAll('body > div, body > video').length }));
    check(none.keep === null && none.els === 0, 'iPhone: ?keepalive=none turns it off');
    check(errs.length === 0, `no page errors (iPhone keepalive) ${errs.join('; ')}`);
    await ctx.close();
  }

  // 4c. Hitch lab: main-thread strip runs on rAF, worker strip draws on its own
  //     clock, and the keepalive / pace buttons work.
  p = await page({ width: 402, height: 874 }, { dpr: 3, touch: true });
  await p.goto(`${base}lab.html`);
  await p.waitForTimeout(2500);
  const lab = await p.evaluate(() => ({ frames: window.__lab.stats.frames, draws: window.__lab.workerStats.draws }));
  // Draw rates are only sanity-checked: headless software rendering at 3x is slow.
  check(lab.frames > 30 && lab.draws > 20, `lab.html: main strip animates (${lab.frames} frames) and the worker draws (${lab.draws}/s)`);
  await p.click('button[data-keep="fast"]');
  await p.click('button[data-pace="240"]');
  await p.waitForTimeout(1500);
  const lab2 = await p.evaluate(() => ({ keep: window.__lab.keepalive?.mode, pace: window.__lab.workerStats.pace }));
  check(lab2.keep === 'fast' && lab2.pace === 240, `lab.html buttons: fast keepalive on, worker paced at ${lab2.pace}/s`);
  check(p.errors.length === 0, `no page errors (lab) ${p.errors.join('; ')}`);

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
