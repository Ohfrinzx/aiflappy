// Boss-fight objects. Each implements update(dt, scene) -> keep?, render(r, alpha),
// and optionally hits(bird) (lethal) or touches(bird) (collectible).
import { CONFIG } from '../config.js';
import { clamp, lerp } from '../core/math.js';
import { maskHitsCircle, maskHitsRect } from '../core/collision.js';

const offscreen = (x, y, m = 40) => x < -m || x > CONFIG.width + m || y < -m || y > CONFIG.height + m;

export class Feather {
  constructor(sprites, x, y, vx, vy) {
    this.sprites = sprites;
    this.x = this.px = x;
    this.y = this.py = y;
    this.vx = vx;
    this.vy = vy;
    this.angle = Math.atan2(vy, vx) * (180 / Math.PI) + 180; // sprite points left
    this.radius = 4;
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    return !offscreen(this.x, this.y);
  }

  hits(bird) {
    return maskHitsCircle(bird.mask, bird.x, bird.y, this.x, this.y, this.radius);
  }

  render(r, alpha) {
    r.drawRotated(this.sprites.get('feather'), lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), this.angle);
  }
}

// Collectible orb drifting left; touching it fires it back at the boss.
// `sprite` picks the look: 'orb' (gold) or 'frost'.
export class Orb {
  constructor(sprites, x, y, targetY, speed, sprite = 'orb') {
    this.sprites = sprites;
    this.sprite = sprite;
    this.x = this.px = x;
    this.y = this.py = y;
    this.baseY = y;
    this.targetY = targetY;
    this.speed = speed;
    this.t = 0;
    this.radius = 9;
    this.collected = false;
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.t += dt;
    this.x -= this.speed * dt;
    this.baseY = lerp(this.baseY, this.targetY, Math.min(1, dt * 2.5));
    this.y = this.baseY + Math.sin(this.t * 5) * 6;
    return !this.collected && this.x > -20;
  }

  touches(bird) {
    return maskHitsCircle(bird.mask, bird.x, bird.y, this.x, this.y, this.radius);
  }

  render(r, alpha) {
    const f = Math.floor(this.t * 8) % 4;
    r.drawRotated(this.sprites.get(`${this.sprite}-${f}`), lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), 0);
  }
}

// A collected orb homing in on the boss.
export class Bolt {
  constructor(sprites, x, y, target, onHit, sprite = 'orb', trail = '#fde680') {
    this.sprites = sprites;
    this.sprite = sprite;
    this.trailColor = trail;
    this.x = this.px = x;
    this.y = this.py = y;
    this.target = target;
    this.onHit = onHit;
    this.speed = 420;
    this.t = 0;
    this.trail = [];
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.t += dt;
    const tx = this.target.cx;
    const ty = this.target.cy;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.trail.push([this.x, this.y]);
    if (this.trail.length > 6) this.trail.shift();
    if (d <= step || this.t > 2) {
      this.onHit();
      return false;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    return true;
  }

  render(r, alpha) {
    this.trail.forEach(([x, y], i) => r.rect(Math.round(x) - 2, Math.round(y) - 2, 4, 4, this.trailColor, (i + 1) / 10));
    const f = Math.floor(this.t * 16) % 4;
    r.drawRotated(this.sprites.get(`${this.sprite}-${f}`), lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), 0);
  }
}

// ---- Phoenix Lord --------------------------------------------------------

// Small fire projectile flying in a straight line.
export class Ember extends Feather {
  constructor(sprites, x, y, vx, vy) {
    super(sprites, x, y, vx, vy);
    this.t = Math.random();
  }

  update(dt) {
    this.t += dt;
    return super.update(dt);
  }

  render(r, alpha) {
    const img = this.sprites.get(`ember-${Math.floor(this.t * 12) % 2}`);
    r.drawRotated(img, lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), 0);
  }
}

