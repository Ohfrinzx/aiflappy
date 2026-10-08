// Tiny pixel-art toolkit. Art is authored at "native" resolution (half of game
// resolution, like the original's 2x art) and scaled up with nearest-neighbour.
export const ART_SCALE = 2;

const colorCache = new Map();
function parseColor(c) {
  let v = colorCache.get(c);
  if (v) return v;
  let hex = c.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((h) => h + h).join('');
  const n = parseInt(hex.slice(0, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255;
  v = [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  colorCache.set(c, v);
  return v;
}

// Linear gradient sampled at integer steps: stops = [[index, '#hex'], ...].
export function gradient(n, stops) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let k = 0;
    while (k < stops.length - 2 && i > stops[k + 1][0]) k++;
    const [i0, c0] = stops[k];
    const [i1, c1] = stops[k + 1];
    const t = i1 === i0 ? 0 : Math.min(1, Math.max(0, (i - i0) / (i1 - i0)));
    const a = parseColor(c0);
    const b = parseColor(c1);
    const hex = (v) => Math.round(v).toString(16).padStart(2, '0');
    out.push('#' + [0, 1, 2].map((j) => hex(a[j] + (b[j] - a[j]) * t)).join(''));
  }
  return out;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// A grid of color strings (or null for transparent).
export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x, y, c) {
    x |= 0;
    y |= 0;
    if (this.inside(x, y)) this.px[y * this.w + x] = c;
  }

  get(x, y) {
    return this.inside(x, y) ? this.px[y * this.w + x] : null;
  }

  rect(x, y, w, h, c) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
    return this;
  }

  hline(x, y, w, c) {
    return this.rect(x, y, w, 1, c);
  }

  vline(x, y, h, c) {
    return this.rect(x, y, 1, h, c);
  }

  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  // Draws a string map: each char maps through `palette`; '.' or ' ' = skip.
  map(rows, palette, ox = 0, oy = 0) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = palette[ch];
        if (c !== undefined) this.set(ox + x, oy + y, c);
      }
    });
    return this;
  }

  // Paints `c` on transparent pixels that touch a solid pixel.
  outline(c, diagonal = false) {
    const solid = this.px.map((p) => p !== null);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (solid[y * this.w + x]) continue;
        let hit = false;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          for (let dx = -1; dx <= 1 && !hit; dx++) {
            if (!dx && !dy) continue;
            if (!diagonal && dx && dy) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (this.inside(nx, ny) && solid[ny * this.w + nx]) hit = true;
          }
        }
        if (hit) this.px[y * this.w + x] = c;
      }
    }
    return this;
  }

  // Copies another Pix onto this one (non-null pixels only).
  blit(src, ox, oy) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.px[y * src.w + x];
        if (c !== null) this.set(ox + x, oy + y, c);
      }
    }
    return this;
  }

  // Replace every non-null pixel's color (used for silhouettes / hit flashes).
  tint(c) {
    const out = new Pix(this.w, this.h);
    out.px = this.px.map((p) => (p === null ? null : c));
    return out;
  }

  // Returns a copy with a transparent border of `n` pixels (room for outlines).
  pad(n) {
    const out = new Pix(this.w + n * 2, this.h + n * 2);
    out.blit(this, n, n);
    return out;
  }

  toCanvas(scale = ART_SCALE) {
    const c = makeCanvas(this.w * scale, this.h * scale);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(this.w * scale, this.h * scale);
    const d = img.data;
    const W = this.w * scale;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = this.px[y * this.w + x];
        if (col === null) continue;
        const [r, g, b, a] = parseColor(col);
        for (let sy = 0; sy < scale; sy++) {
          let i = ((y * scale + sy) * W + x * scale) * 4;
          for (let sx = 0; sx < scale; sx++, i += 4) {
            d[i] = r;
            d[i + 1] = g;
            d[i + 2] = b;
            d[i + 3] = a;
          }
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
}
