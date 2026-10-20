// Bird sprites: 17x12 native pixels (34x24 in game), three wing frames.
// Skins vary by palette, optional wing style, accessories and patterns; the
// collision hitbox is always the plain bird shape (see makeHitboxFrames).
import { Pix } from './pixel.js';

const BODY = [
  '......kkkkkk.....',
  '....kkYYYYkwwk...',
  '...kYYyyykwwwwk..',
  '..kyyyyyykwwwkwk.',
  '.kyyyyyyykwwwkwk.',
  '.kyyyyyyyykwwwwk.',
  '.kyyyyyyyyykkkkkk',
  '.kyyyyyyyykrrrrrk',
  '..kooooookkkkkkk.',
  '...kooooookRRRRk.',
  '....kkooooookkk..',
  '......kkkkkk.....',
];

// Wing overlays [rows, yOffset] for up / mid / down flap.
const WINGS = {
  bird: [
    [['.kk....', 'kwwk...', 'kwwwk..', 'kwwwwk.', 'kYwwwYk', '.kkkkk.'], 1],
    [['.kkkk..', 'kwwwwk.', 'kwwwwwk', 'kYwwwYk', '.kYYYk.', '..kkk..'], 4],
    [['.kkkkk.', 'kYwwwwk', '.kwwwwk', '..kwwk.', '...kk..'], 6],
  ],
  // Pointed, scalloped membrane wings.
  bat: [
    [['k......', 'kk.....', 'kwk....', 'kwwk...', 'kwwwk..', '.kkkkk.'], 0],
    [['kkkkkk.', 'kwwwwwk', '.kwkwk.', '..k.k..'], 4],
    [['.kkkkk.', 'kwwwwk.', 'kwwk...', 'kwk....', 'kk.....'], 6],
  ],
};

// Accessories: [rows, x, y, palette]. Drawn over the body.
const ACCESSORIES = {
  shades: [['kkkkkkkk', '.kLSSkSk', '..kSSkk.'], 8, 2, { k: '#1a1a1a', S: '#2c2c3c', L: '#8a8aac' }],
  headband: [['....hhhhhh', 'kh.hhhhhhh', 'hhk.......'], 0, 1, { h: '#e83a2a', k: '#9a1a14' }],
  crown: [['g.gg.g', 'ggrggg'], 5, 0, { g: '#f8d030', r: '#e83a2a' }],
  visor: [['kkkkkk', 'kcccck', 'kkkkkk'], 10, 2, { k: '#3a3e48', c: '#5ef0ff' }],
  ears: [['k...k', 'pk.kp'], 6, 0, { k: '#2a1a3a', p: '#d080a0' }],
  eyepatch: [['kkkkkk.....', '......kkkkk', '......kkkkk', '.......kkk.'], 4, 1, { k: '#141414' }],
  tufts: [['k....k', 'tk..kt'], 5, 0, { k: '#3a2410', t: '#a87848' }],
  halo: [['hhhhhh'], 6, 0, { h: '#ffe24a' }],
  horns: [['h....h', 'hk..kh'], 5, 0, { h: '#f4ecd0', k: '#0e2a14' }],
};

const PATTERNS = {
  rainbow: ['#ff4b4b', '#ff8c1a', '#ffd21a', '#5ad84a', '#3ab0ff', '#7a5cff'],
  flame: ['#fff07a', '#ffd23a', '#ffa21a', '#ff7a1a', '#ff4b1a', '#e0281a'],
  lava: ['#3a2622', '#ff8a1a', '#c83a10', '#3a2622', '#ff6a1a', '#7a1a08'],
  blueflame: ['#ffffff', '#c8f4ff', '#7ad8ff', '#4aa8ff', '#2a6aff', '#1a3ab8'],
};

export function birdPix(p, frame, style = {}) {
  const pal = { k: p.outline, Y: p.highlight, y: p.body, o: p.belly, w: p.white, r: p.lipTop, R: p.lipBottom };
  const pix = new Pix(17, 12).map(BODY, pal);
  const bands = PATTERNS[style.pattern];
  if (bands) {
    // Horizontal colour bands over the body colours (keeps outline / eye / beak).
    const body = new Set([p.body, p.highlight, p.belly]);
    for (let y = 0; y < pix.h; y++) {
      for (let x = 0; x < pix.w; x++) {
        if (body.has(pix.get(x, y))) pix.set(x, y, bands[Math.floor((y * bands.length) / pix.h)]);
      }
    }
  }
  const [rows, oy] = WINGS[style.wings ?? 'bird'][frame];
  pix.map(rows, { ...pal, w: p.wing ?? p.white, Y: p.wingShade ?? p.highlight }, 0, oy);
  for (const id of style.accessories ?? []) {
    const [map, ax, ay, apal] = ACCESSORIES[id];
    pix.map(map, apal, ax, ay);
  }
  return pix;
}

export function makeBirdFrames(palette, style) {
  return [0, 1, 2].map((f) => birdPix(palette, f, style).toCanvas());
}

// Dark silhouette (mid-flap) shown for locked birds in the picker.
export function makeBirdShadow(palette, style) {
  return birdPix(palette, 1, style).tint('#2a1e28').toCanvas();
}

// Plain-shape frames used only for collision, so every skin plays the same.
export function makeHitboxFrames() {
  const p = { outline: '#000', highlight: '#000', body: '#000', belly: '#000', white: '#000', lipTop: '#000', lipBottom: '#000' };
  return [0, 1, 2].map((f) => birdPix(p, f).toCanvas());
}
