// Bird sprites: 17x12 native pixels (34x24 in game), three wing frames.
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
const WINGS = [
  [['.kk....', 'kwwk...', 'kwwwk..', 'kwwwwk.', 'kYwwwYk', '.kkkkk.'], 1],
  [['.kkkk..', 'kwwwwk.', 'kwwwwwk', 'kYwwwYk', '.kYYYk.', '..kkk..'], 4],
  [['.kkkkk.', 'kYwwwwk', '.kwwwwk', '..kwwk.', '...kk..'], 6],
];

export function birdPix(p, frame) {
  const pal = { k: p.outline, Y: p.highlight, y: p.body, o: p.belly, w: p.white, r: p.lipTop, R: p.lipBottom };
  const pix = new Pix(17, 12).map(BODY, pal);
  const [rows, oy] = WINGS[frame];
  pix.map(rows, { ...pal, w: p.wing ?? p.white, Y: p.wingShade ?? p.highlight }, 0, oy);
  return pix;
}

export function makeBirdFrames(palette) {
  return [0, 1, 2].map((f) => birdPix(palette, f).toCanvas());
}
