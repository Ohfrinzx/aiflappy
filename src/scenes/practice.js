// Practice menu (practice.html, or PRACTICE on the title screen): pick a boss
// and fight it straight away. Dying there offers a retry instead of a game
// over, and nothing counts toward best score or unlocks.
import { CONFIG } from '../config.js';
import { THEMES } from '../content/themes.js';
import { BOSSES } from '../content/bosses/index.js';
import { Ground } from '../entities/ground.js';
import { Button } from '../ui/button.js';

const ENCOUNTERS = CONFIG.bosses.encounters.filter((e) => BOSSES[e.id]);
const CARD_Y = 140;

export class PracticeScene {
  constructor(game) {
    this.game = game;
    const sp = game.sprites;
    const W = CONFIG.width;
    this.theme = THEMES.find((t) => t.id === 'dusk') ?? THEMES[0];
    this.ground = new Ground(sp);
    this.t = 0;
    this.sel = 0; // keyboard selection
    const card = sp.get('practice-card');
    const x = Math.round((W - card.width) / 2);
    this.cards = ENCOUNTERS.map((e, i) => new Button(sp, 'practice-card', x, CARD_Y + i * (card.height + 14), () => this.start(e.id)));
    const back = sp.get('button-back');
    this.back = new Button(sp, 'button-back', Math.round((W - back.width) / 2), CONFIG.groundY + 14, () => this.leave());
  }

  start(id) {
    if (this.leaving) return;
    this.leaving = true;
    this.game.audio.play('swoosh');
    this.game.practiceRun(id, 1);
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.game.audio.play('swoosh');
    this.game.toTitle();
  }

  onInput(evt) {
    if (evt.type === 'mute') return this.game.toggleMute();
    if (evt.type === 'pause') return this.leave();
    if (evt.type === 'nav') {
      this.sel = (this.sel + evt.dir + this.cards.length) % this.cards.length;
      this.game.audio.play('swoosh');
      return;
    }
    if (this.back.handle(evt)) return;
    if (this.cards.some((c) => c.handle(evt))) return;
    if (evt.type === 'press' && evt.source === 'key') this.start(ENCOUNTERS[this.sel].id);
  }

  update(dt) {
    this.t += dt;
    this.ground.update(dt);
  }

  render(r, alpha) {
    const sp = this.game.sprites;
    const W = CONFIG.width;
    r.draw(sp.get(this.theme.file), 0, 0);
    r.fillTop(sp.edgeColor(this.theme.file, 'top'));
    this.ground.render(r, alpha, this.theme.ground);
    r.drawCentered(sp.get('text-practice'), W / 2, 62);
    r.drawCentered(sp.text('PICK A BOSS TO FIGHT'), W / 2, 112);

    this.cards.forEach((c, i) => {
      const e = ENCOUNTERS[i];
      const info = BOSSES[e.id];
      const y = c.y + (c.pressed ? 2 : 0);
      c.render(r);
      if (i === this.sel) {
        // Keyboard focus: a white frame around the card.
        const w = c.img.width;
        const h = c.img.height;
        for (const [rx, ry, rw, rh] of [[c.x - 3, y - 3, w + 6, 2], [c.x - 3, y + h + 1, w + 6, 2], [c.x - 3, y - 3, 2, h + 6], [c.x + w + 1, y - 3, 2, h + 6]]) {
          r.rect(rx, ry, rw, rh, '#ffffff', 0.9);
        }
      }
      const img = sp.get(info.preview);
      const s = 0.8; // preview drawn a bit smaller than in the fight
      const bob = Math.sin(this.t * 3 + i) * 2;
      r.ctx.save();
      r.ctx.translate(c.x + 8 + (img.width * s) / 2, y + c.img.height / 2 + bob);
      r.ctx.scale(s, s);
      r.drawRotated(img, 0, 0, 0);
      r.ctx.restore();
      const tx = c.x + 8 + img.width * s + 10;
      r.draw(sp.text(info.name.toUpperCase()), tx, y + 30);
      r.draw(sp.text(`PIPE ${e.at}`), tx, y + 50);
    });
    this.back.render(r);
  }
}
