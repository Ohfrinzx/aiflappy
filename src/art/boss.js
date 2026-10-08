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

export function makeOrb() {
  const frames = [];
  for (let i = 0; i < 4; i++) {
    const s = new Pix(11, 11);
    s.ellipse(5.5, 5.5, 4.5, 4.5, '#f8b800');
    s.ellipse(5, 5, 3, 3, '#fde680');
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
