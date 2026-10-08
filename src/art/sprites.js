// Builds every procedural sprite. Keys double as drop-in file names
// (assets/sprites/<key>.png) — they follow FlapPyBird's naming where one exists.
import { makeBackground, makeGround, makePipe } from './world.js';
import { makeBirdFrames } from './birds.js';
import {
  makeTitleTexts, makeDigits, makePanel, makeMedal, makeButtons, makeBadgeNew, makeSparkles, makeTutorial,
} from './ui.js';
import { makeKingCrow, makeFeather, makeOrb, makeHpFrame } from './boss.js';
import { THEMES } from '../content/themes.js';
import { BIRDS } from '../content/birds.js';
import { MEDALS } from '../content/medals.js';
import { KING_CROW_PALETTE } from '../content/bosses/palettes.js';
import { VERSION } from '../version.js';
import { renderText } from './font.js';

export const FLAP_NAMES = ['upflap', 'midflap', 'downflap'];

export function buildProceduralSprites() {
  const s = {};
  for (const t of THEMES) s[t.file] = makeBackground(t);
  s.base = makeGround();
  s['pipe-green'] = makePipe();
  for (const b of BIRDS) {
    makeBirdFrames(b.palette).forEach((c, i) => (s[`${b.file}-${FLAP_NAMES[i]}`] = c));
  }
  Object.assign(s, makeTitleTexts(), makeDigits(), makeButtons());
  s.scoreboard = makePanel();
  for (const m of MEDALS) s[`medal-${m.id}`] = makeMedal(m);
  s.new = makeBadgeNew();
  makeSparkles().forEach((c, i) => (s[`sparkle-${i}`] = c));
  s.tutorial = makeTutorial();

  const crow = makeKingCrow(KING_CROW_PALETTE);
  crow.frames.forEach((c, i) => (s[`kingcrow-${i}`] = c));
  crow.hurt.forEach((c, i) => (s[`kingcrow-hurt-${i}`] = c));
  s.feather = makeFeather(KING_CROW_PALETTE);
  makeOrb().forEach((c, i) => (s[`orb-${i}`] = c));
  s.hpbar = makeHpFrame();
  s['text-version'] = renderText(`V${VERSION}`, { font: 'small', fill: '#ffffff', outer: '#a89a5e' });
  return s;
}
