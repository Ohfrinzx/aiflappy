// Start screen: logo, character picker (arrows around the hovering bird),
// Play button, Practice button. Locked birds show as silhouettes with their
// unlock goal.
import { CONFIG } from '../config.js';
import { THEMES } from '../content/themes.js';
import { BIRDS } from '../content/birds.js';
import { Bird } from '../entities/bird.js';
import { Ground } from '../entities/ground.js';
import { Button } from '../ui/button.js';

const OPTIONS = ['random', ...BIRDS.map((b) => b.id)];
const RANDOM_CYCLE = 0.45; // seconds per bird while "Random" is shown

export class TitleScene {
  constructor(game) {
    this.game = game;
    this.progress = game.progress;
    const sp = game.sprites;
    this.theme = THEMES[0];
    const W = CONFIG.width;
    const L = CONFIG.layout;
    const birdImg = sp.get(`${BIRDS[0].file}-midflap`);
    this.bird = new Bird(sp, BIRDS[0], Math.round((W - birdImg.width) / 2), L.titleBirdY);
    this.ground = new Ground(sp);
    this.index = Math.max(0, OPTIONS.indexOf(this.progress.selected));
    this.randomT = 0;
    this.randomIdx = 0;

    const btn = sp.get('button-play');
    this.play = new Button(sp, 'button-play', Math.round((W - btn.width) / 2), L.titleButtonY, () => {
      if (!this.playable) return;
      game.audio.play('swoosh');
      game.newRun();
    });
    const arrow = sp.get('button-left');
    const ay = L.titleBirdY + 12 - arrow.height / 2;
    this.left = new Button(sp, 'button-left', Math.round(W / 2 - 64 - arrow.width / 2), ay, () => this.step(-1));
    this.right = new Button(sp, 'button-right', Math.round(W / 2 + 64 - arrow.width / 2), ay, () => this.step(1));
    const prac = sp.get('button-practice');
    this.practice = new Button(sp, 'button-practice', Math.round((W - prac.width) / 2), CONFIG.groundY + 14, () => {
      if (!this.playable) return;
      game.audio.play('swoosh');
      game.toPractice();
    });
    this.applySelection();
  }

  get option() {
    return OPTIONS[this.index];
  }

  get skin() {
    return BIRDS.find((b) => b.id === this.option) ?? null;
  }

  get playable() {
    return !this.skin || this.progress.isUnlocked(this.skin);
  }

  step(dir) {
    this.index = (this.index + dir + OPTIONS.length) % OPTIONS.length;
    this.game.audio.play('swoosh');
    this.applySelection();
  }

  // Shows the chosen bird and remembers the choice (locked birds aren't saved).
  applySelection() {
    if (this.skin) this.bird.setSkin(this.skin);
    if (this.playable) this.progress.selected = this.option;
  }

  onInput(evt) {
    if (evt.type === 'mute') return this.game.toggleMute();
    if (evt.type === 'nav') return this.step(evt.dir);
    if (this.left.handle(evt) || this.right.handle(evt)) return;
    if (this.play.handle(evt) || this.practice.handle(evt)) return;
    if (evt.type === 'press' && evt.source === 'key') this.play.onClick();
  }

  update(dt) {
    this.bird.update(dt);
    this.ground.update(dt);
    if (this.option === 'random') {
      // Cycle through the unlocked birds.
      this.randomT += dt;
      if (this.randomT >= RANDOM_CYCLE) {
        this.randomT = 0;
        const pool = this.progress.unlockedBirds();
        this.randomIdx = (this.randomIdx + 1) % pool.length;
        this.bird.setSkin(pool[this.randomIdx]);
      }
    }
  }

  render(r, alpha) {
    const sp = this.game.sprites;
    const W = CONFIG.width;
    const L = CONFIG.layout;
    r.draw(sp.get(this.theme.file), 0, 0);
    r.fillTop(sp.edgeColor(this.theme.file, 'top'));
    this.ground.render(r, alpha);
    r.drawCentered(sp.get('logo'), W / 2, L.titleLogoY);

    const skin = this.skin;
    const locked = skin && !this.progress.isUnlocked(skin);
    if (locked) {
      const shadow = sp.get(`${skin.file}-shadow`);
      const y = this.bird.y + this.bird.h / 2;
      r.drawRotated(shadow, W / 2, y, 0);
      r.drawCentered(sp.get('lock'), W / 2, Math.round(y - 9));
    } else {
      this.bird.render(r, alpha);
      if (!skin) r.drawCentered(sp.get('random-mark'), W / 2 + 26, L.titleBirdY - 14);
    }
    this.left.render(r);
    this.right.render(r);

    const name = sp.get(skin ? `name-${skin.id}` : 'name-random');
    r.drawCentered(name, W / 2, L.titleBirdY + 34);
    if (locked) r.drawCentered(sp.text(this.progress.goalText(skin)), W / 2, L.titleBirdY + 50);

    this.play.render(r, this.playable ? 1 : 0.35);
    this.practice.render(r, this.playable ? 1 : 0.35);
    // Version, bottom-centre in the dirt (clear of the iPhone home indicator).
    const ver = sp.get('text-version');
    r.drawCentered(ver, W / 2, Math.round(Math.max(CONFIG.groundY + 56, r.viewBottom - 34)));
  }
}
