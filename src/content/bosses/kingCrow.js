// King Crow — the score-100 boss. Three phases (see CONFIG.bosses.kingCrow):
//   1: aimed feather volleys, feather fans, pipe walls, charges
//   2: everything faster/denser, aimed shots lead your movement, swaying pipe
//      walls, and feather rain from above
//   3 (enraged, red): back-to-back charges, it snipes during pipe walls,
//      and a feather ring bursts out at each phase change
// Damage: it drops golden orbs; fly into one and it fires back at the boss.
import { CONFIG } from '../../config.js';
import { clamp, rand, weightedPick, DEG } from '../../core/math.js';
import { Boss } from '../../entities/boss.js';
import { Feather, Orb, Bolt } from '../../entities/projectiles.js';

const HOME_X = 182;
const T = CONFIG.bosses.kingCrow;

// Attack weights per phase (index 0 = phase 1).
const ATTACKS = [
  [{ id: 'volley', weight: 3 }, { id: 'fan', weight: 3 }, { id: 'wall', weight: 2 }, { id: 'charge', weight: 1 }],
  [{ id: 'volley', weight: 3 }, { id: 'fan', weight: 2 }, { id: 'wall', weight: 2 }, { id: 'charge', weight: 2 }, { id: 'rain', weight: 2 }],
  [{ id: 'volley', weight: 3 }, { id: 'fan', weight: 2 }, { id: 'wall', weight: 2 }, { id: 'charge', weight: 3 }, { id: 'rain', weight: 3 }],
];

export class KingCrow extends Boss {
  constructor(scene) {
    super(scene, { hp: T.hp, x: CONFIG.width + 40, y: 150 });
    this.mouthOpen = false;
    this.charging = false;
    this.chargeSpeed = 0;
    this.telegraph = 0;
    this.lastAttack = null;
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
    const wing = this.charging ? 0 : Math.floor(this.t * (this.phase === 3 ? 10 : 7)) % 2;
    const idx = wing + (this.mouthOpen ? 2 : 0);
    if (this.hurtT > 0 && Math.floor(this.hurtT * 30) % 2 === 0) return `kingcrow-hurt-${idx}`;
    return this.phase === 3 ? `kingcrow-rage-${idx}` : `kingcrow-${idx}`;
  }

  get beak() {
    return { x: this.x + 4, y: this.y + 36 };
  }

  get bird() {
    return this.scene.bird;
  }

  sfx(name) {
    this.scene.game.audio.play(name);
  }

  onHit() {
    this.sfx('bossHit');
    this.scene.game.renderer.shake(0.2, 3);
    this.scene.particles.burst(this.cx, this.cy, {
      count: 14, colors: ['#5c4a82', '#7e6aa6', '#ffffff'], speed: 160, life: 0.7, size: 3,
    });
    this.scene.addScore(1);
    // hp is already reduced here, so landing exactly on a threshold = new phase.
    if (this.hp > 0 && T.phaseAt.includes(this.hp)) this.enrage(this.phase);
  }

  // Phase change: roar, shake, and a ring of feathers in every direction.
  enrage(phase) {
    this.sfx('roar');
    this.scene.game.renderer.shake(0.5, 4);
    const n = phase === 3 ? 16 : 12;
    const off = rand(0, 360 / n);
    for (let i = 0; i < n; i++) this.shootFrom(this.cx, this.cy, off + (i * 360) / n, 140);
  }

  shootFrom(x, y, angleDeg, speed) {
    const a = angleDeg * DEG;
    this.scene.hazards.add(new Feather(this.sprites, x, y, -Math.cos(a) * speed, Math.sin(a) * speed));
  }

  shoot(angleDeg, speed) {
    const b = this.beak;
    this.shootFrom(b.x, b.y, angleDeg, speed);
  }

  // Angle toward the bird, optionally leading its vertical movement.
  aimAngle(speed, lead = 0) {
    const b = this.beak;
    const bird = this.bird;
    const t = Math.hypot(b.x - bird.cx, b.y - bird.cy) / speed;
    const ty = clamp(bird.cy + bird.vy * t * lead, -20, CONFIG.groundY - 10);
    return Math.atan2(ty - b.y, b.x - bird.cx) / DEG;
  }

