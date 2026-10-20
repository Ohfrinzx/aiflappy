// Phoenix Lord — the pipe-150 boss. Three phases (see CONFIG.bosses.phoenixLord):
//   1: flame beams (a warning lane first), lava pillar walls, and fireballs
//      that burst into a ring of embers
//   2: two beams at once, swaying pillars, an ember spiral with a drifting
//      safe gap, and homing wisps
//   3 (blue flames): back-to-back beams, embers thrown during pillar walls, a
//      denser spiral, and ash fog that hides everything far from the bird
// Every attack is dodged by moving up or down (the bird's x never changes).
// Each emptied health bar is a "rebirth": it burns to ash and reignites.
// Damage: it drops frost orbs; fly into one and it fires back at the boss.
import { CONFIG } from '../../config.js';
import { clamp, lerp, rand, weightedPick, DEG } from '../../core/math.js';
import { Boss } from '../../entities/boss.js';
import { Ember, Fireball, Wisp, FlameBeam, Orb, Bolt } from '../../entities/projectiles.js';

const HOME_X = 176;
const HOME_Y = 140;
const BEAK_Y = 37; // beak centre, relative to the sprite's top
const T = CONFIG.bosses.phoenixLord;
const FIRE = ['#ff6a1a', '#ffd23a', '#fff6c0', '#e8401a'];

// Attack weights per phase (index 0 = phase 1).
const ATTACKS = [
  [{ id: 'beam', weight: 3 }, { id: 'pillars', weight: 2 }, { id: 'fireballs', weight: 3 }],
  [{ id: 'beam', weight: 3 }, { id: 'pillars', weight: 2 }, { id: 'fireballs', weight: 2 }, { id: 'spiral', weight: 2 }, { id: 'wisps', weight: 2 }],
  [{ id: 'beam', weight: 3 }, { id: 'pillars', weight: 2 }, { id: 'fireballs', weight: 2 }, { id: 'spiral', weight: 3 }, { id: 'wisps', weight: 2 }],
];

export class PhoenixLord extends Boss {
  constructor(scene) {
    super(scene, { hp: T.hp, lives: T.lives, x: CONFIG.width + 40, y: HOME_Y });
    this.mouthOpen = false;
    this.ash = false; // burnt out (rebirth / defeat)
    this.fog = 0; // ash fog strength 0..1 (phase 3)
    this.fogTarget = 0;
    this.lastAttack = null;
    this.safeCenter = null; // spiral safe gap: t -> y (also read by the smoke test)
    this.hpMarks = T.phaseAt; // drawn as notches on the health bar
  }

  get phase() {
    if (this.hp > T.phaseAt[0]) return 1;
    return this.hp > T.phaseAt[1] ? 2 : 3;
  }

  // Per-phase tuning value.
  p(arr) {
    return arr[this.phase - 1];
  }

  get frameName() {
    const wing = Math.floor(this.t * (this.phase === 3 ? 9 : 6)) % 2;
    const idx = wing + (this.mouthOpen ? 2 : 0);
    if (this.ash) return `phoenix-ash-${idx}`;
    if (this.hurtT > 0 && Math.floor(this.hurtT * 30) % 2 === 0) return `phoenix-hurt-${idx}`;
    return this.phase === 3 ? `phoenix-rage-${idx}` : `phoenix-${idx}`;
  }

  get beak() {
    return { x: this.x + 4, y: this.y + BEAK_Y };
  }

  get bird() {
    return this.scene.bird;
  }

  sfx(name) {
    this.scene.game.audio.play(name);
  }

  hit(dmg) {
    this.phaseBefore = this.phase;
    super.hit(dmg);
  }

  onHit() {
    this.sfx('bossHit');
    this.scene.game.renderer.shake(0.2, 3);
    this.scene.particles.burst(this.cx, this.cy, { count: 14, colors: FIRE, speed: 160, life: 0.7, size: 3 });
    this.scene.addScore(1);
    if (this.hp > 0 && this.phase !== this.phaseBefore) this.enrage(this.phase);
  }

  // Phase change: roar, shake, and a ring of embers in every direction.
  enrage(phase) {
    this.sfx('roar');
    this.scene.game.renderer.shake(0.5, 4);
    const n = phase === 3 ? 16 : 12;
    const off = rand(0, 360 / n);
    for (let i = 0; i < n; i++) this.emberAt(this.cx, this.cy, off + (i * 360) / n, 140);
  }

