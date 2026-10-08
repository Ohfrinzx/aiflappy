// Base class for bosses. Behaviour is written as generator "scripts":
// `yield 0.5` waits half a second, `yield 0` waits one tick,
// `yield () => cond` waits until cond is true.
import { CONFIG } from '../config.js';
import { lerp } from '../core/math.js';
import { masksOverlap } from '../core/collision.js';

export class Boss {
  constructor(scene, { hp = 6, x = CONFIG.width + 60, y = 160 } = {}) {
    this.scene = scene;
    this.sprites = scene.game.sprites;
    this.maxHp = hp;
    this.hp = hp;
    this.ax = x; // anchor position (eased toward tx, ty)
    this.ay = y;
    this.tx = x;
    this.ty = y;
    this.ease = 3;
    this.x = this.px = x;
    this.y = this.py = y;
    this.rot = this.prot = 0;
    this.t = 0;
    this.hurtT = 0;
    this.defeated = false;
    this.finished = false;
    this.script = this.behavior();
    this.waitT = 0;
    this.waitFn = null;
  }

  // Override: main behaviour generator.
  *behavior() {}

  // Override: defeat sequence generator; must end by setting this.finished.
  *defeat() {
    this.finished = true;
  }

  // Override: name of the sprite currently shown (used for drawing + collision).
  get frameName() {
    return '';
  }

  get img() {
    return this.sprites.get(this.frameName);
  }

  get cx() {
    return this.x + this.img.width / 2;
  }

  get cy() {
    return this.y + this.img.height / 2;
  }

  get phase() {
    return this.hp <= Math.ceil(this.maxHp / 2) ? 2 : 1;
  }

  hit(dmg = 1) {
    if (this.defeated) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.hurtT = 0.18;
    this.onHit?.();
    if (this.hp === 0) {
      this.defeated = true;
      this.waitT = 0;
      this.waitFn = null;
      this.script = this.defeat();
    }
  }

  stepScript(dt) {
    if (!this.script) return;
    if (this.waitT > 0) {
      this.waitT -= dt;
      if (this.waitT > 0) return;
    }
    if (this.waitFn) {
      if (!this.waitFn()) return;
      this.waitFn = null;
    }
    for (let guard = 0; guard < 100; guard++) {
      const r = this.script.next();
      if (r.done) {
        this.script = null;
        return;
      }
      const v = r.value;
      if (typeof v === 'number') {
        // Any numeric yield (even 0) ends this tick.
        this.waitT += v;
        return;
      } else if (typeof v === 'function') {
        if (!v()) {
          this.waitFn = v;
          return;
        }
      } else return;
    }
  }

  // Per-tick movement; subclasses can override for special motion.
  move(dt) {
    const k = Math.min(1, dt * this.ease);
    this.ax = lerp(this.ax, this.tx, k);
    this.ay = lerp(this.ay, this.ty, k);
    this.x = this.ax;
    this.y = this.ay + Math.sin(this.t * 2.2) * 6;
  }

  update(dt) {
    this.px = this.x;
    this.py = this.y;
    this.prot = this.rot;
    this.t += dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    this.stepScript(dt);
    this.move(dt);
  }

  // Called while the world is frozen (player died): keep idling only.
  animate(dt) {
    this.px = this.x;
    this.py = this.y;
    this.prot = this.rot;
    this.t += dt;
  }

  collides(bird) {
    if (this.defeated) return false;
    return masksOverlap(bird.mask, bird.x, bird.y, this.sprites.mask(this.frameName), this.x, this.y);
  }

  render(r, alpha) {
    const img = this.img;
    const x = lerp(this.px, this.x, alpha);
    const y = lerp(this.py, this.y, alpha);
    r.drawRotated(img, x + img.width / 2, y + img.height / 2, lerp(this.prot, this.rot, alpha));
  }
}