  *behavior() {
    this.tx = HOME_X;
    this.ty = 150;
    this.ease = 1.6;
    this.sfx('roar');
    yield 1.4;
    this.ease = 3.5;
    while (true) {
      const pool = ATTACKS[this.phase - 1].filter((a) => a.id !== this.lastAttack);
      const atk = weightedPick(pool).id;
      this.lastAttack = atk;
      yield* this[atk]();
      yield* this.offerOrb();
    }
  }

  *volley() {
    const shots = this.p(T.volleyShots);
    for (let i = 0; i < shots; i++) {
      const speed = this.p(T.volleySpeed);
      this.ty = clamp(this.bird.y - 30 + rand(-50, 50), 30, 290);
      yield this.p(T.volleyGap) + 0.08;
      this.mouthOpen = true;
      yield 0.1;
      this.shoot(this.aimAngle(speed, this.p(T.volleyLead)), speed);
      this.sfx('shoot');
      yield 0.08;
      this.mouthOpen = false;
      yield this.p(T.volleyGap);
    }
    yield 0.3;
  }

  *fan() {
    this.ty = rand(110, 230);
    yield 0.55;
    const waves = this.p(T.fanWaves);
    for (let wave = 0; wave < waves; wave++) {
      const n = this.p(T.fanCount);
      const spread = this.p(T.fanSpread);
      const step = spread / (n - 1);
      const off = wave % 2 ? step / 2 : 0; // alternate waves fill the previous gaps
      this.mouthOpen = true;
      yield 0.12;
      for (let k = 0; k < n; k++) this.shoot(-spread / 2 + k * step + off, this.p(T.fanSpeed));
      this.sfx('shoot');
      yield 0.12;
      this.mouthOpen = false;
      yield Math.max(0.35, 0.95 - this.phase * 0.18);
    }
    yield 0.3;
  }

  *wall() {
    const pipes = this.scene.pipes;
    const speed = this.p(T.wallSpeed);
    const gap = this.p(T.wallGap);
    const sway = this.p(T.wallSway);
    const sniping = this.p(T.wallSniping);
    this.ty = sniping ? 8 : -140;
    this.tx = sniping ? 200 : HOME_X;
    this.ease = 2.5;
    this.sfx('roar');
    yield 0.8;
    const count = this.p(T.wallPipes);
    let last = null;
    let snipeT = 0;
    for (let i = 0; i < count; i++) {
      const base = pipes.randomGapY(gap);
      const gapY = clamp(base, 80 + sway, CONFIG.groundY - 30 - gap - sway);
      last = pipes.add({
        x: CONFIG.width + 10, gapY, gap, speed, scores: false,
        sway: sway ? { amp: sway, speed: rand(2.2, 3.2) } : null,
      });
      // Wait for spacing, sniping aimed feathers meanwhile when enraged.
      const wait = 175 / speed;
      for (let t = 0; t < wait; t += 0.05) {
        if (sniping && (snipeT += 0.05) >= 0.85) {
          snipeT = 0;
          const v = this.p(T.volleySpeed) * 0.85;
          this.shoot(this.aimAngle(v, 0.5), v);
          this.sfx('shoot');
        }
        yield 0.05;
      }
    }
    yield () => last.x < 60;
    this.tx = HOME_X;
    this.ty = 150;
    yield 0.6;
    this.ease = 3.5;
  }