  // Angles: 0 = straight left, positive = downwards (same as King Crow).
  emberAt(x, y, angleDeg, speed) {
    const a = angleDeg * DEG;
    this.scene.hazards.add(new Ember(this.sprites, x, y, -Math.cos(a) * speed, Math.sin(a) * speed));
  }

  // Angle from the beak toward the bird.
  aimAngle() {
    const b = this.beak;
    return Math.atan2(this.bird.cy - b.y, b.x - this.bird.cx) / DEG;
  }

  *behavior() {
    this.tx = HOME_X;
    this.ty = HOME_Y;
    this.ease = 1.6;
    this.sfx('roar');
    yield 1.4;
    this.ease = 3.5;
    while (true) {
      const pool = ATTACKS[this.phase - 1].filter((a) => a.id !== this.lastAttack);
      const atk = weightedPick(pool).id;
      this.lastAttack = atk;
      // Phase 3 ash fog (never during pillar walls: those need to be seen early).
      this.fogTarget = this.phase === 3 && atk !== 'pillars' && Math.random() < T.fogChance ? 1 : 0;
      yield* this[atk]();
      this.fogTarget = 0;
      yield* this.offerOrb();
    }
  }

  // Beam heights for one round: the first is aimed at the bird, the rest keep
  // at least T.beamGap between centres so a bird-sized gap always remains.
  beamLanes(n) {
    const lo = 30;
    const hi = CONFIG.groundY - 30;
    const ys = [clamp(this.bird.cy, lo, hi)];
    for (let tries = 0; ys.length < n && tries < 60; tries++) {
      const y = rand(lo, hi);
      if (ys.every((o) => Math.abs(o - y) >= T.beamGap)) ys.push(y);
    }
    return ys;
  }

  // Flame beams: a flashing lane, then a horizontal beam of fire. The first
  // comes from the beak; extra lanes erupt from the right edge.
  *beam() {
    const combos = this.p(T.beamCombos);
    for (let c = 0; c < combos; c++) {
      const ys = this.beamLanes(this.p(T.beamLanes));
      const warn = this.p(T.beamWarn);
      const burn = this.p(T.beamTime);
      this.tx = HOME_X;
      this.ty = clamp(ys[0] - BEAK_Y, -20, 300);
      this.sfx('charge');
      ys.forEach((y, i) => {
        const onFire = i === 0
          ? () => {
            this.mouthOpen = true;
            this.sfx('flame');
            this.scene.game.renderer.shake(burn, 2);
          }
          : null;
        this.scene.hazards.add(new FlameBeam(y, T.beamHalf, i === 0 ? HOME_X + 8 : CONFIG.width + 8, warn, burn, onFire));
      });
      yield warn + burn;
      this.mouthOpen = false;
      yield c < combos - 1 ? 0.15 : 0.5;
    }
  }

  // Lava pillars scroll in like pipe walls (gaps sway from phase 2). In phase 3
  // it stays on screen and lobs aimed embers between them.
  *pillars() {
    const pipes = this.scene.pipes;
    const speed = this.p(T.pillarSpeed);
    const gap = this.p(T.pillarGap);
    const sway = this.p(T.pillarSway);
    const sniping = this.p(T.pillarSniping);
    this.ty = sniping ? 4 : -150;
    this.tx = sniping ? 196 : HOME_X;
    this.ease = 2.5;
    this.sfx('roar');
    yield 0.8;
    const count = this.p(T.pillarCount);
    let last = null;
    let snipeT = 0;
    for (let i = 0; i < count; i++) {
      const gapY = clamp(pipes.randomGapY(gap), 80 + sway, CONFIG.groundY - 30 - gap - sway);
      last = pipes.add({
        x: CONFIG.width + 10, gapY, gap, speed, scores: false, sprite: 'pillar-lava',
        sway: sway ? { amp: sway, speed: rand(2.2, 3.2) } : null,
      });
      const wait = 175 / speed;
      for (let t = 0; t < wait; t += 0.05) {
        if (sniping && (snipeT += 0.05) >= 0.9) {
          snipeT = 0;
          const b = this.beak;
          this.emberAt(b.x, b.y, this.aimAngle(), 210);
          this.sfx('shoot');
        }
        yield 0.05;
      }
    }
    yield () => last.x < 60;
    this.tx = HOME_X;
    this.ty = HOME_Y;
    yield 0.6;
    this.ease = 3.5;
  }

