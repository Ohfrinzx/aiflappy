// Canvas wrapper: fits the fixed 288x512 game space to the window (letterboxed),
// keeps pixel art crisp, and provides screen shake / flash / fade overlays.
import { DEG } from './math.js';

export class Renderer {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.w = width;
    this.h = height;
    this.shakeTime = 0;
    this.shakeAmount = 0;
    this.flashAlpha = 0;
    this.flashDecay = 0;
    this.fadeAlpha = 0;
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
    this.resize();
  }

  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this.scale = Math.min(vw / this.w, vh / this.h);
    const cssW = Math.floor(this.w * this.scale);
    const cssH = Math.floor(this.h * this.scale);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.pixelScale = this.canvas.width / this.w;
  }

  // Converts a client (CSS pixel) position into game coordinates.
  toGame(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * this.w,
      y: ((clientY - r.top) / r.height) * this.h,
    };
  }

  shake(time, amount) {
    this.shakeTime = Math.max(this.shakeTime, time);
    this.shakeAmount = amount;
  }

  flash(time, alpha = 1) {
    this.flashAlpha = alpha;
    this.flashDecay = alpha / time;
  }

  update(dt) {
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - this.flashDecay * dt);
  }

  begin() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    let ox = 0;
    let oy = 0;
    if (this.shakeTime > 0) {
      ox = Math.round((Math.random() * 2 - 1) * this.shakeAmount);
      oy = Math.round((Math.random() * 2 - 1) * this.shakeAmount);
    }
    const s = this.pixelScale;
    ctx.setTransform(s, 0, 0, s, ox * s, oy * s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.w, this.h);
    ctx.clip();
  }

  end() {
    const ctx = this.ctx;
    ctx.restore();
    ctx.globalAlpha = 1;
    if (this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = '#fff';
      ctx.fillRect(-8, -8, this.w + 16, this.h + 16);
    }
    if (this.fadeAlpha > 0) {
      ctx.globalAlpha = this.fadeAlpha;
      ctx.fillStyle = '#000';
      ctx.fillRect(-8, -8, this.w + 16, this.h + 16);
    }
    ctx.globalAlpha = 1;
  }

  draw(img, x, y, alpha = 1) {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y);
    ctx.globalAlpha = 1;
  }

  drawCentered(img, cx, y, alpha = 1) {
    this.draw(img, Math.round(cx - img.width / 2), y, alpha);
  }

  drawFlippedY(img, x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y + img.height);
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  // Draws img rotated by `deg` (clockwise, canvas convention) around its center.
  drawRotated(img, cx, cy, deg, alpha = 1, flipX = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    if (deg) ctx.rotate(deg * DEG);
    if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  rect(x, y, w, h, color, alpha = 1) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }
}
