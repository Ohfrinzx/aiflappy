// Canvas wrapper. The game is designed in a fixed 288x512 space; on screens
// taller than 9:16 (phones) the view grows vertically instead of letterboxing:
// extra sky above (kept clear of the notch / Dynamic Island via the safe-area
// inset) and extra ground below. Also handles shake / flash / fade overlays.
import { DEG } from './math.js';

const MAX_ASPECT = 2.4; // taller than this gets letterboxed
const TOP_SHARE = 0.45; // share of the extra height that goes to the sky

function safeAreaTop() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;height:0;visibility:hidden;padding-top:env(safe-area-inset-top)';
  document.body.appendChild(probe);
  const v = parseFloat(window.getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return v;
}

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
    this.smooth = false; // set true when sprites carry hi-res copies
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', () => window.setTimeout(this.resize, 100));
    window.visualViewport?.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    // Ignore resize events that don't change anything (reallocating a
    // full-screen canvas is expensive).
    const key = `${vw}x${vh}@${dpr}`;
    if (key === this.sizeKey) return;
    this.sizeKey = key;
    const tallH = (this.w * vh) / vw;
    if (tallH >= this.h && tallH <= this.w * MAX_ASPECT) {
      // Phone portrait: fill the screen exactly.
      this.viewH = tallH;
      this.scale = vw / this.w;
    } else {
      // Wider than 9:16 (desktop) or extremely tall: fit and letterbox.
      this.viewH = Math.min(Math.max(tallH, this.h), this.w * MAX_ASPECT);
      this.scale = Math.min(vw / this.w, vh / this.viewH);
    }

    // Split the extra height about evenly (keeps the playfield centred), but
    // always enough on top to clear the notch / Dynamic Island safe area.
    const extra = this.viewH - this.h;
    const top = Math.min(extra, Math.max(extra * TOP_SHARE, safeAreaTop() / this.scale));
    this.offY = top;
    this.viewTop = -top;
    this.viewBottom = this.h + (extra - top);

    const cssW = Math.round(this.w * this.scale);
    const cssH = Math.round(this.viewH * this.scale);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.pixelScale = this.canvas.width / this.w;
    this.bounds = this.canvas.getBoundingClientRect(); // cached: no layout reads per tap
  }

  // Converts a client (CSS pixel) position into game coordinates.
  toGame(clientX, clientY) {
    const r = this.bounds;
    return {
      x: ((clientX - r.left) / r.width) * this.w,
      y: ((clientY - r.top) / r.height) * this.viewH + this.viewTop,
    };
  }

  // Snap to the device pixel grid (sub-game-pixel precision, no shimmer).
  snap(v) {
    return Math.round(v * this.pixelScale) / this.pixelScale;
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

  // Kept deliberately cheap for mobile GPUs: no clip path, and the full-canvas
  // clear only runs while shaking (scenes paint every pixel otherwise).
  begin() {
    const ctx = this.ctx;
    ctx.globalAlpha = 1;
    let ox = 0;
    let oy = 0;
    if (this.shakeTime > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ox = Math.round((Math.random() * 2 - 1) * this.shakeAmount);
      oy = Math.round((Math.random() * 2 - 1) * this.shakeAmount);
    }
    const s = this.pixelScale;
    ctx.setTransform(s, 0, 0, s, ox * s, (oy + this.offY) * s);
    // Sprites come pre-upscaled ~4x, so plain bilinear is visually identical to
    // 'high' here and much cheaper on Safari.
    ctx.imageSmoothingEnabled = this.smooth;
    ctx.imageSmoothingQuality = 'low';
  }

  end() {
    const ctx = this.ctx;
    const y = this.viewTop - 8;
    const h = this.viewH + 16;
    if (this.flashAlpha > 0) this.rect(-8, y, this.w + 16, h, '#fff', this.flashAlpha);
    if (this.fadeAlpha > 0) this.rect(-8, y, this.w + 16, h, '#000', this.fadeAlpha);
    ctx.globalAlpha = 1;
  }

  // Sprites may carry a pre-upscaled `hi` copy; draw it at the sprite's game size.
  blit(img, x, y) {
    this.ctx.drawImage(img.hi ?? img, x, y, img.width, img.height);
  }

  draw(img, x, y, alpha = 1) {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    this.blit(img, this.snap(x), this.snap(y));
    ctx.globalAlpha = 1;
  }

  drawCentered(img, cx, y, alpha = 1) {
    this.draw(img, Math.round(cx - img.width / 2), y, alpha);
  }

  drawFlippedY(img, x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.snap(x), this.snap(y) + img.height);
    ctx.scale(1, -1);
    this.blit(img, 0, 0);
    ctx.restore();
  }

  // Draws img rotated by `deg` (clockwise, canvas convention) around its center.
  drawRotated(img, cx, cy, deg, alpha = 1, flipX = false) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(this.snap(cx), this.snap(cy));
    if (deg) ctx.rotate(deg * DEG);
    if (flipX) ctx.scale(-1, 1);
    this.blit(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }

  rect(x, y, w, h, color, alpha = 1) {
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  // Fills the extra sky above the 512-tall design area (tall screens only).
  // Overlaps the design area by 1px to hide the smoothed image edge.
  fillTop(color) {
    if (this.viewTop < 0) this.rect(0, this.viewTop, this.w, 1 - this.viewTop, color);
  }

  // Fills the extra area below the design area (tall screens only).
  fillBottom(color) {
    if (this.viewBottom > this.h) this.rect(0, this.h - 1, this.w, this.viewBottom - this.h + 1, color);
  }
}