  // Fireballs fly to a point level with the bird and burst into an even ring
  // of embers. The burst is kept ~80+ px from the bird so the ring's gaps are
  // wider than the bird by the time they reach it.
  *fireballs() {
    this.tx = HOME_X + 30;
    const n = this.p(T.fireballs);
    for (let i = 0; i < n; i++) {
      this.ty = clamp(this.bird.cy - BEAK_Y + rand(-70, 70), 0, 280);
      yield 0.45;
      this.mouthOpen = true;
      const b = this.beak;
      const bx = this.bird.x + this.bird.w + rand(80, 92);
      const by = clamp(this.bird.cy, 40, CONFIG.groundY - 50);
      this.scene.hazards.add(new Fireball(this.sprites, b.x, b.y, bx, by, this.p(T.fireballSpeed), (x, y) => this.burst(x, y)));
      this.sfx('shoot');
      yield 0.12;
      this.mouthOpen = false;
      yield 0.6;
    }
    this.tx = HOME_X;
    this.ty = HOME_Y;
    yield 0.6;
  }

  burst(x, y) {
    const n = this.p(T.burstCount);
    const v = this.p(T.burstSpeed);
    const off = rand(0, 360 / n);
    for (let k = 0; k < n; k++) this.emberAt(x, y, off + (k * 360) / n, v);
    this.sfx('burst');
    this.scene.particles.burst(x, y, { count: 8, colors: FIRE, speed: 90, life: 0.4, size: 2, gravity: 0 });
  }

  // Ember spiral: arms of embers wheel out of the boss. Embers that would
  // cross the bird's column inside a slowly drifting safe gap are never fired,
  // so staying in the gap dodges everything (like King Crow's feather storm).
  *spiral() {
    this.tx = HOME_X + 20;
    this.ty = HOME_Y;
    this.mouthOpen = true;
    this.sfx('roar');
    yield 0.6;
    const dur = this.p(T.spiralTime);
    const arms = this.p(T.spiralArms);
    const v = this.p(T.spiralSpeed);
    const band = this.p(T.spiralSafeBand);
    const lo = 30 + band / 2;
    const hi = CONFIG.groundY - 40 - band / 2;
    const mid = clamp(this.bird.cy, lo + 40, hi - 40);
    const t0 = this.t;
    const w = rand(0.8, 1.2) * (Math.random() < 0.5 ? -1 : 1);
    this.safeCenter = (t) => clamp(mid + 70 * Math.sin((t - t0) * w), lo, hi);
    this.safeBand = band;
    const spin = rand(100, 130) * (Math.random() < 0.5 ? -1 : 1); // deg/s
    let ang = rand(0, 360);
    const step = 0.09;
    for (let t = 0; t < dur; t += step) {
      for (let a = 0; a < arms; a++) this.spiralEmber(this.cx, this.cy, ang + (a * 360) / arms, v);
      ang += spin * step;
      this.sfx('shoot');
      yield step;
    }
    this.mouthOpen = false;
    this.tx = HOME_X;
    yield 0.9;
    this.safeCenter = null;
  }

  spiralEmber(x, y, deg, speed) {
    const a = deg * DEG;
    const vx = -Math.cos(a) * speed;
    const vy = Math.sin(a) * speed;
    const colX = this.bird.cx;
    if (vx < -1 && x > colX) {
      // Where (and when) it crosses the bird's column. The exclusion adds the
      // ember radius and how far it drifts vertically across the bird's width.
      const tc = (x - colX) / -vx;
      const yc = y + vy * tc;
      const excl = this.safeBand / 2 + 4 + (this.bird.w / 2) * Math.abs(vy / vx);
      if (Math.abs(yc - this.safeCenter(this.t + tc)) <= excl) return;
    }
    this.emberAt(x, y, deg, speed);
  }

  // Homing wisps: they follow the bird's height (slower than it can move),
  // then stop steering close to it. Move just before they arrive.
  *wisps() {
    const n = this.p(T.wisps);
    for (let i = 0; i < n; i++) {
      this.mouthOpen = true;
      const b = this.beak;
      this.scene.hazards.add(new Wisp(this.sprites, b.x, b.y, this.p(T.wispSpeed), this.p(T.wispTurn), this.bird));
      this.sfx('orb');
      yield 0.15;
      this.mouthOpen = false;
      this.ty = rand(20, 260);
      yield 0.75;
    }
    this.ty = HOME_Y;
    yield 0.8;
  }

