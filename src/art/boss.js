// Boss + boss-fight sprites, built from shapes and auto-outlined.
import { Pix } from './pixel.js';
import { PAL } from './palette.js';

// King Crow: 48x40 native (96x80 in game), faces left. Two wing frames + a
// beak-open "attack" frame.
export function makeKingCrow(p) {
  const frame = (wing, beakOpen) => {
    const s = new Pix(48, 40);
    // tail
    s.ellipse(42, 23, 5, 3, p.body);
    s.ellipse(43, 27, 5, 2.5, p.shade);
    // back wing (behind body)
    if (wing === 0) s.ellipse(33, 11, 11, 5, p.shade);
    // body + belly
    s.ellipse(27, 24, 15, 12, p.body);
    s.ellipse(22, 28, 9, 7, p.belly);
    // head
    s.ellipse(15, 15, 9.5, 9, p.body);
    // feet
    s.rect(20, 35, 2, 3, p.beak);
    s.rect(28, 35, 2, 3, p.beak);
    s.hline(18, 38, 5, p.beak);
    s.hline(26, 38, 5, p.beak);
    // front wing
    if (wing === 0) {
      s.ellipse(31, 15, 10, 5, p.wing);
      s.ellipse(33, 13, 7, 2.5, p.shade);
    } else {
      s.ellipse(32, 30, 10, 5, p.wing);
      s.ellipse(34, 32, 7, 2.5, p.shade);
    }
    // beak
    if (beakOpen) {
      s.map(['....####', '..######', '########', '..####..'], { '#': p.beak }, 0, 13);
      s.map(['..####..', '########', '..######'], { '#': p.beakDark }, 0, 19);
      s.rect(3, 17, 5, 2, p.mouth);
    } else {
      s.map(['....####', '..######', '########', '########', '..######'], { '#': p.beak }, 0, 14);
      s.map(['..######', '....####'], { '#': p.beakDark }, 0, 19);
    }
    // eye + angry brow
    s.rect(9, 11, 4, 4, PAL.white);
    s.rect(9, 12, 2, 2, p.eye);
    s.map(['##.....', '.###...', '...####'], { '#': PAL.outline }, 7, 8);
    // crown
    s.map(['#..#..#', '##.#.##', '#######', '#######'], { '#': p.crown }, 11, 2);
    s.set(14, 4, p.gem);
    s.set(12, 5, p.gem);
    s.set(16, 5, p.gem);
    s.outline(PAL.outline);
    return s;
  };
  const frames = [frame(0, false), frame(1, false), frame(0, true), frame(1, true)];
  return {
    frames: frames.map((f) => f.toCanvas()),
    hurt: frames.map((f) => f.tint('#ffffff').toCanvas()),
  };
}

export function makeFeather(p) {
  const s = new Pix(11, 5);
  s.map(['..######.', '#########', '..######.'], { '#': p.feather }, 1, 1);
  s.hline(3, 2, 7, p.featherDark);
  s.outline(PAL.outline);
  return s.toCanvas();
}

// Collectible orbs: gold for King Crow, frost blue for Phoenix Lord.
export const GOLD_ORB = { base: '#f8b800', light: '#fde680' };
export const FROST_ORB = { base: '#3a9cff', light: '#c8f4ff' };

export function makeOrb(c = GOLD_ORB) {
  const frames = [];
  for (let i = 0; i < 4; i++) {
    const s = new Pix(11, 11);
    s.ellipse(5.5, 5.5, 4.5, 4.5, c.base);
    s.ellipse(5, 5, 3, 3, c.light);
    const hx = [3, 4, 4, 3][i];
    s.set(hx, 3, PAL.white);
    s.set(hx + 1, 3, PAL.white);
    s.set(hx, 4, PAL.white);
    s.outline(PAL.outline);
    frames.push(s.toCanvas());
  }
  return frames;
}

// Hp bar frame, 60x6 native.
export function makeHpFrame() {
  const s = new Pix(62, 6).rect(0, 0, 62, 6, PAL.outline);
  s.rect(1, 1, 60, 4, '#3a2530');
  return s.toCanvas();
}

// Phoenix Lord: 56x44 native (112x88 in game), faces left. Swept-back flame
// crest, big flame-feathered wings, long tail plumes. Same frame layout as
// King Crow (two wing frames x beak closed / open).
const PHOENIX_WING = [
  '..+....+....+...',
  '..#+...#+...#+..',
  '..##+..##+..##+.',
  '.###+.###+.###+.',
  '.####.####.####.',
  '################',
  '################',
  '.###############',
  '.##oooooooooo###',
  '..##oooooooooo##',
  '...###########..',
  '....#########...',
  '......#####.....',
  '........##......',
];
const PHOENIX_CREST = [
  '......+...+',
  '.....+#..+#',
  '..+..##.+#.',
  '.+#.###.##.',
  '.##.##.##..',
  '.########..',
  '#########..',
];

