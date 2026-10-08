// Pixel-perfect collision using alpha masks built from sprites.

export function maskFromImage(img) {
  const w = img.width;
  const h = img.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const px = ctx.getImageData(0, 0, w, h).data;
  const data = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) data[i] = px[i * 4 + 3] > 16 ? 1 : 0;
  return { w, h, data };
}

export function flipMaskY(m) {
  const data = new Uint8Array(m.w * m.h);
  for (let y = 0; y < m.h; y++) {
    data.set(m.data.subarray((m.h - 1 - y) * m.w, (m.h - y) * m.w), y * m.w);
  }
  return { w: m.w, h: m.h, data };
}

export function masksOverlap(a, ax, ay, b, bx, by) {
  ax = Math.round(ax);
  ay = Math.round(ay);
  bx = Math.round(bx);
  by = Math.round(by);
  const x0 = Math.max(ax, bx);
  const y0 = Math.max(ay, by);
  const x1 = Math.min(ax + a.w, bx + b.w);
  const y1 = Math.min(ay + a.h, by + b.h);
  if (x0 >= x1 || y0 >= y1) return false;
  for (let y = y0; y < y1; y++) {
    const ar = (y - ay) * a.w - ax;
    const br = (y - by) * b.w - bx;
    for (let x = x0; x < x1; x++) {
      if (a.data[ar + x] && b.data[br + x]) return true;
    }
  }
  return false;
}

// Does any solid pixel of mask (placed at mx,my) fall inside the circle?
export function maskHitsCircle(m, mx, my, cx, cy, r) {
  mx = Math.round(mx);
  my = Math.round(my);
  const x0 = Math.max(mx, Math.floor(cx - r));
  const y0 = Math.max(my, Math.floor(cy - r));
  const x1 = Math.min(mx + m.w, Math.ceil(cx + r));
  const y1 = Math.min(my + m.h, Math.ceil(cy + r));
  const r2 = r * r;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2 && m.data[(y - my) * m.w + (x - mx)]) return true;
    }
  }
  return false;
}
