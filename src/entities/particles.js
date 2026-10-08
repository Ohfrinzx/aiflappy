import { CONFIG } from '../config.js';
import { rand } from '../core/math.js';

// Square pixel particles (puffs, feathers, debris).
export class Particles {
  constructor() {
    this.list = [];
  }

  burst(x, y, { count = 10, colors = ['#fff'], speed = 120, life = 0.6, size = 2, gravity = 300 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.3, speed);
      this.list.push({
        x, y, px: x, py: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3,
        life: rand(life * 0.6, life), max: life,
        color: colors[i % colors.length], size, gravity,
      });
    }
  }

  update(dt) {
    let n = 0;
    for (const p of this.list) {
      p.px = p.x;
      p.py = p.y;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life > 0 && p.y < CONFIG.height + 120) this.list[n++] = p;
    }
    this.list.length = n;
  }

  render(r) {
    for (const p of this.list) {
      r.rect(Math.round(p.x), Math.round(p.y), p.size, p.size, p.color, Math.min(1, (p.life / p.max) * 2));
    }
  }
}