  *offerOrb() {
    const b = this.beak;
    this.mouthOpen = true;
    this.sfx('orb');
    this.scene.hazards.add(new Orb(this.sprites, b.x, b.y, rand(80, 320), this.p(T.orbSpeed), 'frost'));
    yield 0.2;
    this.mouthOpen = false;
    yield this.p(T.restAfterOrb);
  }

  // Called by the boss director when the player touches an orb.
  absorb(orb) {
    orb.collected = true;
    this.sfx('orb');
    // Damage per hit is CONFIG.bosses.phoenixLord.damagePerHit (src/config.js).
    this.scene.hazards.add(new Bolt(this.sprites, orb.x, orb.y, this, () => this.hit(T.damagePerHit), 'frost', '#c8f4ff'));
  }

  update(dt) {
    super.update(dt);
    const k = dt * 1.5;
    this.fog += clamp(this.fogTarget - this.fog, -k, k);
  }

  move(dt) {
    if (this.defeated && this.falling) {
      this.vy += 700 * dt;
      this.ay += this.vy * dt;
      this.rot -= 120 * dt;
      this.x = this.ax;
      this.y = this.ay;
      return;
    }
    super.move(dt);
  }

  // A health bar emptied but lives remain: burn to ash, then reignite.
  *revive() {
    const s = this.scene;
    this.mouthOpen = false;
    this.lastAttack = null;
    this.fogTarget = 0;
    this.safeCenter = null;
    s.hazards.clear();
    s.pipes.list = s.pipes.list.filter((p) => p.scores);
    if (this.ax > CONFIG.width || this.ay < -60) {
      this.ax = CONFIG.width + 40; // was off screen (pillar walls): come back from the right
      this.ay = HOME_Y;
    }
    this.tx = HOME_X;
    this.ty = HOME_Y + 40;
    this.ease = 2;
    this.ash = true;
    this.sfx('explode');
    s.game.renderer.flash(0.3, 0.6);
    s.game.renderer.shake(0.4, 4);
    s.particles.burst(this.cx, this.cy, { count: 24, colors: ['#5a4e52', '#8a7e80', '#ff6a1a'], speed: 160, life: 0.9, size: 3 });
    yield 1.0;
    // Rebirth.
    this.ash = false;
    this.ty = HOME_Y;
    this.mouthOpen = true;
    this.sfx('roar');
    s.game.renderer.flash(0.3, 0.7);
    s.particles.burst(this.cx, this.cy, { count: 30, colors: FIRE, speed: 220, life: 0.8, size: 3 });
    for (let i = 1; i <= 20; i++) {
      this.hp = Math.ceil((this.maxHp * i) / 20); // bar visibly refills
      yield 0.05;
    }
    this.mouthOpen = false;
    this.ease = 3.5;
    yield 0.4;
  }

  *defeat() {
    this.mouthOpen = true;
    this.fogTarget = 0;
    this.safeCenter = null;
    const s = this.scene;
    s.hazards.clear();
    s.pipes.list = s.pipes.list.filter((p) => p.scores);
    this.tx = this.ax;
    this.ty = this.ay;
    this.sfx('explode');
    s.game.renderer.flash(0.4, 0.8);
    for (let i = 0; i < 9; i++) {
      this.hurtT = 0.12;
      s.game.renderer.shake(0.2, 4);
      s.particles.burst(this.x + rand(10, 100), this.y + rand(10, 78), { count: 10, colors: FIRE, speed: 180, life: 0.6, size: 3 });
      if (i % 3 === 0) this.sfx('bossHit');
      yield 0.18;
    }
    this.ash = true;
    this.falling = true;
    this.vy = -160;
    this.sfx('die');
    yield () => this.y > CONFIG.height + 40;
    this.finished = true;
  }

  // Phase 3 ash fog: darkens everything but a circle around the bird.
  renderFog(r, alpha) {
    if (this.fog < 0.01) return;
    const b = this.bird;
    const cx = lerp(b.px, b.x, alpha) + b.w / 2;
    const cy = lerp(b.py, b.y, alpha) + b.h / 2;
    const R = T.fogRadius;
    const ctx = r.ctx;
    const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
    g.addColorStop(0, 'rgba(34,22,26,0)');
    g.addColorStop(1, 'rgba(34,22,26,1)');
    ctx.globalAlpha = 0.7 * this.fog;
    ctx.fillStyle = g;
    ctx.fillRect(-8, r.viewTop - 8, CONFIG.width + 16, r.viewBottom - r.viewTop + 16);
    ctx.globalAlpha = 1;
  }
}