export function makePhoenixLord(p) {
  const wing = (s, rows, x, y, base, inner) => s.map(rows, { '#': base, '+': p.wingTip, o: inner }, x, y);
  const frame = (up, beakOpen) => {
    const s = new Pix(56, 44);
    // tail plumes streaming right
    s.ellipse(45, 28, 9, 3, p.tail);
    s.ellipse(47, 22, 8, 2, p.tail);
    s.ellipse(47, 34, 8, 2, p.tail);
    s.ellipse(52, 22, 3, 1.5, p.tailTip);
    s.ellipse(54, 28, 2.5, 1.5, p.tailTip);
    s.ellipse(52, 34, 3, 1.5, p.tailTip);
    // back wing (raised frame only)
    if (up) wing(s, PHOENIX_WING, 31, 1, p.shade, p.shade);
    // body + belly
    s.ellipse(28, 27, 13, 9, p.body);
    s.ellipse(23, 30, 8, 6, p.belly);
    // head + swept-back flame crest
    s.ellipse(14, 20, 8.5, 8, p.body);
    s.map(PHOENIX_CREST, { '#': p.crest, '+': p.crestTip }, 6, 6);
    // talons
    s.rect(23, 35, 2, 3, p.beakDark);
    s.rect(30, 35, 2, 3, p.beakDark);
    s.hline(21, 38, 5, p.beakDark);
    s.hline(28, 38, 5, p.beakDark);
    // front wing
    if (up) wing(s, PHOENIX_WING, 24, 5, p.wing, p.wingTip);
    else wing(s, [...PHOENIX_WING].reverse(), 24, 26, p.wing, p.wingTip);
    // hooked beak
    if (beakOpen) {
      s.map(['....####', '..######', '########', '..####..'], { '#': p.beak }, 0, 15);
      s.map(['..####..', '########', '..######'], { '#': p.beakDark }, 0, 21);
      s.rect(3, 19, 5, 2, p.mouth);
    } else {
      s.map(['....####', '..######', '########', '########', '..######'], { '#': p.beak }, 0, 16);
      s.map(['..######', '....####'], { '#': p.beakDark }, 0, 21);
    }
    // eye + fierce brow
    s.rect(9, 15, 4, 4, p.eyeWhite);
    s.rect(9, 16, 2, 2, p.eye);
    s.map(['##.....', '.###...', '...####'], { '#': p.outline }, 7, 12);
    s.outline(p.outline);
    return s;
  };
  const frames = [frame(true, false), frame(false, false), frame(true, true), frame(false, true)];
  return {
    frames: frames.map((f) => f.toCanvas()),
    hurt: frames.map((f) => f.tint('#ffffff').toCanvas()),
    ash: frames.map((f) => f.tint('#5a4e52').toCanvas()), // burnt out (rebirth)
  };
}

// Small ember (two flicker frames).
export function makeEmber() {
  return [0, 1].map((i) => {
    const s = new Pix(7, 7);
    s.map(['..o..', '.oyo.', 'oywyo', '.oyo.', '..o..'], { o: '#ff6a1a', y: '#ffd23a', w: i ? '#ffd23a' : '#fff6c0' }, 1, 1);
    if (i) s.map(['.y.', 'ywy', '.y.'], { y: '#ffd23a', w: '#ffffff' }, 2, 2);
    return s.outline('#8a1a08').toCanvas();
  });
}

// Fireball pointing left with a flame tail (rotated to its heading).
export function makeFireball() {
  return [0, 1].map((i) => {
    const s = new Pix(16, 11);
    s.ellipse(12, 5.5, 4, 2.5 + i, '#e8401a');
    s.ellipse(9, 5.5, 3.5, 3 - i * 0.5, '#ff6a1a');
    s.ellipse(5.5, 5.5, 4.5, 4.5, '#ff6a1a');
    s.ellipse(5.5, 5.5, 3.2, 3.2, '#ffb030');
    s.ellipse(5, 5, 1.8, 1.8, '#fff6c0');
    return s.outline('#8a1a08').toCanvas();
  });
}

// Homing wisp: a pink spirit flame (two flicker frames).
export function makeWisp() {
  return [0, 1].map((i) => {
    const s = new Pix(11, 11);
    s.ellipse(5.5, 6, 4.5, 4, '#e83ab8');
    s.ellipse(5.5, 6, 3, 2.8, '#ff9ae8');
    s.ellipse(5.5, 6, 1.5, 1.5, '#ffffff');
    s.map(i ? ['..#.#..'] : ['.#..#..'], { '#': '#e83ab8' }, 2, 1);
    return s.outline('#5a0a48').toCanvas();
  });
}
