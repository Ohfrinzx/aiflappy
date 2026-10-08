// Start screen: logo, hovering bird, Play button.
import { CONFIG } from '../config.js';
import { THEMES } from '../content/themes.js';
import { BIRDS } from '../content/birds.js';
import { Bird } from '../entities/bird.js';
import { Ground } from '../entities/ground.js';
import { Button } from '../ui/button.js';

export class TitleScene {
  constructor(game) {
    this.game = game;
    const sp = game.sprites;
    this.theme = THEMES[0];
    const birdImg = sp.get(`${BIRDS[0].file}-midflap`);
    this.bird = new Bird(sp, BIRDS[0], Math.round((CONFIG.width - birdImg.width) / 2), CONFIG.layout.titleBirdY);
    this.ground = new Ground(sp);
    const btn = sp.get('button-play');
    this.play = new Button(sp, 'button-play', Math.round((CONFIG.width - btn.width) / 2), CONFIG.layout.titleButtonY, () => {
      game.audio.play('swoosh');
      game.newRun();
    });
  }

  onInput(evt) {
    if (evt.type === 'mute') return this.game.toggleMute();
    if (this.play.handle(evt)) return;
    if (evt.type === 'press' && evt.source === 'key') this.play.onClick();
  }

  update(dt) {
    this.bird.update(dt);
    this.ground.update(dt);
  }

  render(r, alpha) {
    const sp = this.game.sprites;
    r.draw(sp.get(this.theme.file), 0, 0);
    this.ground.render(r, alpha);
    r.drawCentered(sp.get('logo'), CONFIG.width / 2, CONFIG.layout.titleLogoY);
    this.bird.render(r, alpha);
    this.play.render(r);
  }
}
