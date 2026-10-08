// HUD / menu sprites: digits, titles, scoreboard, medals, buttons, tutorial.
import { Pix } from './pixel.js';
import { PAL } from './palette.js';
import { renderText, textPix } from './font.js';
import { birdPix } from './birds.js';

const TITLE = { cell: 1, spacing: 1, bold: 1, inner: PAL.white, outer: PAL.outline, scale: 3 };

export function makeTitleTexts() {
  return {
    'text-getready': renderText('Get Ready!', { ...TITLE, fill: '#58d858', fillBottom: '#00a848' }),
    gameover: renderText('Game Over', { ...TITLE, fill: '#fca048', fillBottom: '#e46018' }),
    'text-victory': renderText('Victory!', { ...TITLE, fill: '#ffe066', fillBottom: '#f2a91e' }),
    'text-warning': renderText('WARNING', { ...TITLE, fill: '#ff5a4a', fillBottom: '#c8241e' }),
    'text-paused': renderText('Paused', { ...TITLE, fill: '#ffffff', fillBottom: '#d8d8d8', inner: PAL.outline, outer: null }),
    logo: renderText('FlappyBird', { ...TITLE, fill: '#fde680', fillBottom: '#f6b52c' }),
  };
}

export function makeDigits() {
  const out = {};
  for (let d = 0; d <= 9; d++) {
    out[String(d)] = renderText(String(d), { cell: 2, bold: 1, boldY: 1, fill: PAL.white, outer: PAL.digitOutline });
    out[`small-${d}`] = renderText(String(d), { cell: 1, bold: 1, fill: PAL.white, outer: PAL.outline });
  }
  return out;
}

function roundedBox(w, h, outline, fill) {
  const p = new Pix(w, h).rect(0, 0, w, h, outline);
  p.rect(1, 1, w - 2, h - 2, fill);
  // knock out corners
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) p.set(x, y, null);
  return p;
}

// 113x57 native scoreboard panel.
export function makePanel() {
  const W = 113;
  const H = 57;
  const p = roundedBox(W, H, PAL.outline, PAL.panelLight);
  p.rect(3, 3, W - 6, H - 6, PAL.panelShade);
  p.rect(3, 3, W - 6, H - 7, PAL.panel);
  for (const [x, y] of [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]]) p.set(x, y, PAL.outline);
  const label = { font: 'small', fill: PAL.panelLabel };
  p.blit(textPix('MEDAL', label), 13, 8);
  const score = textPix('SCORE', label);
  p.blit(score, W - 12 - score.w, 8);
  const best = textPix('BEST', label);
  p.blit(best, W - 12 - best.w, 31);
  // Empty medal slot.
  p.ellipse(24, 32, 11, 11, PAL.panelShade);
  p.ellipse(24, 32.5, 10, 10, '#d4c77e');
  return p.toCanvas();
}

const CROWN = ['#.#.#', '#####', '#####'];
const STAR = ['..#..', '.###.', '#####', '.###.', '.#.#.'];

// 22x22 native medal.
export function makeMedal(m) {
  const c = m.colors;
  const p = new Pix(22, 22);
  p.ellipse(11, 11, 11, 11, c.rim);
  p.ellipse(11, 11, 9.5, 9.5, c.base);
  p.ellipse(9, 9, 6, 6, c.light);
  p.ellipse(11, 11, 6.5, 6.5, c.base);
  const em = new Pix(7, 7).map(m.emblem === 'crown' ? CROWN : STAR, { '#': c.emblem }, 1, 1);
  if (m.emblem === 'crown') em.map(['..#..'], { '#': c.light }, 1, 2);
  p.blit(em.outline(c.rim), 8, 8);
  p.set(6, 5, PAL.white);
  p.set(5, 6, PAL.white);
  return p.toCanvas();
}

const TRIANGLE = ['#....', '##...', '###..', '####.', '#####', '####.', '###..', '##...', '#....'];

function button(w, h, iconFn) {
  const p = roundedBox(w, h, PAL.outline, PAL.white);
  p.rect(2, 2, w - 4, h - 4, '#f4f4f4');
  p.hline(2, h - 3, w - 4, '#d8d8d8');
  iconFn(p);
  return p.toCanvas();
}

export function makeButtons() {
  const play = button(52, 29, (p) => {
    const tri = new Pix(7, 11).map(TRIANGLE, { '#': PAL.green }, 1, 1);
    tri.outline(PAL.outline);
    p.blit(tri, 23, 9);
  });
  const pause = button(13, 14, (p) => {
    p.rect(4, 3, 2, 7, PAL.orangeDark);
    p.rect(7, 3, 2, 7, PAL.orangeDark);
  });
  const resume = button(13, 14, (p) => {
    p.map(['#...', '##..', '###.', '####', '###.', '##..', '#...'], { '#': PAL.green }, 5, 3);
  });
  return { 'button-play': play, 'button-pause': pause, 'button-resume': resume };
}

export function makeBadgeNew() {
  const p = roundedBox(18, 7, '#e02020', '#f83800');
  p.blit(textPix('NEW', { font: 'small', fill: PAL.white }), 2, 1);
  return p.toCanvas();
}

export function makeSparkles() {
  const w = PAL.white;
  const frames = [
    ['.....', '.....', '..#..', '.....', '.....'],
    ['.....', '..#..', '.###.', '..#..', '.....'],
    ['..#..', '..#..', '#####', '..#..', '..#..'],
  ];
  return frames.map((f) => new Pix(5, 5).map(f, { '#': w }).toCanvas());
}

const HAND = [
  '....kk......',
  '...kwwk.....',
  '...kwwk.....',
  '...kwwk.....',
  '...kwwkkkk..',
  '...kwwkwwkkk',
  '.kkkwwkwwkwk',
  'kwwkwwwwwwwk',
  'kwwwwwwwwwwk',
  'kwwwwwwwwwwk',
  '.kwwwwwwwwwk',
  '.kwwwwwwwwk.',
  '..kwwwwwwwk.',
  '..kwwwwwwk..',
  '..kkkkkkkk..',
];
const ARROW = ['..#..', '.###.', '#####', '.###.', '.###.'];

// 57x49 native "tap" tutorial.
export function makeTutorial() {
  const p = new Pix(57, 49);
  const ghost = {
    outline: '#9aa9ac', highlight: '#ffffff', body: '#f2f2f2', belly: '#dddddd',
    white: '#ffffff', wingShade: '#e8e8e8', lipTop: '#d0d0d0', lipBottom: '#bcbcbc',
  };
  p.blit(birdPix(ghost, 1), 20, 0);
  const arrow = new Pix(7, 7).map(ARROW, { '#': '#ffffff' }, 1, 1).outline('#9aa9ac');
  p.blit(arrow, 25, 14);
  p.blit(new Pix(12, 15).map(HAND, { k: PAL.outline, w: PAL.white }), 23, 26);
  const tap = textPix('TAP', { font: 'small', fill: '#ff290d', inner: PAL.white });
  p.blit(tap, 4, 30);
  p.blit(tap, 39, 30);
  return p.toCanvas();
}
