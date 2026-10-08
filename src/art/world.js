// Background, ground strip and pipe sprites.
import { Pix, gradient } from './pixel.js';
import { PAL } from './palette.js';

// Deterministic RNG so the skyline is identical every load.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// 144x256 native -> 288x512. Only the bottom strip has scenery; the ground covers y >= 200.
export function makeBackground(t) {
  const W = 144;
  const H = 256;
  const pix = new Pix(W, H).rect(0, 0, W, H, t.sky);
  const rnd = seeded(t.seed ?? 7);

  if (t.stars) {
    for (let i = 0; i < 14; i++) {
      const sx = Math.floor(rnd() * W);
      const sy = Math.floor(rnd() * 150);
      pix.set(sx, sy, t.stars);
      if (rnd() < 0.2) pix.map(['.#.', '###', '.#.'], { '#': t.stars }, sx - 1, sy - 1);
    }
  }

  // Clouds: wide, gentle puffs (tops ~y152-162), solid below.
  const clouds = new Pix(W, H);
  for (let x = -10; x < W + 20; x += 10 + Math.floor(rnd() * 8)) {
    const rx = 9 + rnd() * 8;
    clouds.ellipse(x, 163, rx, 4 + rnd() * 6, t.cloud);
  }
  clouds.rect(0, 163, W, 37, t.cloud);
  if (t.cloudEdge) clouds.outline(t.cloudEdge);
  pix.blit(clouds, 0, 0);

  // City skyline: blocky buildings with window grids (tops ~y170-181).
  const city = new Pix(W, H);
  let x = -2;
  while (x < W) {
    const bw = 6 + Math.floor(rnd() * 9);
    const top = 170 + Math.floor(rnd() * 12);
    city.rect(x, top, bw, 200 - top, t.city);
    city.hline(x, top, bw, t.cityEdge);
    city.vline(x, top, 200 - top, t.cityEdge);
    for (let wy = top + 2; wy < 197; wy += 2) {
      for (let wx = x + 2; wx < x + bw - 1; wx += 2) city.set(wx, wy, t.window);
    }
    x += bw;
  }
  pix.blit(city, 0, 0);

  // Bushes: rounded clumps (tops ~y184-187).
  const bush = new Pix(W, H);
  for (let bx = -6; bx < W + 12; bx += 6 + Math.floor(rnd() * 5)) {
    const r = 5 + rnd() * 3;
    bush.ellipse(bx, 190, r, r * 0.85, t.bush);
  }
  bush.rect(0, 189, W, 11, t.bush);
  // Darker crease along the top of each clump.
  const rim = new Pix(W, H);
  for (let yy = 1; yy < H; yy++) {
    for (let xx = 0; xx < W; xx++) {
      if (bush.get(xx, yy) && !bush.get(xx, yy - 1)) rim.set(xx, yy + 1, t.bushLight);
    }
  }
  bush.outline(t.bushEdge);
  pix.blit(bush, 0, 0).blit(rim, 0, 0);
  return pix.toCanvas();
}

// 168x56 native -> 336x112. Scrolls left; pattern period divides the 48px wrap.
export function makeGround() {
  const W = 168;
  const H = 56;
  const pix = new Pix(W, H).rect(0, 0, W, H, PAL.dirt);
  pix.hline(0, 0, W, PAL.outline);
  pix.hline(0, 1, W, PAL.groundTop);
  for (let y = 2; y < 9; y++) {
    for (let x = 0; x < W; x++) {
      pix.set(x, y, (x + y) % 12 < 6 ? PAL.groundStripeDark : PAL.groundStripeLight);
    }
  }
  pix.hline(0, 9, W, PAL.groundShadow);
  pix.hline(0, 10, W, PAL.groundEdge);
  return pix.toCanvas();
}

// 26x160 native -> 52x320, cap at the top (the "lower" pipe orientation).
// Shading is a horizontal gradient: light highlight left of centre, dark right edge.
export function makePipe(pal = PAL) {
  const W = 26;
  const H = 160;
  const CAP = 12;
  const body = gradient(22, [[0, pal.pipeEdge], [7, pal.pipeHi], [18, pal.pipeDark], [21, pal.pipeDark]]);
  const cap = gradient(24, [[0, pal.pipeCapEdge], [3, pal.pipeHi], [20, pal.pipeDark], [23, pal.pipeDark]]);
  const pix = new Pix(W, H);
  for (let y = CAP; y < H; y++) {
    pix.set(1, y, pal.outline);
    pix.set(24, y, pal.outline);
    body.forEach((c, i) => pix.set(2 + i, y, c));
  }
  pix.hline(2, CAP, 22, pal.pipeDark); // shadow under the cap
  pix.rect(0, 0, W, CAP, pal.outline);
  for (let y = 1; y < CAP - 2; y++) cap.forEach((c, i) => pix.set(1 + i, y, c));
  pix.hline(1, CAP - 2, 24, pal.pipeDark);
  return pix.toCanvas();
}
