// Practice mode's end screen: Game Over / Victory, the attempt number, how many
// boss health bars were left, then tap anywhere to fight the boss again.
import { CONFIG } from '../config.js';
import { clamp, easeOutCubic } from '../core/math.js';
import { BOSSES } from '../content/bosses/index.js';

const READY = 0.6; // seconds before a tap retries (so a panicked tap doesn't)

export class PracticePanel {
  constructor(game, { bossId, attempt, victory, bossLives, bossMaxLives, onRetry }) {
    this.game = game;
    this.sp = game.sprites;
    this.name = BOSSES[bossId].name.toUpperCase();
    this.attempt = attempt;
    this.victory = victory;
    this.bossLives = bossLives;
    this.bossMaxLives = bossMaxLives;
    this.onRetry = onRetry;
    this.t = 0;
    this.done = false;
  }

  get ready() {
    return this.t >= READY;
  }

  update(dt) {
    if (this.t === 0) this.game.audio.play('swoosh');
    this.t += dt;
  }

  onInput(evt) {
    if (!this.ready || this.done || evt.type !== 'press') return;
    this.done = true;
    this.game.audio.play('swoosh');
    this.onRetry();
  }

  render(r) {
    const sp = this.sp;
    const W = CONFIG.width;
    const L = CONFIG.layout;
    const tt = clamp(this.t / 0.3, 0, 1);
    const title = sp.get(this.victory ? 'text-victory' : 'gameover');
    r.drawCentered(title, W / 2, L.gameOverY + Math.round(tt < 1 ? -10 * Math.sin(tt * Math.PI) : 0), tt);

    // Info card slides up.
    const card = sp.get('practice-card');
    const pt = easeOutCubic(clamp((this.t - 0.15) / 0.35, 0, 1));
    const from = this.game.renderer.viewBottom;
    const y = Math.round(from + (L.panelY - from) * pt);
    const x = Math.round((W - card.width) / 2);
    r.draw(card, x, y);
    r.drawCentered(sp.text(this.name), W / 2, y + 12);
    r.drawCentered(sp.text(`PRACTICE TRY ${this.attempt}`), W / 2, y + 30);
    if (this.victory) {
      r.drawCentered(sp.text('BEATEN!'), W / 2, y + 56);
    } else if (this.bossMaxLives) {
      // Boss health bars left, as crowns (like the fight HUD).
      const pip = sp.get('lifepip');
      const label = sp.text('BOSS BARS LEFT');
      const total = label.width + 8 + this.bossMaxLives * (pip.width + 4) - 4;
      let px = Math.round((W - total) / 2);
      r.draw(label, px, y + 56);
      px += label.width + 8;
      for (let i = 0; i < this.bossMaxLives; i++) {
        r.draw(i < this.bossLives ? pip : sp.get('lifepip-empty'), px, y + 56);
        px += pip.width + 4;
      }
    } else {
      r.drawCentered(sp.text('BOSS NOT REACHED'), W / 2, y + 56);
    }

    if (this.ready && Math.floor((this.t - READY) * 2.5) % 2 === 0) {
      r.drawCentered(sp.get('text-retry'), W / 2, L.playButtonY + 6);
    }
  }
}