  *charge() {
    const count = this.p(T.chargeCount);
    for (let c = 0; c < count; c++) {
      if (c > 0) {
        // Re-enter from the right edge for the follow-up dash.
        this.ax = CONFIG.width - 30;
        this.ay = clamp(this.bird.cy - 40, -10, 320);
      }
      this.sfx('charge');
      this.telegraph = 1;
      const track = this.p(T.chargeTrack);
      for (let t = 0; t < track; t += 1 / CONFIG.tickRate) {
        this.ty = clamp(this.bird.cy - 40, -10, 320);
        yield 0;
      }
      this.telegraph = 2;
      yield this.p(T.chargeLock);
      this.telegraph = 0;
      this.chargeSpeed = this.p(T.chargeSpeed);
      this.charging = true;
      this.mouthOpen = true;
      this.sfx('roar');
      yield () => this.ax < -110;
      this.charging = false;
      this.mouthOpen = false;
    }
    this.ax = CONFIG.width + 40;
    this.ay = 150;
    this.tx = HOME_X;
    this.ty = 150;
    yield 0.9;
  }

  // Feathers fall from the sky across the bird's column.
  *rain() {
    this.ty = 30;
    this.mouthOpen = true;
    this.sfx('roar');
    yield 0.6;
    const n = this.p(T.rainCount);
    const v = this.p(T.rainSpeed);
    const sniping = this.p(T.rainSniping);
    for (let i = 0; i < n; i++) {
      const x = rand(28, 120);
      this.scene.hazards.add(new Feather(this.sprites, x, -30, rand(-20, 20), v * rand(0.85, 1.15)));
      if (sniping && i % 4 === 3) {
        const sv = this.p(T.volleySpeed) * 0.8;
        this.shoot(this.aimAngle(sv, 0.5), sv);
        this.sfx('shoot');
      }
      yield Math.max(0.1, 0.24 - this.phase * 0.04);
    }
    this.mouthOpen = false;
    this.ty = 150;
    yield 0.9;
  }

  *offerOrb() {
    const b = this.beak;
    this.mouthOpen = true;
    this.sfx('orb');
    this.scene.hazards.add(new Orb(this.sprites, b.x, b.y, rand(80, 320), this.p(T.orbSpeed)));
    yield 0.2;
    this.mouthOpen = false;
    yield this.p(T.restAfterOrb);
  }

  // Called by the boss director when the player touches an orb.
  absorb(orb) {
    orb.collected = true;
    this.sfx('orb');
    this.scene.hazards.add(new Bolt(this.sprites, orb.x, orb.y, this, () => this.hit(1)));
  }

  move(dt) {
    if (this.charging) {
      this.ax -= this.chargeSpeed * dt;
      this.x = this.ax;
      this.y = this.ay;
      return;
    }
    if (this.defeated && this.falling) {
      this.vy += 900 * dt;
      this.ay += this.vy * dt;
      this.ax -= 30 * dt;
      this.rot -= 200 * dt;
      this.x = this.ax;
      this.y = this.ay;
      return;
    }
    super.move(dt);
    if (this.telegraph === 2) this.x += Math.round(rand(-2, 2));
  }

  *defeat() {
    this.charging = false;
    this.telegraph = 0;
    this.mouthOpen = true;
    const s = this.scene;
    s.hazards.clear();
    s.pipes.list = s.pipes.list.filter((p) => p.scores);
    this.tx = this.ax;
    this.ty = this.ay;
    this.sfx('explode');
    s.game.renderer.flash(0.4, 0.8);
    for (let i = 0; i < 8; i++) {
      this.hurtT = 0.12;
      s.game.renderer.shake(0.2, 4);
      s.particles.burst(this.x + rand(10, 86), this.y + rand(10, 70), {
        count: 10, colors: ['#ffffff', '#fde680', '#f8b800', '#5c4a82'], speed: 180, life: 0.6, size: 3,
      });
      if (i % 3 === 0) this.sfx('bossHit');
      yield 0.18;
    }
    this.falling = true;
    this.vy = -200;
    this.sfx('die');
    yield () => this.y > CONFIG.height + 40;
    this.finished = true;
  }

  render(r, alpha) {
    if (this.telegraph) {
      const on = this.telegraph === 2 || Math.floor(this.t * 12) % 2 === 0;
      if (on) r.rect(0, Math.round(this.y + 16), Math.round(this.x), 48, '#ff3020', this.telegraph === 2 ? 0.35 : 0.18);
    }
    super.render(r, alpha);
  }
}
