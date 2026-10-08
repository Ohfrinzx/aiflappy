// Boss-fight objects. Each implements update(dt, scene) -> keep?, render(r, alpha),
// and optionally hits(bird) (lethal) or touches(bird) (collectible).
import { CONFIG } from '../config.js';
import { lerp } from '../core/math.js';
import { maskHitsCircle } from '../core/collision.js';

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

// Golden orb drifting left; touching it fires it back at the boss.
export class Orb {
  constructor(sprites, x, y, targetY, speed) {
    this.sprites = sprites;
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
    r.drawRotated(this.sprites.get(`orb-${f}`), lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), 0);
  }
}

// A collected orb homing in on the boss.
export class Bolt {
  constructor(sprites, x, y, target, onHit) {
    this.sprites = sprites;
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
    this.trail.forEach(([x, y], i) => r.rect(Math.round(x) - 2, Math.round(y) - 2, 4, 4, '#fde680', (i + 1) / 10));
    const f = Math.floor(this.t * 16) % 4;
    r.drawRotated(this.sprites.get(`orb-${f}`), lerp(this.px, this.x, alpha), lerp(this.py, this.y, alpha), 0);
  }
}
