// The end-of-run sequence: title drops in, scoreboard slides up, score counts,
// medal + NEW badge appear, then the Play button.
import { CONFIG } from '../config.js';
import { clamp, easeOutCubic, rand } from '../core/math.js';
import { Button } from './button.js';
import { drawNumber, numberWidth } from './numbers.js';

const T_TITLE = 0;
const T_PANEL = 0.55;
const T_COUNT = 1.05;

export class GameOverPanel {
  constructor(game, { score, best, isNew, medal, victory, onPlay }) {
    this.game = game;
    this.sp = game.sprites;
    this.score = score;
    this.best = best;
    this.isNew = isNew;
    this.medal = medal;
    this.victory = victory;
    this.t = 0;
    this.countDur = clamp(score * 0.03, 0.2, 1.0);
    this.tDone = T_COUNT + this.countDur;
    this.tButtons = this.tDone + 0.25;
    this.fired = new Set();
    this.sparkle = { x: 0, y: 0, t: 0 };
    const btn = this.sp.get('button-play');
    this.play = new Button(this.sp, 'button-play', Math.round((CONFIG.width - btn.width) / 2), CONFIG.layout.playButtonY, onPlay);
  }

  get ready() {
    return this.t >= this.tButtons;
  }

  once(key, t, fn) {
    if (this.t >= t && !this.fired.has(key)) {
      this.fired.add(key);
      fn();
    }
  }

  update(dt) {
    this.t += dt;
    const a = this.game.audio;
    this.once('title', T_TITLE, () => a.play('swoosh'));
    this.once('panel', T_PANEL, () => a.play('swoosh'));
    if (this.medal && this.t > this.tDone) {
      const s = this.sparkle;
      s.t += dt;
      if (s.t > 0.5) {
        s.t = 0;
        const ang = rand(0, Math.PI * 2);
        const rad = rand(0, 9);
        s.x = Math.cos(ang) * rad * 2;
        s.y = Math.sin(ang) * rad * 2;
      }
    }
  }

  onInput(evt) {
    if (!this.ready) return;
    if (this.play.handle(evt)) return;
    if (evt.type === 'press' && evt.source === 'key') this.play.onClick();
  }

  render(r) {
    const sp = this.sp;
    const L = CONFIG.layout;
    const W = CONFIG.width;

    // Title: fades in while bouncing down slightly.
    const tt = clamp((this.t - T_TITLE) / 0.3, 0, 1);
    const title = sp.get(this.victory ? 'text-victory' : 'gameover');
    const bounce = tt < 1 ? -10 * Math.sin(tt * Math.PI) : 0;
    r.drawCentered(title, W / 2, L.gameOverY + Math.round(bounce), tt);

    // Panel slides up from below the screen.
    if (this.t < T_PANEL) return;
    const pt = easeOutCubic(clamp((this.t - T_PANEL) / 0.4, 0, 1));
    const panel = sp.get('scoreboard');
    const px = Math.round((W - panel.width) / 2);
    const from = this.game.renderer.viewBottom;
    const py = Math.round(from + (L.panelY - from) * pt);
    r.draw(panel, px, py);

    const ct = clamp((this.t - T_COUNT) / this.countDur, 0, 1);
    const shown = Math.round(this.score * ct);
    const right = px + panel.width - 22;
    drawNumber(r, sp, shown, right, py + 34, { small: true, align: 'right' });
    const bestShown = this.isNew && ct < 1 ? Math.max(this.best - this.score, 0) : this.best;
    drawNumber(r, sp, this.t >= this.tDone ? this.best : bestShown, right, py + 80, { small: true, align: 'right' });

    if (this.t >= this.tDone) {
      if (this.isNew) {
        const nb = sp.get('new');
        const bw = numberWidth(sp, this.best, true);
        r.draw(nb, right - bw - nb.width - 6, py + 82);
      }
      if (this.medal) {
        const m = sp.get(`medal-${this.medal.id}`);
        const mx = px + 48 - m.width / 2;
        const my = py + 65 - m.height / 2;
        r.draw(m, Math.round(mx), Math.round(my));
        const fi = [0, 1, 2, 1, 0][Math.min(4, Math.floor(this.sparkle.t / 0.08))];
        const sk = sp.get(`sparkle-${fi}`);
        r.draw(sk, Math.round(mx + m.width / 2 + this.sparkle.x - sk.width / 2), Math.round(my + m.height / 2 + this.sparkle.y - sk.height / 2));
      }
    }

    if (this.ready) this.play.render(r);
  }
}
