// Builds every procedural sprite. Keys double as drop-in file names
// (assets/sprites/<key>.png) — they follow FlapPyBird's naming where one exists.
import { makeBackground, makeGround, makePipe, VOLCANO_GROUND, LAVA_PILLAR } from './world.js';
import { makeBirdFrames, makeBirdShadow, makeHitboxFrames } from './birds.js';
import {
  makeTitleTexts, makeDigits, makePanel, makeMedal, makeButtons, makeBadgeNew, makeSparkles, makeTutorial, makeLifeIcons,
  makePickerSprites, makePracticeSprites,
} from './ui.js';
import {
  makeKingCrow, makeFeather, makeOrb, makeHpFrame, makePhoenixLord, makeEmber, makeFireball, makeWisp, FROST_ORB,
} from './boss.js';
import { THEMES } from '../content/themes.js';
import { BIRDS } from '../content/birds.js';
import { MEDALS } from '../content/medals.js';
import {
  KING_CROW_PALETTE, KING_CROW_RAGE_PALETTE, PHOENIX_PALETTE, PHOENIX_RAGE_PALETTE,
} from '../content/bosses/palettes.js';
import { VERSION } from '../version.js';
import { renderText } from './font.js';

export const FLAP_NAMES = ['upflap', 'midflap', 'downflap'];

export function buildProceduralSprites() {
  const s = {};
  for (const t of THEMES) s[t.file] = makeBackground(t);
  s.base = makeGround();
  s['base-volcano'] = makeGround(VOLCANO_GROUND);
  s['pipe-green'] = makePipe();
  s['pillar-lava'] = makePipe(LAVA_PILLAR);
  for (const b of BIRDS) {
    makeBirdFrames(b.palette, b.style).forEach((c, i) => (s[`${b.file}-${FLAP_NAMES[i]}`] = c));
    s[`${b.file}-shadow`] = makeBirdShadow(b.palette, b.style);
    s[`name-${b.id}`] = renderText(b.name.toUpperCase(), { font: 'small', fill: '#ffffff', outer: '#543847' });
  }
  makeHitboxFrames().forEach((c, i) => (s[`bird-hitbox-${i}`] = c));
  Object.assign(s, makePickerSprites(), makePracticeSprites());
  Object.assign(s, makeTitleTexts(), makeDigits(), makeButtons());
  s.scoreboard = makePanel();
  for (const m of MEDALS) s[`medal-${m.id}`] = makeMedal(m);
  s.new = makeBadgeNew();
  makeSparkles().forEach((c, i) => (s[`sparkle-${i}`] = c));
  s.tutorial = makeTutorial();
  Object.assign(s, makeLifeIcons());

  const crow = makeKingCrow(KING_CROW_PALETTE);
  crow.frames.forEach((c, i) => (s[`kingcrow-${i}`] = c));
  crow.hurt.forEach((c, i) => (s[`kingcrow-hurt-${i}`] = c));
  makeKingCrow(KING_CROW_RAGE_PALETTE).frames.forEach((c, i) => (s[`kingcrow-rage-${i}`] = c));
  s.feather = makeFeather(KING_CROW_PALETTE);
  makeOrb().forEach((c, i) => (s[`orb-${i}`] = c));

  const phoenix = makePhoenixLord(PHOENIX_PALETTE);
  phoenix.frames.forEach((c, i) => (s[`phoenix-${i}`] = c));
  phoenix.hurt.forEach((c, i) => (s[`phoenix-hurt-${i}`] = c));
  phoenix.ash.forEach((c, i) => (s[`phoenix-ash-${i}`] = c));
  makePhoenixLord(PHOENIX_RAGE_PALETTE).frames.forEach((c, i) => (s[`phoenix-rage-${i}`] = c));
  makeEmber().forEach((c, i) => (s[`ember-${i}`] = c));
  makeFireball().forEach((c, i) => (s[`fireball-${i}`] = c));
  makeWisp().forEach((c, i) => (s[`wisp-${i}`] = c));
  makeOrb(FROST_ORB).forEach((c, i) => (s[`frost-${i}`] = c));
  s.hpbar = makeHpFrame();
  s['text-version'] = renderText(`V${VERSION}`, { font: 'small', fill: '#ffffff', outer: '#a89a5e' });
  return s;
}
