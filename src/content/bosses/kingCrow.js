// King Crow — the score-100 boss.
// Phase 1: feather volleys, feather fans, pipe walls.
// Phase 2 (half HP): faster, more projectiles, plus a telegraphed charge.
// Damage: it drops golden orbs; fly into one and it fires back at the boss.
import { CONFIG } from '../../config.js';
import { clamp, pick, rand, DEG } from '../../core/math.js';
import { Boss } from '../../entities/boss.js';
import { Feather, Orb, Bolt } from '../../entities/projectiles.js';

const HOME_X = 182;

export class KingCrow extends Boss {
  constructor(scene) {
    super(scene, { hp: 6, x: CONFIG.width + 40, y: 150 });
    this.mouthOpen = false;
    this.charging = false;
    this.telegraph = 0;
    this.lastAttack = null;
  }

  get frameName() {
    const wing = this.charging ? 0 : Math.floor(this.t * 7) % 2;
    const idx = wing + (this.mouthOpen ? 2 : 0);
    return this.hurtT > 0 && Math.floor(this.hurtT * 30) % 2 === 0 ? `kingcrow-hurt-${idx}` : `kingcrow-${idx}`;
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
    if (this.hp === Math.ceil(this.maxHp / 2)) this.sfx('roar');
  }

  shoot(angleDeg, speed) {
    const b = this.beak;
    const a = angleDeg * DEG;
    this.scene.hazards.add(new Feather(this.sprites, b.x, b.y, -Math.cos(a) * speed, Math.sin(a) * speed));
  }

  aimAngle() {
    const b = this.beak;
    return Math.atan2(this.bird.cy - b.y, b.x - this.bird.cx) / DEG;
  }

  *behavior() {
    this.tx = HOME_X;
    this.ty = 150;
    this.ease = 1.6;
    this.sfx('roar');
    yield 1.6;
    this.ease = 3;
    while (true) {
      const pool = this.phase === 1 ? ['volley', 'fan', 'wall'] : ['volley', 'fan', 'wall', 'charge', 'charge'];
      let atk;
      do atk = pick(pool);
      while (atk === this.lastAttack && pool.length > 1);
      this.lastAttack = atk;
      yield* this[atk]();
      yield* this.offerOrb();
    }
  }

  *volley() {
    const p2 = this.phase === 2;
    const shots = p2 ? 5 : 3;
    for (let i = 0; i < shots; i++) {
      this.ty = clamp(this.bird.y - 30 + rand(-40, 40), 40, 290);
      yield p2 ? 0.25 : 0.4;
      this.mouthOpen = true;
      yield 0.12;
      this.shoot(this.aimAngle(), p2 ? 230 : 190);
      this.sfx('shoot');
      yield 0.12;
      this.mouthOpen = false;
      yield p2 ? 0.15 : 0.3;
    }
    yield 0.4;
  }

  *fan() {
    const p2 = this.phase === 2;
    const angles = p2 ? [-28, -14, 0, 14, 28] : [-22, 0, 22];
    this.ty = rand(120, 220);
    yield 0.7;
    for (let wave = 0; wave < (p2 ? 3 : 2); wave++) {
      this.mouthOpen = true;
      yield 0.15;
      const off = wave % 2 ? 9 : 0;
      angles.forEach((a) => this.shoot(a + off, p2 ? 170 : 150));
      this.sfx('shoot');
      yield 0.15;
      this.mouthOpen = false;
      yield p2 ? 0.55 : 0.85;
    }
    yield 0.4;
  }

  *wall() {
    const p2 = this.phase === 2;
    const pipes = this.scene.pipes;
    const speed = p2 ? 175 : 155;
    this.ty = -140;
    this.ease = 2.5;
    this.sfx('roar');
    yield 0.9;
    const count = p2 ? 4 : 3;
    let last = null;
    for (let i = 0; i < count; i++) {
      last = pipes.add({ x: CONFIG.width + 10, gapY: pipes.randomGapY(112), gap: 112, speed, scores: false });
      yield 180 / speed;
    }
    yield () => last.x < 40;
    this.tx = HOME_X;
    this.ty = 150;
    yield 0.9;
    this.ease = 3;
  }

  *charge() {
    this.sfx('charge');
    // Track the player, then lock on and dash.
    this.telegraph = 1;
    for (let t = 0; t < 0.7; t += 1 / CONFIG.tickRate) {
      this.ty = clamp(this.bird.cy - 40, -10, 320);
      yield 0;
    }
    this.telegraph = 2;
    yield 0.35;
    this.telegraph = 0;
    this.charging = true;
    this.mouthOpen = true;
    this.sfx('roar');
    yield () => this.ax < -110;
    this.charging = false;
    this.mouthOpen = false;
    this.ax = CONFIG.width + 40;
    this.ay = 150;
    this.tx = HOME_X;
    this.ty = 150;
    yield 1.1;
  }

  *offerOrb() {
    const b = this.beak;
    this.mouthOpen = true;
    this.sfx('orb');
    const target = rand(110, 300);
    this.scene.hazards.add(new Orb(this.sprites, b.x, b.y, target, this.phase === 2 ? 115 : 100));
    yield 0.25;
    this.mouthOpen = false;
    yield this.phase === 2 ? 1.0 : 1.4;
  }

  // Called by the scene when the player touches an orb.
  absorb(orb) {
    orb.collected = true;
    this.sfx('orb');
    this.scene.hazards.add(new Bolt(this.sprites, orb.x, orb.y, this, () => this.hit(1)));
  }

  move(dt) {
    if (this.charging) {
      this.ax -= 560 * dt;
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
