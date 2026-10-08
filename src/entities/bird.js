import { CONFIG } from '../config.js';
import { lerp } from '../core/math.js';
import { FLAP_NAMES } from '../art/sprites.js';

const WING_SEQ = [0, 1, 2, 1];

// Modes: idle (hovering bob), fly (player controlled), dead (falling), hover (auto-pilot).
export class Bird {
  constructor(sprites, skin, x = CONFIG.bird.x, y = CONFIG.bird.startY) {
    this.cfg = CONFIG.bird;
    this.sprites = sprites;
    this.frames = FLAP_NAMES.map((n) => `${skin.file}-${n}`);
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.vy = 0;
    this.rot = 0;
    this.mode = 'idle';
    this.t = 0;
    this.animT = 0;
    this.animIdx = 0;
    this.sinceFlap = 0;
    this.flapped = false;
    this.grounded = false;
    this.px = x;
    this.py = y;
    this.prot = 0;
  }

  get frameName() {
    return this.frames[WING_SEQ[this.animIdx]];
  }

  get img() {
    return this.sprites.get(this.frameName);
  }

  get mask() {
    return this.sprites.mask(this.frameName);
  }

  get w() {
    return this.img.width;
  }

  get h() {
    return this.img.height;
  }

  get cx() {
    return this.x + this.w / 2;
  }

  get cy() {
    return this.y + this.h / 2;
  }

  start() {
    this.mode = 'fly';
    this.flap();
  }

  // Returns true if the flap happened (bird can't flap above minY).
  flap() {
    if (this.mode !== 'fly' || this.y <= this.cfg.minY) return false;
    this.vy = this.cfg.flapVelocity;
    this.rot = this.cfg.tiltUp;
    this.sinceFlap = 0;
    this.flapped = true;
    return true;
  }

  kill(onGround) {
    this.mode = 'dead';
    this.vy = Math.max(this.vy, 0);
    this.grounded = onGround;
    if (onGround) this.y = CONFIG.groundY - this.h;
  }

  hover() {
    this.mode = 'hover';
    this.baseY = this.y;
    this.t = 0;
  }

  update(dt) {
    const c = this.cfg;
    this.px = this.x;
    this.py = this.y;
    this.prot = this.rot;

    if (this.mode !== 'dead' && this.rot < c.wingStopAngle) {
      this.animT += dt;
      while (this.animT >= c.wingFrameTime) {
        this.animT -= c.wingFrameTime;
        this.animIdx = (this.animIdx + 1) % WING_SEQ.length;
      }
    }

    switch (this.mode) {
      case 'idle':
        this.t += dt;
        this.y = this.baseY + Math.sin((this.t / c.bobPeriod) * Math.PI * 2) * c.bobAmplitude;
        break;
      case 'fly':
        if (!this.flapped) this.vy = Math.min(this.vy + c.gravity * dt, c.maxFallSpeed);
        this.flapped = false;
        this.y = Math.max(this.y + this.vy * dt, c.minY);
        this.sinceFlap += dt;
        if (this.sinceFlap > c.tiltHold) this.rot = Math.min(this.rot + c.tiltDownSpeed * dt, c.tiltMax);
        break;
      case 'dead':
        if (!this.grounded) {
          this.vy = Math.min(this.vy + c.crashGravity * dt, c.crashMaxFall);
          this.y += this.vy * dt;
          this.rot = Math.min(this.rot + c.crashSpin * dt, c.tiltMax);
          if (this.y + this.h >= CONFIG.groundY) {
            this.y = CONFIG.groundY - this.h;
            this.grounded = true;
          }
        }
        break;
      case 'hover': {
        this.t += dt;
        this.baseY = lerp(this.baseY, c.hoverY, Math.min(1, dt * 2));
        this.y = this.baseY + Math.sin((this.t / c.bobPeriod) * Math.PI * 2) * c.bobAmplitude;
        this.rot = lerp(this.rot, 0, Math.min(1, dt * 6));
        break;
      }
    }
  }

  hitsGround() {
    return this.y + this.h >= CONFIG.groundY - 1;
  }

  render(r, alpha) {
    const x = lerp(this.px, this.x, alpha);
    const y = lerp(this.py, this.y, alpha);
    const rot = lerp(this.prot, this.rot, alpha);
    const img = this.img;
    r.drawRotated(img, x + img.width / 2, y + img.height / 2, rot);
  }
}
