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
  if (t.skyTop) {
    // Vertical sky gradient (sunset / volcano glow) over the top 160 rows.
    gradient(160, [[0, t.skyTop], [159, t.sky]]).forEach((c, y) => pix.hline(0, y, W, c));
  }
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

  if (t.scenery === 'volcano') pix.blit(volcanoes(t, rnd), 0, 0);
  else pix.blit(skyline(t, rnd), 0, 0);

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

// City skyline: blocky buildings with window grids (tops ~y170-181).
function skyline(t, rnd) {
  const W = 144;
  const city = new Pix(W, 256);
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
  return city;
}

// Volcano cones with glowing craters and lava streams (tops ~y128-160).
function volcanoes(t, rnd) {
  const W = 144;
  const out = new Pix(W, 256);
  const cones = [
    { cx: 22, top: 156, slope: 1.6, crater: 4 },
    { cx: 96, top: 128, slope: 1.25, crater: 7 },
    { cx: 150, top: 150, slope: 1.5, crater: 4 },
  ];
  for (const c of cones) {
    const cone = new Pix(W, 256);
    for (let y = c.top; y < 200; y++) {
      const half = c.crater + (y - c.top) * c.slope;
      cone.hline(Math.round(c.cx - half), y, Math.round(half * 2), t.city);
    }
    cone.outline(t.cityEdge);
    // Glowing crater and two lava streams wandering down the slopes.
    cone.hline(Math.round(c.cx - c.crater + 1), c.top, c.crater * 2 - 2, '#ffd23a');
    cone.hline(Math.round(c.cx - c.crater), c.top + 1, c.crater * 2, t.window);
    for (const dir of [-1, 1]) {
      let lx = c.cx + dir * (c.crater - 2);
      for (let y = c.top + 2; y < 200; y++) {
        if (rnd() < 0.45) lx += dir * (rnd() < 0.75 ? 1 : 0) - (rnd() < 0.15 ? dir : 0);
        cone.set(lx, y, t.window);
      }
    }
    out.blit(cone, 0, 0);
  }
  return out;
}

// 168x56 native -> 336x112. Scrolls left; pattern period divides the 48px wrap.
export function makeGround(pal = PAL) {
  const W = 168;
  const H = 56;
  const pix = new Pix(W, H).rect(0, 0, W, H, pal.dirt);
  pix.hline(0, 0, W, pal.outline);
  pix.hline(0, 1, W, pal.groundTop);
  for (let y = 2; y < 9; y++) {
    for (let x = 0; x < W; x++) {
      pix.set(x, y, (x + y) % 12 < 6 ? pal.groundStripeDark : pal.groundStripeLight);
    }
  }
  pix.hline(0, 9, W, pal.groundShadow);
  pix.hline(0, 10, W, pal.groundEdge);
  if (pal.cracks) {
    // Glowing cracks in the rock (period 24 so the scroll wrap stays seamless).
    for (let x = 0; x < W; x += 24) {
      pix.map(['#...', '.#..', '.##.', '...#', '...#', '..#.'], { '#': pal.cracks }, x + 6, 16);
      pix.map(['.#.', '#..', '#..', '.##'], { '#': pal.cracks }, x + 17, 34);
    }
  }
  return pix.toCanvas();
}

// Basalt ground with lava stripes (Phoenix Lord's arena).
export const VOLCANO_GROUND = {
  outline: '#1a0c0c',
  groundTop: '#ffb84a',
  groundStripeDark: '#c83a10',
  groundStripeLight: '#ff6a1a',
  groundShadow: '#7a1a08',
  groundEdge: '#2e1a18',
  dirt: '#3a2622',
  cracks: '#a8401a',
};

// Lava pillars: the pipe shape in basalt with a molten cap (Phoenix walls).
export const LAVA_PILLAR = {
  outline: '#1a0c0c',
  pipeEdge: '#4a2420',
  pipeHi: '#7a463a',
  pipeDark: '#2e1614',
  pipeCapEdge: '#ffe07a',
  pipeCapHi: '#ffb030',
  pipeCapDark: '#e0400e',
  crack: '#ff6a1a',
};

// 26x160 native -> 52x320, cap at the top (the "lower" pipe orientation).
// Shading is a horizontal gradient: light highlight left of centre, dark right edge.
export function makePipe(pal = PAL) {
  const W = 26;
  const H = 160;
  const CAP = 12;
  const body = gradient(22, [[0, pal.pipeEdge], [7, pal.pipeHi], [18, pal.pipeDark], [21, pal.pipeDark]]);
  const capHi = pal.pipeCapHi ?? pal.pipeHi;
  const capDark = pal.pipeCapDark ?? pal.pipeDark;
  const cap = gradient(24, [[0, pal.pipeCapEdge], [3, capHi], [20, capDark], [23, capDark]]);
  const pix = new Pix(W, H);
  for (let y = CAP; y < H; y++) {
    pix.set(1, y, pal.outline);
    pix.set(24, y, pal.outline);
    body.forEach((c, i) => pix.set(2 + i, y, c));
  }
  pix.hline(2, CAP, 22, pal.pipeDark); // shadow under the cap
  pix.rect(0, 0, W, CAP, pal.outline);
  for (let y = 1; y < CAP - 2; y++) cap.forEach((c, i) => pix.set(1 + i, y, c));
  pix.hline(1, CAP - 2, 24, capDark);
  if (pal.crack) {
    // Lava veins running down the column.
    let x = 8;
    for (let y = CAP + 1; y < H; y++) {
      if (y % 5 === 0) x = 5 + ((x * 7 + y) % 14);
      pix.set(x, y, pal.crack);
      if (y % 9 < 3) pix.set(x + 1, y, pal.crack);
    }
  }
  return pix.toCanvas();
}