// Big fireball flying to a point, where it bursts (onBurst spawns the embers).
export class Fireball {
  constructor(sprites, x, y, tx, ty, speed, onBurst) {
    this.sprites = sprites;
    this.x = this.px = x;
    this.y = this.py = y;
    const d = Math.max(1, Math.hypot(tx - x, ty - y));
    this.vx = ((tx - x) / d) * speed;
    this.vy = ((ty - y) / d) * speed;
    this.burstT = d / speed;
    this.onBurst = onBurst;
    this.angle = Math.atan2(this.vy, this.vx) * (180 / Math.PI) + 180; // sprite points left
    this.radius = 7;
    this.t = 0;
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.t += dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.t >= this.burstT) {
      this.onBurst(this.x, this.y);
      return false;
    }
    return !offscreen(this.x, this.y);
  }

  hits(bird) {
    return maskHitsCircle(bird.mask, bird.x, bird.y, this.x, this.y, this.radius);
  }

  render(r, alpha) {
    const img = this.sprites.get(`fireball-${Math.floor(this.t * 10) % 2}`);
    r.drawRotated(img, lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), this.angle);
  }
}

// Homing wisp: drifts left and steers toward the bird's height (slower than
// the bird can climb or fall), then stops steering once it gets close.
export class Wisp {
  constructor(sprites, x, y, speed, turn, bird) {
    this.sprites = sprites;
    this.x = this.px = x;
    this.y = this.py = y;
    this.vx = -speed;
    this.vy = 0;
    this.turn = turn;
    this.bird = bird;
    this.locked = false;
    this.radius = 5;
    this.t = 0;
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.t += dt;
    const b = this.bird;
    if (!this.locked) {
      const want = clamp((b.cy - this.y) * 3, -this.turn, this.turn);
      const step = this.turn * 3 * dt;
      this.vy += clamp(want - this.vy, -step, step);
      if (this.x < b.x + b.w + 70) this.locked = true;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    return !offscreen(this.x, this.y);
  }

  hits(bird) {
    return maskHitsCircle(bird.mask, bird.x, bird.y, this.x, this.y, this.radius);
  }

  render(r, alpha) {
    const img = this.sprites.get(`wisp-${Math.floor(this.t * 10) % 2}`);
    r.drawRotated(img, lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), 0);
  }
}

// Horizontal flame beam from x=0 to x1 at height y: a flashing warning lane
// for `warn` seconds, then it burns for `burn` seconds. Drawn above the ash
// fog (renderOverlay) so the warning is always visible.
export class FlameBeam {
  constructor(y, half, x1, warn, burn, onFire) {
    this.y = y;
    this.half = half;
    this.x1 = x1;
    this.warn = warn;
    this.burn = burn;
    this.onFire = onFire;
    this.t = 0;
  }

  get burning() {
    return this.t >= this.warn;
  }

  update(dt) {
    this.t += dt;
    if (this.burning && this.onFire) {
      this.onFire();
      this.onFire = null;
    }
    return this.t < this.warn + this.burn;
  }

  // Lethal band: a little thinner than the drawn flame.
  get rects() {
    return this.burning ? [[0, this.y - this.half + 3, this.x1, this.half * 2 - 6]] : [];
  }

  hits(bird) {
    if (!this.burning) return false;
    const [x, y, w, h] = this.rects[0];
    return maskHitsRect(bird.mask, bird.x, bird.y, x, y, w, h);
  }

  render() {}

  renderOverlay(r) {
    const y0 = Math.round(this.y - this.half);
    const h = this.half * 2;
    if (!this.burning) {
      const on = Math.floor(this.t * 10) % 2 === 0;
      r.rect(0, y0, this.x1, h, '#ff3020', on ? 0.28 : 0.14);
      r.rect(0, y0, this.x1, 1, '#ff6a40', 0.8);
      r.rect(0, y0 + h - 1, this.x1, 1, '#ff6a40', 0.8);
      return;
    }
    const k = Math.min(1, (this.t - this.warn) / 0.08); // quick flare-up
    const left = this.warn + this.burn - this.t;
    const a = Math.min(1, left / 0.15);
    const wob = Math.floor(this.t * 30) % 2;
    const band = (inset, color, alpha) => {
      const hh = Math.max(1, Math.round((h - inset * 2) * k));
      r.rect(0, Math.round(this.y - hh / 2) + (inset ? wob : 0), this.x1, hh, color, alpha * a);
    };
    band(0, '#e8401a', 0.9);
    band(5, '#ff8a1a', 0.95);
    band(11, '#ffd23a', 1);
    band(16, '#fff6c0', 1);
  }
}

