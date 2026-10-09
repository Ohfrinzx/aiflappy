import { CONFIG } from '../config.js';
import { lerp, randInt } from '../core/math.js';
import { masksOverlap } from '../core/collision.js';

// Spawns, scrolls and collides pipe pairs. Pipes can carry their own speed/gap
// so other systems (bosses) can reuse them as hazards.
export class PipeField {
  constructor(sprites, events, sprite = 'pipe-green') {
    this.cfg = CONFIG.pipes;
    this.sprites = sprites;
    this.events = events;
    this.sprite = sprite;
    this.list = [];
    this.spawning = true;
    this.spawned = 0; // regular (scoring) pipes spawned so far
    this.spawnLimit = Infinity; // stop regular spawning after this many
    this.moving = true;
  }

  get img() {
    return this.sprites.get(this.sprite);
  }

  randomGapY(gap = this.cfg.gap) {
    const g = CONFIG.groundY;
    const lo = Math.floor(g * this.cfg.gapMinFrac);
    return lo + randInt(0, Math.floor(g * this.cfg.gapRangeFrac - gap));
  }

  // sway: optional { amp, speed } makes the gap slide up and down (boss walls).
  add({ x, gapY, gap = this.cfg.gap, speed = this.cfg.speed, scores = true, sway = null }) {
    const p = { x, px: x, gapY, pgapY: gapY, baseGapY: gapY, gap, speed, scores, scored: false, sway, t: 0 };
    this.list.push(p);
    return p;
  }

  spawnRegular(x) {
    this.add({ x, gapY: this.randomGapY() });
    this.spawned++;
    this.events.emit('pipeSpawned', this.spawned);
  }

  update(dt) {
    if (!this.moving) return;
    const w = this.img.width;
    let last = null; // newest regular pipe (no per-tick allocations)
    let n = 0;
    for (const p of this.list) {
      p.px = p.x;
      p.x -= p.speed * dt;
      p.pgapY = p.gapY;
      if (p.sway) {
        p.t += dt;
        p.gapY = p.baseGapY + Math.sin(p.t * p.sway.speed) * p.sway.amp;
      }
      if (p.x > -w) {
        this.list[n++] = p;
        if (p.scores) last = p;
      }
    }
    this.list.length = n;

    if (this.spawning && this.spawned < this.spawnLimit) {
      if (!last) {
        this.spawnRegular(this.spawned === 0 ? this.cfg.firstX : CONFIG.width + 10);
      } else if (last.x + this.cfg.spacing <= CONFIG.width + 10) {
        this.spawnRegular(last.x + this.cfg.spacing);
      }
    }
  }

  // Returns the number of pipes the bird just passed (centre crosses centre).
  collectPassed(bird) {
    let n = 0;
    const half = this.img.width / 2;
    for (const p of this.list) {
      if (p.scores && !p.scored && p.x + half <= bird.cx) {
        p.scored = true;
        n++;
      }
    }
    return n;
  }

  collides(bird) {
    const h = this.img.height;
    const m = this.sprites.mask(this.sprite);
    const mf = this.sprites.mask(this.sprite, true);
    const bm = bird.mask;
    for (const p of this.list) {
      if (p.x > bird.x + bird.w || p.x + m.w < bird.x) continue;
      if (masksOverlap(bm, bird.x, bird.y, mf, p.x, p.gapY - h)) return true;
      if (masksOverlap(bm, bird.x, bird.y, m, p.x, p.gapY + p.gap)) return true;
    }
    return false;
  }

  render(r, alpha) {
    const img = this.img;
    for (const p of this.list) {
      const x = lerp(p.px, p.x, alpha);
      const gy = lerp(p.pgapY, p.gapY, alpha);
      r.drawFlippedY(img, x, gy - img.height);
      r.draw(img, x, gy + p.gap);
    }
  }
}
