import { CONFIG } from '../config.js';
import { lerp } from '../core/math.js';

export class Ground {
  constructor(sprites) {
    this.sprites = sprites;
    this.dist = 0;
    this.pdist = 0;
    this.moving = true;
  }

  update(dt) {
    this.pdist = this.dist;
    if (this.moving) this.dist += CONFIG.pipes.speed * dt;
  }

  // `sprite` picks the strip ('base', or a theme's own, e.g. 'base-volcano').
  render(r, alpha, sprite = 'base', opacity = 1) {
    const img = this.sprites.get(sprite);
    const wrap = Math.max(1, img.width - CONFIG.width);
    const off = lerp(this.pdist, this.dist, alpha) % wrap;
    r.draw(img, -off, CONFIG.groundY, opacity);
    r.fillBottom(this.sprites.edgeColor(sprite, 'bottom'), opacity);
  }
}
